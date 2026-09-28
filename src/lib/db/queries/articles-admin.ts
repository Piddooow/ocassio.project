import { asc, desc, eq, sql } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  ARTICLE_BLOCK_TYPES,
  PUBLISH_VISIBILITIES,
  articleBlocks,
  articles,
  journalCategories,
} from "@/lib/db/schema";
import {
  statusForAction,
  validatePublishAction,
  type PublishAction,
} from "./publishing";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for Journal articles (§17). Transport-agnostic: routes own
 * authentication and HTTP statuses. Content saves append a version
 * snapshot through the routes (§25), never from inside these helpers.
 */

export type ArticleBlockInput = {
  type: (typeof ARTICLE_BLOCK_TYPES)[number];
  text: string | null;
  mediaId: number | null;
  referenceProjectId: number | null;
};

export interface ArticleInput {
  title: string;
  slug: string;
  categorySlug: string;
  excerpt: string;
  publishDate: string;
  author?: string | null;
  relatedProjectId?: number | null;
  coverMediaId?: number | null;
  seoMetaTitle?: string | null;
  seoMetaDescription?: string | null;
  seoOgMediaId?: number | null;
  visibility?: (typeof PUBLISH_VISIBILITIES)[number];
  blocks?: ArticleBlockInput[];
}

export type ArticleUpdateInput = Partial<ArticleInput>;

export type ArticleValidation =
  | { ok: true; value: ArticleUpdateInput }
  | { ok: false; issues: string[] };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function readNullableText(
  body: Record<string, unknown>,
  key: string,
  max: number,
  issues: string[],
  value: Record<string, unknown>,
) {
  const raw = body[key];
  if (raw === undefined) return;
  if (raw === null || raw === "") {
    value[key] = null;
    return;
  }
  if (typeof raw !== "string" || raw.trim().length === 0) {
    issues.push(`${key} must be a non-empty string or null.`);
    return;
  }
  if (raw.trim().length > max) {
    issues.push(`${key} must be ${max} characters or fewer.`);
    return;
  }
  value[key] = raw.trim();
}

function readNullableId(
  body: Record<string, unknown>,
  key: string,
  issues: string[],
  value: Record<string, unknown>,
) {
  const raw = body[key];
  if (raw === undefined) return;
  if (raw === null) {
    value[key] = null;
    return;
  }
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) {
    issues.push(`${key} must be a positive integer or null.`);
    return;
  }
  value[key] = raw;
}

function validateBlocks(
  raw: unknown,
  issues: string[],
): ArticleBlockInput[] | undefined {
  if (!Array.isArray(raw)) {
    issues.push("blocks must be an array of article blocks.");
    return undefined;
  }
  const blocks: ArticleBlockInput[] = [];
  raw.forEach((block, index) => {
    if (typeof block !== "object" || block === null) {
      issues.push(`blocks[${index}] must be an object.`);
      return;
    }
    const candidate = block as Record<string, unknown>;
    if (
      typeof candidate.type !== "string" ||
      !(ARTICLE_BLOCK_TYPES as readonly string[]).includes(candidate.type)
    ) {
      issues.push(
        `blocks[${index}].type must be one of: ${ARTICLE_BLOCK_TYPES.join(", ")}.`,
      );
      return;
    }
    const type = candidate.type as (typeof ARTICLE_BLOCK_TYPES)[number];
    const text =
      typeof candidate.text === "string" && candidate.text.trim().length > 0
        ? candidate.text.trim()
        : null;
    if (text !== null && text.length > 20000) {
      issues.push(`blocks[${index}].text must be 20000 characters or fewer.`);
      return;
    }
    if ((type === "paragraph" || type === "heading" || type === "quote") && !text) {
      issues.push(`blocks[${index}].text is required for ${type} blocks.`);
      return;
    }
    const mediaId =
      typeof candidate.mediaId === "number" &&
      Number.isInteger(candidate.mediaId) &&
      candidate.mediaId > 0
        ? candidate.mediaId
        : null;
    const referenceProjectId =
      typeof candidate.referenceProjectId === "number" &&
      Number.isInteger(candidate.referenceProjectId) &&
      candidate.referenceProjectId > 0
        ? candidate.referenceProjectId
        : null;
    blocks.push({ type, text, mediaId, referenceProjectId });
  });
  return blocks;
}

export function validateArticleInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ArticleValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, issues: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const issues: string[] = [];
  const value: Record<string, unknown> = {};

  const requireText = (key: string, max: number) => {
    const field = body[key];
    if (field === undefined) {
      if (!partial) issues.push(`${key} is required.`);
      return;
    }
    if (typeof field !== "string" || field.trim().length === 0) {
      issues.push(`${key} must be a non-empty string.`);
      return;
    }
    if (field.trim().length > max) {
      issues.push(`${key} must be ${max} characters or fewer.`);
      return;
    }
    value[key] = field.trim();
  };

  requireText("title", 160);
  requireText("excerpt", 400);
  requireText("categorySlug", 80);

  if (body.slug !== undefined || !partial) {
    const slug = body.slug;
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
      issues.push(
        "slug must be lowercase words separated by dashes (e.g. studio-notes).",
      );
    } else if (slug.length > 120) {
      issues.push("slug must be 120 characters or fewer.");
    } else {
      value.slug = slug;
    }
  }

  if (body.publishDate !== undefined || !partial) {
    const date = body.publishDate;
    if (
      typeof date !== "string" ||
      !DATE_PATTERN.test(date) ||
      Number.isNaN(Date.parse(date))
    ) {
      issues.push("publishDate must be an ISO date like 2026-01-15.");
    } else {
      value.publishDate = date;
    }
  }

  if (body.visibility !== undefined) {
    if (
      !PUBLISH_VISIBILITIES.includes(
        body.visibility as (typeof PUBLISH_VISIBILITIES)[number],
      )
    ) {
      issues.push(`visibility must be one of: ${PUBLISH_VISIBILITIES.join(", ")}.`);
    } else {
      value.visibility = body.visibility;
    }
  }

  readNullableText(body, "author", 120, issues, value);
  readNullableText(body, "seoMetaTitle", 160, issues, value);
  readNullableText(body, "seoMetaDescription", 320, issues, value);
  readNullableId(body, "coverMediaId", issues, value);
  readNullableId(body, "relatedProjectId", issues, value);
  readNullableId(body, "seoOgMediaId", issues, value);

  if (body.blocks !== undefined) {
    const blocks = validateBlocks(body.blocks, issues);
    if (blocks !== undefined) value.blocks = blocks;
  }

  if (issues.length > 0) return { ok: false, issues };
  if (partial && Object.keys(value).length === 0) {
    return { ok: false, issues: ["Provide at least one field to update."] };
  }
  return { ok: true, value: value as ArticleUpdateInput };
}

/* ---------------- Reads ---------------- */

const LIST_COLUMNS = {
  id: articles.id,
  title: articles.title,
  slug: articles.slug,
  excerpt: articles.excerpt,
  author: articles.author,
  publishDate: articles.publishDate,
  status: articles.status,
  visibility: articles.visibility,
  publishAt: articles.publishAt,
  categoryName: journalCategories.name,
  categorySlug: journalCategories.slug,
  updatedAt: articles.updatedAt,
  blockCount: sql<number>`(
    SELECT COUNT(*) FROM article_blocks WHERE article_blocks.article_id = ${articles.id}
  )`,
};

export type AdminArticleListRow = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  author: string | null;
  publishDate: string;
  status: (typeof articles.$inferSelect)["status"];
  visibility: (typeof articles.$inferSelect)["visibility"];
  publishAt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  updatedAt: Date;
  blockCount: number;
};

export async function listAllArticles(
  database: QueryDatabase = defaultDb,
): Promise<AdminArticleListRow[]> {
  return await database
    .select(LIST_COLUMNS)
    .from(articles)
    .leftJoin(journalCategories, eq(articles.categoryId, journalCategories.id))
    .orderBy(desc(articles.updatedAt), desc(articles.id))
    .all();
}

export async function listJournalCategoryOptions(
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select({
      id: journalCategories.id,
      name: journalCategories.name,
      slug: journalCategories.slug,
    })
    .from(journalCategories)
    .orderBy(asc(journalCategories.sortOrder), asc(journalCategories.id))
    .all();
}

export async function getArticleRowById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(articles)
    .where(eq(articles.id, id))
    .limit(1)
    .get();
}

export async function findArticleBySlug(
  slug: string,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1)
    .get();
}

export async function getArticleBlocks(
  articleId: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(articleBlocks)
    .where(eq(articleBlocks.articleId, articleId))
    .orderBy(asc(articleBlocks.sortOrder), asc(articleBlocks.id))
    .all();
}

export interface ArticleDetail {
  article: typeof articles.$inferSelect;
  category: { id: number; name: string; slug: string } | null;
  blocks: (typeof articleBlocks.$inferSelect)[];
}

export async function getArticleDetail(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<ArticleDetail | null> {
  const article = await getArticleRowById(id, database);
  if (!article) return null;
  const category = article.categoryId
    ? await database
        .select({
          id: journalCategories.id,
          name: journalCategories.name,
          slug: journalCategories.slug,
        })
        .from(journalCategories)
        .where(eq(journalCategories.id, article.categoryId))
        .limit(1)
        .get() ?? null
    : null;
  const blocks = await getArticleBlocks(id, database);
  return { article, category, blocks };
}

/* ---------------- Mutations ---------------- */

type ArticleResult =
  | { ok: true; detail: ArticleDetail }
  | { ok: false; status: 409 | 422; issues: string[] };

async function insertBlocks(
  articleId: number,
  blocks: ArticleBlockInput[],
  database: QueryDatabase,
): Promise<void> {
  for (const [index, block] of blocks.entries()) {
    await database
      .insert(articleBlocks)
      .values({
        articleId,
        blockType: block.type,
        sortOrder: index,
        textContent: block.text,
        mediaId: block.mediaId,
        referenceProjectId: block.referenceProjectId,
      })
      .run();
  }
}

export async function createArticle(
  input: ArticleInput,
  database: QueryDatabase = defaultDb,
): Promise<ArticleResult> {
  const category = await database
    .select({ id: journalCategories.id })
    .from(journalCategories)
    .where(eq(journalCategories.slug, input.categorySlug))
    .limit(1)
    .get();
  if (!category) {
    return {
      ok: false,
      status: 422,
      issues: [`Unknown journal category: ${input.categorySlug}.`],
    };
  }
  const duplicate = await findArticleBySlug(input.slug, database);
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      issues: [`Slug already in use: ${input.slug}.`],
    };
  }

  const now = new Date();
  const row = await database
    .insert(articles)
    .values({
      title: input.title,
      slug: input.slug,
      categoryId: category.id,
      coverMediaId: input.coverMediaId ?? null,
      excerpt: input.excerpt,
      author: input.author ?? null,
      relatedProjectId: input.relatedProjectId ?? null,
      publishDate: input.publishDate,
      status: "draft",
      visibility: input.visibility ?? "public",
      seoMetaTitle: input.seoMetaTitle ?? null,
      seoMetaDescription: input.seoMetaDescription ?? null,
      seoOgMediaId: input.seoOgMediaId ?? null,
      updatedAt: now,
    })
    .returning()
    .get();

  if (input.blocks?.length) {
    insertBlocks(row.id, input.blocks, database);
  }

  const detail = await getArticleDetail(row.id, database);
  if (!detail) {
    return { ok: false, status: 422, issues: ["Article could not be read back."] };
  }
  return { ok: true, detail };
}

export async function updateArticle(
  id: number,
  patch: ArticleUpdateInput,
  database: QueryDatabase = defaultDb,
): Promise<
  | { ok: true; detail: ArticleDetail }
  | { ok: false; status: 404 | 409 | 422; issues: string[] }
> {
  const existing = await getArticleRowById(id, database);
  if (!existing) {
    return { ok: false, status: 404, issues: [`Article not found: ${id}.`] };
  }

  if (patch.slug && patch.slug !== existing.slug) {
    const duplicate = await findArticleBySlug(patch.slug, database);
    if (duplicate && duplicate.id !== id) {
      return {
        ok: false,
        status: 409,
        issues: [`Slug already in use: ${patch.slug}.`],
      };
    }
  }

  let categoryId: number | undefined;
  if (patch.categorySlug !== undefined) {
    const category = await database
      .select({ id: journalCategories.id })
      .from(journalCategories)
      .where(eq(journalCategories.slug, patch.categorySlug))
      .limit(1)
      .get();
    if (!category) {
      return {
        ok: false,
        status: 422,
        issues: [`Unknown journal category: ${patch.categorySlug}.`],
      };
    }
    categoryId = category.id;
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.slug !== undefined) values.slug = patch.slug;
  if (patch.excerpt !== undefined) values.excerpt = patch.excerpt;
  if (patch.publishDate !== undefined) values.publishDate = patch.publishDate;
  if (patch.author !== undefined) values.author = patch.author;
  if (patch.relatedProjectId !== undefined) {
    values.relatedProjectId = patch.relatedProjectId;
  }
  if (patch.coverMediaId !== undefined) values.coverMediaId = patch.coverMediaId;
  if (patch.seoMetaTitle !== undefined) values.seoMetaTitle = patch.seoMetaTitle;
  if (patch.seoMetaDescription !== undefined) {
    values.seoMetaDescription = patch.seoMetaDescription;
  }
  if (patch.seoOgMediaId !== undefined) values.seoOgMediaId = patch.seoOgMediaId;
  if (patch.visibility !== undefined) values.visibility = patch.visibility;
  if (categoryId !== undefined) values.categoryId = categoryId;

  database.update(articles).set(values).where(eq(articles.id, id)).run();

  if (patch.blocks !== undefined) {
    await database
      .delete(articleBlocks)
      .where(eq(articleBlocks.articleId, id))
      .run();
    insertBlocks(id, patch.blocks, database);
  }

  const detail = await getArticleDetail(id, database);
  if (!detail) {
    return { ok: false, status: 404, issues: [`Article not found: ${id}.`] };
  }
  return { ok: true, detail };
}

/** §26 delete flow: only archived rows may be removed permanently. */
export async function deleteArticleGuarded(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<
  | { ok: true }
  | { ok: false; status: 404 | 409; issues: string[] }
> {
  const existing = await getArticleRowById(id, database);
  if (!existing) {
    return { ok: false, status: 404, issues: [`Article not found: ${id}.`] };
  }
  if (existing.status !== "archived") {
    return {
      ok: false,
      status: 409,
      issues: ["Archive the article before deleting it permanently."],
    };
  }
  database.delete(articles).where(eq(articles.id, id)).run();
  return { ok: true };
}

/* ---------------- Publish workflow (§24, §11 gate) ---------------- */

export const ARTICLE_ACTIONS = [
  "publish",
  "unpublish",
  "schedule",
  "archive",
  "save_draft",
] as const;

export type ArticleAction = (typeof ARTICLE_ACTIONS)[number];

export type ArticleActionValidation =
  | { ok: true; action: ArticleAction; publishAt: string | null }
  | { ok: false; issues: string[] };

export function validateArticleAction(raw: unknown): ArticleActionValidation {
  const validated = validatePublishAction(raw, { allowSchedule: true });
  if (!validated.ok) return { ok: false, issues: validated.issues };
  return {
    ok: true,
    action: validated.action as ArticleAction,
    publishAt: validated.publishAt,
  };
}

/**
 * The §11 publish gate. Cover stays optional until the Media Library
 * lands; every other documented field must be real.
 */
export function articlePublishIssues(
  row: typeof articles.$inferSelect,
  blockCount: number,
): string[] {
  const issues: string[] = [];
  if (!row.title.trim()) issues.push("Title is required.");
  if (row.categoryId === null) issues.push("Category is required.");
  if (!row.excerpt.trim()) issues.push("Excerpt is required.");
  if (!row.publishDate.trim()) issues.push("Publish date is required.");
  if (blockCount === 0) issues.push("At least one content block is required.");
  return issues;
}

export type ArticleActionResult =
  | { ok: true; row: typeof articles.$inferSelect }
  | { ok: false; status: 404 | 422; issues: string[] };

export async function applyArticleAction(
  id: number,
  action: ArticleAction,
  publishAt: string | null,
  database: QueryDatabase = defaultDb,
): Promise<ArticleActionResult> {
  const row = await getArticleRowById(id, database);
  if (!row) {
    return { ok: false, status: 404, issues: [`Article not found: ${id}.`] };
  }

  if (action === "publish" || action === "schedule") {
    const blocks = await getArticleBlocks(id, database);
    const issues = articlePublishIssues(row, blocks.length);
    if (issues.length > 0) {
      return { ok: false, status: 422, issues };
    }
  }

  const resolved = statusForAction(action, publishAt);
  const updated = await database
    .update(articles)
    .set({
      status: resolved.status,
      publishAt: resolved.publishAt,
      updatedAt: new Date(),
    })
    .where(eq(articles.id, id))
    .returning()
    .get();

  return { ok: true, row: updated };
}
