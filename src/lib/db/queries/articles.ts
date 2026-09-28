import { and, desc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  ARTICLE_BLOCK_TYPES,
  articleBlocks,
  articles,
  journalCategories,
} from "@/lib/db/schema";
import { publishDueScheduledContent } from "./scheduling";

/**
 * Public journal queries (SQLite via Drizzle).
 * The public API and pages read only published + public articles
 * (PRD §13: draft content never appears on the public website).
 */

export interface PublicArticleListItem {
  id: number;
  title: string;
  slug: string;
  category: { name: string; slug: string } | null;
  excerpt: string;
  publishDate: string;
  readingTime: string;
  blockCount: number;
}

export interface PublicArticleBlock {
  id: number;
  type: (typeof ARTICLE_BLOCK_TYPES)[number];
  sortOrder: number;
  text: string | null;
  referenceProjectId: number | null;
}

export interface PublicArticleDetail extends PublicArticleListItem {
  blocks: PublicArticleBlock[];
}

export interface ArticleListParams {
  categorySlug?: string;
  limit: number;
  offset: number;
}

export interface ArticleListResult {
  items: PublicArticleListItem[];
  total: number;
}

const WORDS_PER_MINUTE = 200;

function readingTimeFor(words: number): string {
  return `${Math.max(1, Math.ceil(words / WORDS_PER_MINUTE))} min read`;
}

/**
 * Single enforcement point for public article visibility (PRD §13):
 * only published + public articles ever leave this module. Draft,
 * scheduled, and private rows must be filtered through this predicate.
 */
export function publicArticleConditions() {
  return and(
    eq(articles.status, "published"),
    eq(articles.visibility, "public"),
  );
}

export async function findJournalCategoryBySlug(slug: string) {
  return await db
    .select({ id: journalCategories.id, name: journalCategories.name })
    .from(journalCategories)
    .where(eq(journalCategories.slug, slug))
    .limit(1)
    .get();
}

const LIST_COLUMNS = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  excerpt: articles.excerpt,
  publishDate: articles.publishDate,
  categoryName: journalCategories.name,
  categorySlug: journalCategories.slug,
  blockCount: sql<number>`(
    SELECT COUNT(*) FROM article_blocks WHERE article_blocks.article_id = ${articles.id}
  )`,
};

type ArticleListRow = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  publishDate: string;
  categoryName: string | null;
  categorySlug: string | null;
  blockCount: number;
};

/** Adds computed reading time (from real block text) to list rows. */
async function hydrateListItems(
  rows: ArticleListRow[],
): Promise<PublicArticleListItem[]> {
  const ids = rows.map((row) => row.id);
  const blockTexts = ids.length
    ? await db
        .select({
          articleId: articleBlocks.articleId,
          textContent: articleBlocks.textContent,
        })
        .from(articleBlocks)
        .where(inArray(articleBlocks.articleId, ids))
        .all()
    : [];

  const wordsByArticle = new Map<number, number>();
  for (const block of blockTexts) {
    const words = (block.textContent ?? "").split(/\s+/).filter(Boolean).length;
    wordsByArticle.set(
      block.articleId,
      (wordsByArticle.get(block.articleId) ?? 0) + words,
    );
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    category:
      row.categorySlug && row.categoryName
        ? { name: row.categoryName, slug: row.categorySlug }
        : null,
    excerpt: row.excerpt,
    publishDate: row.publishDate,
    readingTime: readingTimeFor(wordsByArticle.get(row.id) ?? 0),
    blockCount: row.blockCount,
  }));
}

export async function listPublicArticles({
  categorySlug,
  limit,
  offset,
}: ArticleListParams): Promise<ArticleListResult> {
  await publishDueScheduledContent();
  const visibility = publicArticleConditions();
  const where = categorySlug
    ? and(visibility, eq(journalCategories.slug, categorySlug))
    : visibility;

  const rows = await db
    .select(LIST_COLUMNS)
    .from(articles)
    .leftJoin(journalCategories, eq(articles.categoryId, journalCategories.id))
    .where(where)
    .orderBy(desc(articles.publishDate), desc(articles.id))
    .limit(limit)
    .offset(offset)
    .all();

  const totalRow = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(articles)
    .leftJoin(journalCategories, eq(articles.categoryId, journalCategories.id))
    .where(where)
    .get();
  const total = totalRow?.count ?? 0;

  return { items: await hydrateListItems(rows), total };
}

/**
 * Related articles for a published article: same category first (newest),
 * then the latest other articles, never the article itself, never
 * non-public rows. Returns undefined when the source article is not public.
 */
export async function listRelatedArticles(
  slug: string,
  limit: number,
): Promise<PublicArticleListItem[] | undefined> {
  await publishDueScheduledContent();
  const current = await db
    .select({ id: articles.id, categoryId: articles.categoryId })
    .from(articles)
    .where(and(eq(articles.slug, slug), publicArticleConditions()))
    .limit(1)
    .get();

  if (!current) return undefined;

  const sameCategory = current.categoryId
    ? await db
        .select(LIST_COLUMNS)
        .from(articles)
        .leftJoin(
          journalCategories,
          eq(articles.categoryId, journalCategories.id),
        )
        .where(
          and(
            publicArticleConditions(),
            eq(articles.categoryId, current.categoryId),
            ne(articles.id, current.id),
          ),
        )
        .orderBy(desc(articles.publishDate), desc(articles.id))
        .limit(limit)
        .all()
    : [];

  if (sameCategory.length >= limit) {
    return await hydrateListItems(sameCategory);
  }

  const excludeIds = [current.id, ...sameCategory.map((row) => row.id)];
  const fill = await db
    .select(LIST_COLUMNS)
    .from(articles)
    .leftJoin(journalCategories, eq(articles.categoryId, journalCategories.id))
    .where(
      and(
        publicArticleConditions(),
        notInArray(articles.id, excludeIds),
      ),
    )
    .orderBy(desc(articles.publishDate), desc(articles.id))
    .limit(limit - sameCategory.length)
    .all();

  return await hydrateListItems([...sameCategory, ...fill]);
}

/** A single published + public article with its ordered body blocks. */
export async function getPublicArticleBySlug(
  slug: string,
): Promise<PublicArticleDetail | undefined> {
  await publishDueScheduledContent();
  const row = await db
    .select({
      id: articles.id,
      title: articles.title,
      slug: articles.slug,
      excerpt: articles.excerpt,
      publishDate: articles.publishDate,
      categoryName: journalCategories.name,
      categorySlug: journalCategories.slug,
    })
    .from(articles)
    .leftJoin(journalCategories, eq(articles.categoryId, journalCategories.id))
    .where(and(eq(articles.slug, slug), publicArticleConditions()))
    .limit(1)
    .get();

  if (!row) return undefined;

  const blockRows = await db
    .select({
      id: articleBlocks.id,
      type: articleBlocks.blockType,
      sortOrder: articleBlocks.sortOrder,
      text: articleBlocks.textContent,
      referenceProjectId: articleBlocks.referenceProjectId,
    })
    .from(articleBlocks)
    .where(eq(articleBlocks.articleId, row.id))
    .orderBy(articleBlocks.sortOrder, articleBlocks.id)
    .all();

  const words = blockRows
    .map((block) => block.text ?? "")
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category:
      row.categorySlug && row.categoryName
        ? { name: row.categoryName, slug: row.categorySlug }
        : null,
    excerpt: row.excerpt,
    publishDate: row.publishDate,
    readingTime: readingTimeFor(words),
    blockCount: blockRows.length,
    blocks: blockRows,
  };
}
