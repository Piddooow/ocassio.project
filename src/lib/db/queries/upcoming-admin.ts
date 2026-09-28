import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  UPCOMING_STATUSES,
  PUBLISH_VISIBILITIES,
  upcomingProjects,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for Now (upcoming) entries. These functions are transport
 * agnostic; the admin API routes own authentication and HTTP statuses.
 */

export type UpcomingStatusValue = (typeof UPCOMING_STATUSES)[number];
export type VisibilityValue = (typeof PUBLISH_VISIBILITIES)[number];

export interface UpcomingInput {
  title: string;
  projectType: string;
  teaser: string;
  location: string | null;
  expectedRelease: string | null;
  status: UpcomingStatusValue;
  visibility: VisibilityValue;
  publishAt: string | null;
  sortOrder: number;
}

export type ValidationResult =
  | { ok: true; value: Partial<UpcomingInput> }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isIsoDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}(T[\d:.]+Z?)?$/.test(value) &&
  !Number.isNaN(Date.parse(value));

/** Field length limits, enforced with specific messages. */
const LENGTH_LIMITS = {
  title: 160,
  projectType: 80,
  teaser: 500,
  location: 120,
  expectedRelease: 80,
} as const;

/**
 * Validates a payload for create (partial = false) or update
 * (partial = true). Unknown keys are ignored on purpose.
 */
export function validateUpcomingInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<UpcomingInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) {
      errors.push(`${key} is required.`);
    }
  };
  requireOnCreate("title");
  requireOnCreate("projectType");
  requireOnCreate("teaser");
  requireOnCreate("status");
  requireOnCreate("visibility");

  if (body.title !== undefined) {
    if (!isNonEmptyString(body.title))
      errors.push("title must be a non-empty string.");
    else if (body.title.trim().length > LENGTH_LIMITS.title)
      errors.push(
        `title must be ${LENGTH_LIMITS.title} characters or fewer.`,
      );
    else value.title = body.title.trim();
  }
  if (body.projectType !== undefined) {
    if (!isNonEmptyString(body.projectType))
      errors.push("projectType must be a non-empty string.");
    else if (body.projectType.trim().length > LENGTH_LIMITS.projectType)
      errors.push(
        `projectType must be ${LENGTH_LIMITS.projectType} characters or fewer.`,
      );
    else value.projectType = body.projectType.trim();
  }
  if (body.teaser !== undefined) {
    if (!isNonEmptyString(body.teaser))
      errors.push("teaser must be a non-empty string.");
    else if (body.teaser.trim().length > LENGTH_LIMITS.teaser)
      errors.push(
        `teaser must be ${LENGTH_LIMITS.teaser} characters or fewer.`,
      );
    else value.teaser = body.teaser.trim();
  }
  if (body.location !== undefined) {
    if (body.location !== null && typeof body.location !== "string")
      errors.push("location must be a string or null.");
    else if (
      typeof body.location === "string" &&
      body.location.trim().length > LENGTH_LIMITS.location
    )
      errors.push(
        `location must be ${LENGTH_LIMITS.location} characters or fewer.`,
      );
    else
      value.location =
        typeof body.location === "string" && body.location.trim().length > 0
          ? body.location.trim()
          : null;
  }
  if (body.expectedRelease !== undefined) {
    if (
      body.expectedRelease !== null &&
      typeof body.expectedRelease !== "string"
    )
      errors.push("expectedRelease must be a string or null.");
    else if (
      typeof body.expectedRelease === "string" &&
      body.expectedRelease.trim().length > LENGTH_LIMITS.expectedRelease
    )
      errors.push(
        `expectedRelease must be ${LENGTH_LIMITS.expectedRelease} characters or fewer.`,
      );
    else
      value.expectedRelease =
        typeof body.expectedRelease === "string" &&
        body.expectedRelease.trim().length > 0
          ? body.expectedRelease.trim()
          : null;
  }
  if (body.status !== undefined) {
    if (!UPCOMING_STATUSES.includes(body.status as UpcomingStatusValue))
      errors.push(
        `status must be one of: ${UPCOMING_STATUSES.join(", ")}.`,
      );
    else value.status = body.status as UpcomingStatusValue;
  }
  if (body.visibility !== undefined) {
    if (!PUBLISH_VISIBILITIES.includes(body.visibility as VisibilityValue))
      errors.push(
        `visibility must be one of: ${PUBLISH_VISIBILITIES.join(", ")}.`,
      );
    else value.visibility = body.visibility as VisibilityValue;
  }
  if (body.publishAt !== undefined) {
    if (body.publishAt === null) value.publishAt = null;
    else if (typeof body.publishAt !== "string" || !isIsoDate(body.publishAt))
      errors.push("publishAt must be an ISO date string or null.");
    else value.publishAt = new Date(body.publishAt).toISOString();
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || (body.sortOrder as number) < 0)
      errors.push("sortOrder must be a non-negative integer.");
    else value.sortOrder = body.sortOrder as number;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllUpcomingEntries(database: QueryDatabase = defaultDb) {
  return await database
    .select()
    .from(upcomingProjects)
    .orderBy(asc(upcomingProjects.sortOrder), asc(upcomingProjects.id))
    .all();
}

export async function createUpcomingEntry(
  input: UpcomingInput,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .insert(upcomingProjects)
    .values({
      title: input.title,
      projectType: input.projectType,
      description: input.teaser,
      location: input.location,
      expectedRelease: input.expectedRelease,
      status: input.status,
      visibility: input.visibility,
      publishAt: input.publishAt,
      sortOrder: input.sortOrder,
    })
    .returning()
    .get();
}

export async function updateUpcomingEntry(
  id: number,
  patch: Partial<UpcomingInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = {};
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.projectType !== undefined) values.projectType = patch.projectType;
  if (patch.teaser !== undefined) values.description = patch.teaser;
  if (patch.location !== undefined) values.location = patch.location;
  if (patch.expectedRelease !== undefined)
    values.expectedRelease = patch.expectedRelease;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.visibility !== undefined) values.visibility = patch.visibility;
  if (patch.publishAt !== undefined) values.publishAt = patch.publishAt;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  values.updatedAt = new Date();

  return await database
    .update(upcomingProjects)
    .set(values)
    .where(eq(upcomingProjects.id, id))
    .returning()
    .get();
}

export async function deleteUpcomingEntry(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = await database
    .delete(upcomingProjects)
    .where(eq(upcomingProjects.id, id))
    .returning({ id: upcomingProjects.id })
    .get();
  return Boolean(deleted);
}

export async function getUpcomingEntryById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(upcomingProjects)
    .where(eq(upcomingProjects.id, id))
    .limit(1)
    .get();
}
