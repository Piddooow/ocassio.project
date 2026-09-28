import { and, desc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { articles, services } from "@/lib/db/schema";
import { publicArticleConditions } from "./articles";
import { getAssetWithVariants } from "./media-admin";
import { publicServiceConditions } from "./services";
import type { QueryDatabase } from "./upcoming";

/**
 * SEO wiring (§8, §12): per-content SEO fields and the social image
 * resolve for public metadata, with the editorial excerpt/description as
 * the honest fallback.
 */

/** Largest variant URL for a social image asset, or null. */
export async function ogImageUrl(
  assetId: number | null | undefined,
  database: QueryDatabase = defaultDb,
): Promise<string | null> {
  if (!assetId) return null;
  const detail = await getAssetWithVariants(assetId, database);
  if (!detail || detail.variants.length === 0) return null;
  return detail.variants.reduce((largest, variant) =>
    variant.width > largest.width ? variant : largest,
  ).url;
}

const PUBLISHED_SERVICE_CONDITIONS = publicServiceConditions;

export async function getArticleSeo(
  slug: string,
  database: QueryDatabase = defaultDb,
) {
  const row = await database
    .select({
      seoMetaTitle: articles.seoMetaTitle,
      seoMetaDescription: articles.seoMetaDescription,
      seoOgMediaId: articles.seoOgMediaId,
    })
    .from(articles)
    .where(and(eq(articles.slug, slug), publicArticleConditions()))
    .limit(1)
    .get();
  if (!row) return null;
  return { ...row, ogImage: await ogImageUrl(row.seoOgMediaId, database) };
}

export async function getServiceSeo(
  slug: string,
  database: QueryDatabase = defaultDb,
) {
  const row = await database
    .select({
      seoMetaTitle: services.seoMetaTitle,
      seoMetaDescription: services.seoMetaDescription,
      seoOgMediaId: services.seoOgMediaId,
    })
    .from(services)
    .where(and(eq(services.slug, slug), PUBLISHED_SERVICE_CONDITIONS()))
    .limit(1)
    .get();
  if (!row) return null;
  return { ...row, ogImage: await ogImageUrl(row.seoOgMediaId, database) };
}

export interface SeoOverviewRow {
  id: number;
  title: string;
  slug: string;
  hasTitle: boolean;
  hasDescription: boolean;
}

/** Admin SEO overview: momentum over what still lacks metadata. */
export async function listSeoOverview(database: QueryDatabase = defaultDb) {
  const articleRows = (
    await database
      .select({
        id: articles.id,
        title: articles.title,
        slug: articles.slug,
        seoMetaTitle: articles.seoMetaTitle,
        seoMetaDescription: articles.seoMetaDescription,
      })
      .from(articles)
      .orderBy(desc(articles.updatedAt))
      .all()
  ).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    hasTitle: Boolean(row.seoMetaTitle?.trim()),
    hasDescription: Boolean(row.seoMetaDescription?.trim()),
  }));

  const serviceRows = (
    await database
      .select({
        id: services.id,
        title: services.name,
        slug: services.slug,
        seoMetaTitle: services.seoMetaTitle,
        seoMetaDescription: services.seoMetaDescription,
      })
      .from(services)
      .orderBy(desc(services.updatedAt))
      .all()
  ).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    hasTitle: Boolean(row.seoMetaTitle?.trim()),
    hasDescription: Boolean(row.seoMetaDescription?.trim()),
  }));

  return { articles: articleRows, services: serviceRows };
}
