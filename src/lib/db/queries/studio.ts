import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  clients,
  mediaAssets,
  mediaVariants,
  recognition,
  studioAbout,
  teamMembers,
  type StudioAboutBody,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Public Studio queries (§6.8): the About singleton plus the team,
 * clients, and recognition lists. Reads published content only
 * (PRD §24); team entries also honor the public/private flag (§18).
 */

export interface StudioImage {
  alt: string | null;
  variants: { width: number; url: string }[];
}

/**
 * Single enforcement points for public Studio reads (§18): published
 * content only; team entries also honor the public/private flag.
 * Every public query below filters through these.
 */
export function publicTeamConditions() {
  return and(
    eq(teamMembers.status, "published"),
    eq(teamMembers.visibility, "public"),
  );
}

export function publicClientConditions() {
  return eq(clients.status, "published");
}

export function publicRecognitionConditions() {
  return eq(recognition.status, "published");
}

async function variantsByAssetId(
  database: QueryDatabase,
  assetIds: number[],
): Promise<Map<number, { width: number; url: string }[]>> {
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

  const map = new Map<number, { width: number; url: string }[]>();
  for (const variant of variantRows) {
    const list = map.get(variant.assetId) ?? [];
    list.push({ width: variant.width, url: variant.url });
    map.set(variant.assetId, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.width - b.width);
  }
  return map;
}

function imageFor(
  map: Map<number, { width: number; url: string }[]>,
  assetId: number | null,
  altText: string | null,
): StudioImage | null {
  if (assetId === null) return null;
  return { alt: altText, variants: map.get(assetId) ?? [] };
}

export interface PublicStudioAbout {
  heading: string;
  body: StudioAboutBody;
  image: StudioImage | null;
}

/** The About singleton; null until the studio writes it (§18). */
export async function getPublicStudioAbout(
  database: QueryDatabase = defaultDb,
): Promise<PublicStudioAbout | null> {
  const row = await database
    .select({
      heading: studioAbout.heading,
      body: studioAbout.body,
      assetId: mediaAssets.id,
      altText: mediaAssets.altText,
    })
    .from(studioAbout)
    .leftJoin(mediaAssets, eq(studioAbout.supportingMediaId, mediaAssets.id))
    .orderBy(asc(studioAbout.id))
    .limit(1)
    .get();

  if (!row) return null;
  const variants = await variantsByAssetId(
    database,
    row.assetId === null ? [] : [row.assetId],
  );
  return {
    heading: row.heading,
    body: row.body,
    image: imageFor(variants, row.assetId, row.altText),
  };
}

export interface PublicTeamMember {
  id: number;
  name: string;
  roleTitle: string;
  bio: string | null;
  sortOrder: number;
  image: StudioImage | null;
}

/** Published + public team members in display order (§18). */
export async function listPublicTeamMembers(
  database: QueryDatabase = defaultDb,
): Promise<PublicTeamMember[]> {
  const rows = await database
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
      roleTitle: teamMembers.roleTitle,
      bio: teamMembers.bio,
      sortOrder: teamMembers.sortOrder,
      assetId: mediaAssets.id,
      altText: mediaAssets.altText,
    })
    .from(teamMembers)
    .leftJoin(mediaAssets, eq(teamMembers.photoMediaId, mediaAssets.id))
    .where(publicTeamConditions())
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.id))
    .all();

  const variants = await variantsByAssetId(
    database,
    rows
      .map((row) => row.assetId)
      .filter((id): id is number => id !== null),
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    roleTitle: row.roleTitle,
    bio: row.bio,
    sortOrder: row.sortOrder,
    image: imageFor(variants, row.assetId, row.altText),
  }));
}

export interface PublicClient {
  id: number;
  name: string;
  website: string | null;
  featured: boolean;
  sortOrder: number;
  logo: StudioImage | null;
}

/** Published clients in display order; optional featured-only filter. */
export async function listPublishedClients(
  options: { featuredOnly?: boolean } = {},
  database: QueryDatabase = defaultDb,
): Promise<PublicClient[]> {
  const conditions = [publicClientConditions()];
  if (options.featuredOnly) conditions.push(eq(clients.featured, true));

  const rows = await database
    .select({
      id: clients.id,
      name: clients.name,
      website: clients.website,
      featured: clients.featured,
      sortOrder: clients.sortOrder,
      assetId: mediaAssets.id,
      altText: mediaAssets.altText,
    })
    .from(clients)
    .leftJoin(mediaAssets, eq(clients.logoMediaId, mediaAssets.id))
    .where(and(...conditions))
    .orderBy(asc(clients.sortOrder), asc(clients.id))
    .all();

  const variants = await variantsByAssetId(
    database,
    rows
      .map((row) => row.assetId)
      .filter((id): id is number => id !== null),
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    website: row.website,
    featured: row.featured,
    sortOrder: row.sortOrder,
    logo: imageFor(variants, row.assetId, row.altText),
  }));
}

export interface PublicRecognitionEntry {
  id: number;
  title: string;
  organization: string | null;
  year: number;
  url: string | null;
  recognitionType: (typeof recognition.$inferSelect)["recognitionType"];
  description: string | null;
  sortOrder: number;
}

/** Published recognition entries, newest first (§18). */
export async function listPublishedRecognition(
  database: QueryDatabase = defaultDb,
): Promise<PublicRecognitionEntry[]> {
  return await database
    .select({
      id: recognition.id,
      title: recognition.title,
      organization: recognition.organization,
      year: recognition.year,
      url: recognition.url,
      recognitionType: recognition.recognitionType,
      description: recognition.description,
      sortOrder: recognition.sortOrder,
    })
    .from(recognition)
    .where(publicRecognitionConditions())
    .orderBy(
      desc(recognition.year),
      asc(recognition.sortOrder),
      asc(recognition.id),
    )
    .all();
}
