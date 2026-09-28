/**
 * Frontend-facing content types, shaped after the derived schema in PRD §26.
 * These are stubs today; the backend layer will serve the same shapes later.
 */

import type { PhotoAsset, VideoAsset } from "./media";

/** Lifecycle status (PRD §26.1), the public site reads `published` only. */
export const CONTENT_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Publish visibility (PRD §26.1), the public site reads `public` only. */
export const PUBLISH_VISIBILITIES = ["public", "private"] as const;

export type PublishVisibility = (typeof PUBLISH_VISIBILITIES)[number];

/** Work filters (§5.2), separate taxonomy from service types (§5.4). */
export const WORK_CATEGORIES = [
  "Photography",
  "Film",
  "Commercial",
  "Editorial",
  "Portrait",
  "Product",
  "Event",
] as const;

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export type WorkFilter = "All" | WorkCategory;

export const WORK_FILTERS: WorkFilter[] = ["All", ...WORK_CATEGORIES];

export type MediaAspect = "portrait" | "landscape" | "cinematic" | "square";

/**
 * Placeholder media descriptor, still used by placeholder content
 * (journal stubs, services without real assets) until real media exists.
 */
export interface MediaRef {
  aspect: MediaAspect;
  label: string;
}

export interface ProjectCredit {
  role: string;
  name: string;
}

/**
 * A real portfolio project. Photos and videos come from the generated
 * media manifest (scripts/build-media.mjs), never hand-maintained.
 */
export interface Project {
  slug: string;
  title: string;
  client?: string;
  /** ISO date, drives newest-first ordering. */
  date: string;
  year: number;
  category: WorkCategory;
  location?: string;
  shortDescription: string;
  photos: PhotoAsset[];
  videos: VideoAsset[];
  credits: ProjectCredit[];
  /** project_relations (§26.2). */
  relatedSlugs: string[];
  status: ContentStatus;
  visibility: PublishVisibility;
}
