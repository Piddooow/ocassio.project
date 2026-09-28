import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  mediaAssets,
  mediaVariants,
  projectMedia,
  projects,
} from "@/lib/db/schema";
import { getProjectMedia, type PhotoAsset } from "@/lib/content/media";
import type { Project, WorkCategory } from "@/lib/content/types";
import type { QueryDatabase } from "./upcoming";

/**
 * Public portfolio queries (§6.2): editorial fields and publish state come
 * from SQLite (draft/private never surface, §13); galleries keep resolving
 * from the generated media manifest until the media library covers video
 * uploads, with uploaded image assets attached on top.
 */

function publicProjectConditions() {
  return and(eq(projects.status, "published"), eq(projects.visibility, "public"));
}

type ProjectRow = typeof projects.$inferSelect;

async function hydrateProjects(
  rows: ProjectRow[],
  database: QueryDatabase,
): Promise<Project[]> {
  const ids = rows.map((row) => row.id);
  const mediaRows = ids.length
    ? await database
        .select({
          projectId: projectMedia.projectId,
          mediaId: projectMedia.mediaId,
        })
        .from(projectMedia)
        .where(inArray(projectMedia.projectId, ids))
        .orderBy(asc(projectMedia.sortOrder), asc(projectMedia.id))
        .all()
    : [];

  const mediaIds = [...new Set(mediaRows.map((row) => row.mediaId))];
  const assets = mediaIds.length
    ? await database
        .select({
          id: mediaAssets.id,
          filename: mediaAssets.filename,
          width: mediaAssets.width,
          height: mediaAssets.height,
          mediaType: mediaAssets.mediaType,
        })
        .from(mediaAssets)
        .where(inArray(mediaAssets.id, mediaIds))
        .all()
    : [];
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));

  const variants = mediaIds.length
    ? await database
        .select({
          assetId: mediaVariants.assetId,
          url: mediaVariants.url,
          width: mediaVariants.width,
        })
        .from(mediaVariants)
        .where(inArray(mediaVariants.assetId, mediaIds))
        .all()
    : [];
  const variantsByAsset = new Map<number, Record<string, string>>();
  for (const variant of variants) {
    const map = variantsByAsset.get(variant.assetId) ?? {};
    map[String(variant.width)] = variant.url;
    variantsByAsset.set(variant.assetId, map);
  }

  const toPhotoAsset = (assetId: number, prefix: string): PhotoAsset | null => {
    const asset = assetById.get(assetId);
    if (!asset || asset.mediaType !== "image") return null;
    return {
      id: `${prefix}-${asset.id}`,
      file: asset.filename,
      width: asset.width,
      height: asset.height,
      variants: variantsByAsset.get(asset.id) ?? {},
    };
  };

  return rows.map((row) => {
    const manifest = getProjectMedia(row.slug);
    const basePhotos = manifest?.photos ?? [];
    const leading = [
      row.heroMediaId ? toPhotoAsset(row.heroMediaId, "hero") : null,
      row.coverMediaId ? toPhotoAsset(row.coverMediaId, "cover") : null,
    ].filter((photo): photo is PhotoAsset => Boolean(photo));
    const attachments = mediaRows
      .filter((media) => media.projectId === row.id)
      .map((media) => toPhotoAsset(media.mediaId, "media"))
      .filter((photo): photo is PhotoAsset => Boolean(photo));

    const photos: PhotoAsset[] = [];
    for (const photo of [...leading, ...basePhotos, ...attachments]) {
      if (!photos.some((existing) => existing.id === photo.id)) {
        photos.push(photo);
      }
    }

    return {
      slug: row.slug,
      title: row.title,
      client: row.client ?? undefined,
      date: row.projectDate,
      year: row.year,
      category: row.category as WorkCategory,
      location: row.location ?? undefined,
      shortDescription: row.shortDescription,
      photos,
      videos: manifest?.videos ?? [],
      credits: row.credits ?? [],
      relatedSlugs: row.relatedSlugs ?? [],
      status: row.status,
      visibility: row.visibility,
    };
  });
}

/** Published + public projects, newest first (§6.2). */
export async function listPublishedProjects(
  database: QueryDatabase = defaultDb,
): Promise<Project[]> {
  const rows = await database
    .select()
    .from(projects)
    .where(publicProjectConditions())
    .orderBy(desc(projects.projectDate), desc(projects.id))
    .all();
  return hydrateProjects(rows, database);
}

/** A single published + public project, addressed by slug. */
export async function getPublishedProjectBySlug(
  slug: string,
  database: QueryDatabase = defaultDb,
): Promise<Project | undefined> {
  const row = (
    await database
      .select()
      .from(projects)
      .where(and(eq(projects.slug, slug), publicProjectConditions()))
      .limit(1)
      .all()
  )[0];
  if (!row) return undefined;
  const hydrated = await hydrateProjects([row], database);
  return hydrated[0];
}

/** Related projects (§6.3), resolved from explicit relations only. */
export async function getRelatedProjects(
  project: Project,
  database: QueryDatabase = defaultDb,
): Promise<Project[]> {
  const all = await listPublishedProjects(database);
  return project.relatedSlugs
    .map((slug) => all.find((candidate) => candidate.slug === slug))
    .filter((candidate): candidate is Project => Boolean(candidate));
}

/** Next project in the published order, wrapping around (§6.3). */
export async function getNextProject(
  slug: string,
  database: QueryDatabase = defaultDb,
): Promise<Project | undefined> {
  const all = await listPublishedProjects(database);
  const index = all.findIndex((project) => project.slug === slug);
  if (index === -1 || all.length < 2) return undefined;
  return all[(index + 1) % all.length];
}
