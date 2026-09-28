import { and, asc, eq, inArray, isNull, lte, or } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { mediaAssets, mediaVariants, upcomingProjects } from "@/lib/db/schema";

/**
 * Public Now (current / upcoming) queries.
 * Reads only entries where visibility = public and the optional
 * publish_at has arrived (PRD §6.11, §24).
 */

export type QueryDatabase = typeof defaultDb;

export interface NowEntryImage {
  alt: string | null;
  variants: { width: number; url: string }[];
}

export interface PublicNowEntry {
  id: number;
  title: string;
  projectType: string;
  teaser: string;
  location: string | null;
  expectedRelease: string | null;
  status: (typeof upcomingProjects.$inferSelect)["status"];
  image: NowEntryImage | null;
}

/**
 * Single enforcement point for public Now visibility (PRD §6.11):
 * visibility = public AND the optional publish_at has arrived.
 * Private or future-scheduled teasers must be filtered through this.
 */
export function publicNowConditions(nowIso: string = new Date().toISOString()) {
  return and(
    eq(upcomingProjects.visibility, "public"),
    or(isNull(upcomingProjects.publishAt), lte(upcomingProjects.publishAt, nowIso)),
  );
}

export async function listPublicNowEntries(
  database: QueryDatabase = defaultDb,
): Promise<PublicNowEntry[]> {
  const rows = await database
    .select({
      id: upcomingProjects.id,
      title: upcomingProjects.title,
      projectType: upcomingProjects.projectType,
      teaser: upcomingProjects.description,
      location: upcomingProjects.location,
      expectedRelease: upcomingProjects.expectedRelease,
      status: upcomingProjects.status,
      assetId: mediaAssets.id,
      altText: mediaAssets.altText,
    })
    .from(upcomingProjects)
    .leftJoin(mediaAssets, eq(upcomingProjects.mediaId, mediaAssets.id))
    .where(publicNowConditions())
    .orderBy(asc(upcomingProjects.sortOrder), asc(upcomingProjects.id))
    .all();

  const assetIds = rows
    .map((row) => row.assetId)
    .filter((id): id is number => id !== null);
  const variantRows = assetIds.length
    ? await database
        .select({
          assetId: mediaVariants.assetId,
          width: mediaVariants.width,
          url: mediaVariants.url,
        })
        .from(mediaVariants)
        .where(inArray(mediaVariants.assetId, assetIds))
        .all()
    : [];

  const variantsByAsset = new Map<number, { width: number; url: string }[]>();
  for (const variant of variantRows) {
    const list = variantsByAsset.get(variant.assetId) ?? [];
    list.push({ width: variant.width, url: variant.url });
    variantsByAsset.set(variant.assetId, list);
  }
  for (const list of variantsByAsset.values()) {
    list.sort((a, b) => a.width - b.width);
  }

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    projectType: row.projectType,
    teaser: row.teaser,
    location: row.location,
    expectedRelease: row.expectedRelease,
    status: row.status,
    image:
      row.assetId !== null
        ? {
            alt: row.altText,
            variants: variantsByAsset.get(row.assetId) ?? [],
          }
        : null,
  }));
}
