import type { MediaRef, PublishVisibility } from "./types";

/** Public status for upcoming work (§6.11), `private` lives on visibility. */
export const UPCOMING_STATUSES = ["in_production", "coming_soon"] as const;

export type UpcomingStatus = (typeof UPCOMING_STATUSES)[number];

export interface UpcomingProject {
  slug: string;
  title: string;
  projectType: string;
  teaser: string;
  location: string;
  expectedRelease: string;
  status: UpcomingStatus;
  cover: MediaRef;
  /** Optional relation to a portfolio project (§26.2 related_project_id). */
  relatedProjectSlug?: string;
  visibility: PublishVisibility;
}

/**
 * No public upcoming projects are announced right now, the Now page
 * shows its empty state until the studio confirms new work to tease.
 * Owned later by Admin → Current → Upcoming Projects.
 */
export const UPCOMING_PROJECTS: UpcomingProject[] = [];
