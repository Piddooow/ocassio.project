import { and, asc, desc, eq, inArray, like, or } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  articles,
  clients,
  mediaAssets,
  mediaVariants,
  services,
  studioAbout,
  teamMembers,
  upcomingProjects,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin Media Library (§20): list and filter assets, edit metadata, and
 * guard deletion with the documented "Used in" check. Files on disk stay
 * untouched; the database is the catalog of record.
 */

export interface MediaListFilters {
  mediaType?: "image" | "video";
  search?: string;
}

export interface MediaListRow {
  id: number;
  filename: string;
  mediaType: "image" | "video";
  width: number;
  height: number;
  fileSize: number;
  altText: string | null;
  credit: string | null;
  usageState: "used" | "unused";
  createdAt: Date;
  variantCount: number;
  previewUrl: string | null;
}

export async function listMediaAssets(
  filters: MediaListFilters = {},
  database: QueryDatabase = defaultDb,
): Promise<MediaListRow[]> {
  const conditions = [];
  if (filters.mediaType) {
    conditions.push(eq(mediaAssets.mediaType, filters.mediaType));
  }
  if (filters.search && filters.search.trim().length > 0) {
    conditions.push(like(mediaAssets.filename, `%${filters.search.trim()}%`));
  }

  const rows = await database
    .select({
      id: mediaAssets.id,
      filename: mediaAssets.filename,
      mediaType: mediaAssets.mediaType,
      width: mediaAssets.width,
      height: mediaAssets.height,
      fileSize: mediaAssets.fileSize,
      altText: mediaAssets.altText,
      credit: mediaAssets.credit,
      usageState: mediaAssets.usageState,
      createdAt: mediaAssets.createdAt,
    })
    .from(mediaAssets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(mediaAssets.createdAt), desc(mediaAssets.id))
    .all();

  const ids = rows.map((row) => row.id);
  const variants = ids.length
    ? await database
        .select({
          assetId: mediaVariants.assetId,
          url: mediaVariants.url,
          width: mediaVariants.width,
        })
        .from(mediaVariants)
        .where(inArray(mediaVariants.assetId, ids))
        .all()
    : [];

  const previewByAsset = new Map<number, { url: string; width: number }>();
  const countByAsset = new Map<number, number>();
  for (const variant of variants) {
    countByAsset.set(
      variant.assetId,
      (countByAsset.get(variant.assetId) ?? 0) + 1,
    );
    const current = previewByAsset.get(variant.assetId);
    if (!current || variant.width < current.width) {
      previewByAsset.set(variant.assetId, {
        url: variant.url,
        width: variant.width,
      });
    }
  }

  return rows.map((row) => ({
    ...row,
    variantCount: countByAsset.get(row.id) ?? 0,
    previewUrl: previewByAsset.get(row.id)?.url ?? null,
  }));
}

export async function getMediaAssetDetail(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const asset = await database
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1)
    .get();
  if (!asset) return null;
  const variants = await database
    .select()
    .from(mediaVariants)
    .where(eq(mediaVariants.assetId, id))
    .orderBy(asc(mediaVariants.width))
    .all();
  return { asset, variants };
}

export interface MediaMetadataPatch {
  altText?: string | null;
  credit?: string | null;
  usageState?: "used" | "unused";
}

export async function updateMediaAsset(
  id: number,
  patch: MediaMetadataPatch,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = {};
  if (patch.altText !== undefined) values.altText = patch.altText;
  if (patch.credit !== undefined) values.credit = patch.credit;
  if (patch.usageState !== undefined) values.usageState = patch.usageState;
  if (Object.keys(values).length === 0) return undefined;

  return await database
    .update(mediaAssets)
    .set(values)
    .where(eq(mediaAssets.id, id))
    .returning()
    .get();
}

/** The §20 "Used in" audit across every referencing module. */
export async function mediaUsageLabels(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<string[]> {
  const labels: string[] = [];

  const usedServices = await database
    .select({ slug: services.slug })
    .from(services)
    .where(eq(services.supportingMediaId, id))
    .all();
  for (const service of usedServices) labels.push(`Service: ${service.slug}`);

  const usedArticles = await database
    .select({ slug: articles.slug })
    .from(articles)
    .where(
      or(eq(articles.coverMediaId, id), eq(articles.seoOgMediaId, id)),
    )
    .all();
  for (const article of usedArticles) labels.push(`Article: ${article.slug}`);

  const usedNow = await database
    .select({ title: upcomingProjects.title })
    .from(upcomingProjects)
    .where(eq(upcomingProjects.mediaId, id))
    .all();
  for (const entry of usedNow) labels.push(`Now: ${entry.title}`);

  const usedTeam = await database
    .select({ name: teamMembers.name })
    .from(teamMembers)
    .where(eq(teamMembers.photoMediaId, id))
    .all();
  for (const member of usedTeam) labels.push(`Team: ${member.name}`);

  const usedClients = await database
    .select({ name: clients.name })
    .from(clients)
    .where(eq(clients.logoMediaId, id))
    .all();
  for (const client of usedClients) labels.push(`Client: ${client.name}`);

  const about = await database
    .select({ id: studioAbout.id })
    .from(studioAbout)
    .where(eq(studioAbout.supportingMediaId, id))
    .limit(1)
    .get();
  if (about) labels.push("Studio About");

  return labels;
}

export async function deleteMediaAssetGuarded(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<
  | { ok: true }
  | { ok: false; status: 404 | 409; issues: string[] }
> {
  const existing = await database
    .select({ id: mediaAssets.id })
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1)
    .get();
  if (!existing) {
    return { ok: false, status: 404, issues: [`Asset not found: ${id}.`] };
  }

  const usages = await mediaUsageLabels(id, database);
  if (usages.length > 0) {
    return {
      ok: false,
      status: 409,
      issues: [`Cannot delete. Used in: ${usages.join(", ")}.`],
    };
  }

  database.delete(mediaAssets).where(eq(mediaAssets.id, id)).run();
  return { ok: true };
}

/* ---------------- Uploads (Now teaser images, §20/§21) ---------------- */

import { MEDIA_TYPES, MEDIA_USAGE_STATES } from "@/lib/db/schema";
import type { OptimizedVariant } from "@/lib/media/optimize";

export interface NewAssetInput {
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  storageKey: string;
  altText: string | null;
}

/** Inserts an optimized upload plus every generated variant row. */
export async function createAssetWithVariants(
  input: NewAssetInput,
  variants: OptimizedVariant[],
  database: QueryDatabase = defaultDb,
) {
  const asset = await database
    .insert(mediaAssets)
    .values({
      filename: input.filename,
      mediaType: "image",
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      fileSize: input.fileSize,
      storageKey: input.storageKey,
      altText: input.altText,
      usageState: "used",
    })
    .returning()
    .get();

  const rows = await Promise.all(
    variants.map((variant) =>
      database
        .insert(mediaVariants)
        .values({
          assetId: asset.id,
          format: variant.format,
          url: variant.url,
          width: variant.width,
          height: variant.height,
        })
        .returning()
        .get(),
    ),
  );

  return { asset, variants: rows };
}

/** Asset plus its variant rows (for replace/cleanup flows). */
export async function getAssetWithVariants(
  assetId: number,
  database: QueryDatabase = defaultDb,
) {
  const asset = await database
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, assetId))
    .limit(1)
    .get();
  if (!asset) return null;
  const variants = await database
    .select()
    .from(mediaVariants)
    .where(eq(mediaVariants.assetId, assetId))
    .orderBy(asc(mediaVariants.width))
    .all();
  return { asset, variants };
}

/** Deletes an asset row; variant rows cascade. */
export async function deleteAssetRow(
  assetId: number,
  database: QueryDatabase = defaultDb,
) {
  database.delete(mediaAssets).where(eq(mediaAssets.id, assetId)).run();
}

/** Links (or unlinks) the teaser image on a Now entry. */
export async function setEntryMedia(
  entryId: number,
  assetId: number | null,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .update(upcomingProjects)
    .set({ mediaId: assetId, updatedAt: new Date() })
    .where(eq(upcomingProjects.id, entryId))
    .returning()
    .get();
}

/** Re-exported so upload routes keep one import source (§20). */
export { MEDIA_TYPES, MEDIA_USAGE_STATES };
