import { asc, desc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  CONTENT_STATUSES,
  PUBLISH_VISIBILITIES,
  RECOGNITION_TYPES,
  clients,
  recognition,
  studioAbout,
  teamMembers,
  type StudioAboutBody,
} from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for Studio content (§18): the About singleton, team
 * members, clients, and recognition. Transport-agnostic; the admin
 * routes own authentication and HTTP statuses.
 */

export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];
export type VisibilityValue = (typeof PUBLISH_VISIBILITIES)[number];
export type RecognitionTypeValue = (typeof RECOGNITION_TYPES)[number];

type ValidationResult<T> =
  | { ok: true; value: Partial<T> }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

function optionalText(
  value: unknown,
  label: string,
  limit: number,
  errors: string[],
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    errors.push(`${label} must be a string or null.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > limit) {
    errors.push(`${label} must be ${limit} characters or fewer.`);
    return undefined;
  }
  return trimmed.length > 0 ? trimmed : null;
}

function optionalMediaId(
  value: unknown,
  label: string,
  errors: string[],
): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!Number.isInteger(value) || (value as number) <= 0) {
    errors.push(`${label} must be a positive asset id or null.`);
    return undefined;
  }
  return value as number;
}

function optionalUrl(
  value: unknown,
  label: string,
  limit: number,
  errors: string[],
): string | null | undefined {
  const text = optionalText(value, label, limit, errors);
  if (text === undefined || text === null) return text;
  if (!/^https?:\/\//i.test(text)) {
    errors.push(`${label} must start with https:// or be left empty.`);
    return undefined;
  }
  return text;
}

function optionalSortOrder(
  value: unknown,
  errors: string[],
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isInteger(value) || (value as number) < 0) {
    errors.push("sortOrder must be a non-negative integer.");
    return undefined;
  }
  return value as number;
}

function validateStringList(
  value: unknown,
  label: string,
  errors: string[],
): string[] | undefined {
  if (!Array.isArray(value)) {
    errors.push(`${label} must be an array of strings.`);
    return undefined;
  }
  if (value.length > 40) {
    errors.push(`${label} must hold 40 entries or fewer.`);
    return undefined;
  }
  const list: string[] = [];
  for (const [index, entry] of value.entries()) {
    if (!isNonEmptyString(entry)) {
      errors.push(`${label}[${index}] must be a non-empty string.`);
      return undefined;
    }
    if (entry.trim().length > 2000) {
      errors.push(`${label}[${index}] must be 2000 characters or fewer.`);
      return undefined;
    }
    list.push(entry.trim());
  }
  return list;
}

/* ---------------- About (singleton) ---------------- */

export interface StudioAboutInput {
  heading: string;
  body: StudioAboutBody;
  supportingMediaId: number | null;
}

export function validateStudioAboutInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult<StudioAboutInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<StudioAboutInput> = {};

  if (!partial) {
    if (body.heading === undefined) errors.push("heading is required.");
    if (body.body === undefined) errors.push("body is required.");
  }

  if (body.heading !== undefined) {
    if (!isNonEmptyString(body.heading))
      errors.push("heading must be a non-empty string.");
    else if (body.heading.trim().length > 200)
      errors.push("heading must be 200 characters or fewer.");
    else value.heading = body.heading.trim();
  }

  if (body.body !== undefined) {
    if (
      typeof body.body !== "object" ||
      body.body === null ||
      Array.isArray(body.body)
    ) {
      errors.push("body must be an object with paragraphs and philosophy.");
    } else {
      const candidate = body.body as Record<string, unknown>;
      const paragraphs = validateStringList(
        candidate.paragraphs,
        "body.paragraphs",
        errors,
      );
      const philosophy = validateStringList(
        candidate.philosophy,
        "body.philosophy",
        errors,
      );
      if (paragraphs && philosophy) value.body = { paragraphs, philosophy };
    }
  }

  if (body.supportingMediaId !== undefined) {
    const mediaId = optionalMediaId(
      body.supportingMediaId,
      "supportingMediaId",
      errors,
    );
    if (mediaId !== undefined) value.supportingMediaId = mediaId;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function getStudioAboutRow(database: QueryDatabase = defaultDb) {
  return database
    .select()
    .from(studioAbout)
    .orderBy(asc(studioAbout.id))
    .limit(1)
    .all()[0];
}

/**
 * Creates the singleton on first write, then patches it. The route
 * validates with partial = false while no row exists, so the required
 * fields are guaranteed on insert.
 */
export async function upsertStudioAbout(
  input: Partial<StudioAboutInput>,
  database: QueryDatabase = defaultDb,
) {
  const existing = await getStudioAboutRow(database);
  if (!existing) {
    return database
      .insert(studioAbout)
      .values({
        heading: input.heading as string,
        body: input.body as StudioAboutBody,
        supportingMediaId: input.supportingMediaId ?? null,
      })
      .returning()
      .all()[0];
  }

  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (input.heading !== undefined) values.heading = input.heading;
  if (input.body !== undefined) values.body = input.body;
  if (input.supportingMediaId !== undefined)
    values.supportingMediaId = input.supportingMediaId;

  return database
    .update(studioAbout)
    .set(values)
    .where(eq(studioAbout.id, existing.id))
    .returning()
    .all()[0];
}

/* ---------------- Team members ---------------- */

export interface TeamMemberInput {
  name: string;
  roleTitle: string;
  photoMediaId: number | null;
  bio: string | null;
  sortOrder: number;
  status: ContentStatusValue;
  visibility: VisibilityValue;
}

export function validateTeamMemberInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult<TeamMemberInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<TeamMemberInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) errors.push(`${key} is required.`);
  };
  requireOnCreate("name");
  requireOnCreate("roleTitle");

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name))
      errors.push("name must be a non-empty string.");
    else if (body.name.trim().length > 160)
      errors.push("name must be 160 characters or fewer.");
    else value.name = body.name.trim();
  }
  if (body.roleTitle !== undefined) {
    if (!isNonEmptyString(body.roleTitle))
      errors.push("roleTitle must be a non-empty string.");
    else if (body.roleTitle.trim().length > 120)
      errors.push("roleTitle must be 120 characters or fewer.");
    else value.roleTitle = body.roleTitle.trim();
  }
  if (body.photoMediaId !== undefined) {
    const mediaId = optionalMediaId(body.photoMediaId, "photoMediaId", errors);
    if (mediaId !== undefined) value.photoMediaId = mediaId;
  }
  if (body.bio !== undefined) {
    const bio = optionalText(body.bio, "bio", 1000, errors);
    if (bio !== undefined) value.bio = bio;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = optionalSortOrder(body.sortOrder, errors);
    if (sortOrder !== undefined) value.sortOrder = sortOrder;
  }
  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as ContentStatusValue))
      errors.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    else value.status = body.status as ContentStatusValue;
  }
  if (body.visibility !== undefined) {
    if (!PUBLISH_VISIBILITIES.includes(body.visibility as VisibilityValue))
      errors.push(
        `visibility must be one of: ${PUBLISH_VISIBILITIES.join(", ")}.`,
      );
    else value.visibility = body.visibility as VisibilityValue;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllTeamMembers(database: QueryDatabase = defaultDb) {
  return database
    .select()
    .from(teamMembers)
    .orderBy(asc(teamMembers.sortOrder), asc(teamMembers.id))
    .all();
}

export async function getTeamMemberById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return database
    .select()
    .from(teamMembers)
    .where(eq(teamMembers.id, id))
    .limit(1)
    .all()[0];
}

export async function createTeamMember(
  input: TeamMemberInput,
  database: QueryDatabase = defaultDb,
) {
  return database
    .insert(teamMembers)
    .values({
      name: input.name,
      roleTitle: input.roleTitle,
      photoMediaId: input.photoMediaId,
      bio: input.bio,
      sortOrder: input.sortOrder,
      status: input.status,
      visibility: input.visibility,
    })
    .returning()
    .all()[0];
}

export async function updateTeamMember(
  id: number,
  patch: Partial<TeamMemberInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.roleTitle !== undefined) values.roleTitle = patch.roleTitle;
  if (patch.photoMediaId !== undefined) values.photoMediaId = patch.photoMediaId;
  if (patch.bio !== undefined) values.bio = patch.bio;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.visibility !== undefined) values.visibility = patch.visibility;

  return database
    .update(teamMembers)
    .set(values)
    .where(eq(teamMembers.id, id))
    .returning()
    .all()[0];
}

export async function deleteTeamMember(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = database
    .delete(teamMembers)
    .where(eq(teamMembers.id, id))
    .returning({ id: teamMembers.id })
    .all()[0];
  return Boolean(deleted);
}

/* ---------------- Clients ---------------- */

export interface StudioClientInput {
  name: string;
  logoMediaId: number | null;
  website: string | null;
  featured: boolean;
  sortOrder: number;
  status: ContentStatusValue;
}

export function validateStudioClientInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult<StudioClientInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<StudioClientInput> = {};

  if (!partial && body.name === undefined) errors.push("name is required.");

  if (body.name !== undefined) {
    if (!isNonEmptyString(body.name))
      errors.push("name must be a non-empty string.");
    else if (body.name.trim().length > 160)
      errors.push("name must be 160 characters or fewer.");
    else value.name = body.name.trim();
  }
  if (body.logoMediaId !== undefined) {
    const mediaId = optionalMediaId(body.logoMediaId, "logoMediaId", errors);
    if (mediaId !== undefined) value.logoMediaId = mediaId;
  }
  if (body.website !== undefined) {
    const website = optionalUrl(body.website, "website", 300, errors);
    if (website !== undefined) value.website = website;
  }
  if (body.featured !== undefined) {
    if (typeof body.featured !== "boolean")
      errors.push("featured must be a boolean.");
    else value.featured = body.featured;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = optionalSortOrder(body.sortOrder, errors);
    if (sortOrder !== undefined) value.sortOrder = sortOrder;
  }
  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as ContentStatusValue))
      errors.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    else value.status = body.status as ContentStatusValue;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllClients(database: QueryDatabase = defaultDb) {
  return database
    .select()
    .from(clients)
    .orderBy(asc(clients.sortOrder), asc(clients.id))
    .all();
}

export async function getClientById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return database
    .select()
    .from(clients)
    .where(eq(clients.id, id))
    .limit(1)
    .all()[0];
}

export async function createClient(
  input: StudioClientInput,
  database: QueryDatabase = defaultDb,
) {
  return database
    .insert(clients)
    .values({
      name: input.name,
      logoMediaId: input.logoMediaId,
      website: input.website,
      featured: input.featured,
      sortOrder: input.sortOrder,
      status: input.status,
    })
    .returning()
    .all()[0];
}

export async function updateClient(
  id: number,
  patch: Partial<StudioClientInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.logoMediaId !== undefined) values.logoMediaId = patch.logoMediaId;
  if (patch.website !== undefined) values.website = patch.website;
  if (patch.featured !== undefined) values.featured = patch.featured;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;

  return database
    .update(clients)
    .set(values)
    .where(eq(clients.id, id))
    .returning()
    .all()[0];
}

export async function deleteClient(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = database
    .delete(clients)
    .where(eq(clients.id, id))
    .returning({ id: clients.id })
    .all()[0];
  return Boolean(deleted);
}

/* ---------------- Recognition ---------------- */

export interface RecognitionInput {
  title: string;
  organization: string | null;
  year: number;
  url: string | null;
  recognitionType: RecognitionTypeValue;
  description: string | null;
  sortOrder: number;
  status: ContentStatusValue;
}

export function validateRecognitionInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult<RecognitionInput> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<RecognitionInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) errors.push(`${key} is required.`);
  };
  requireOnCreate("title");
  requireOnCreate("year");
  requireOnCreate("recognitionType");

  if (body.title !== undefined) {
    if (!isNonEmptyString(body.title))
      errors.push("title must be a non-empty string.");
    else if (body.title.trim().length > 200)
      errors.push("title must be 200 characters or fewer.");
    else value.title = body.title.trim();
  }
  if (body.organization !== undefined) {
    const organization = optionalText(
      body.organization,
      "organization",
      160,
      errors,
    );
    if (organization !== undefined) value.organization = organization;
  }
  if (body.year !== undefined) {
    if (
      !Number.isInteger(body.year) ||
      (body.year as number) < 1900 ||
      (body.year as number) > 2100
    )
      errors.push("year must be an integer between 1900 and 2100.");
    else value.year = body.year as number;
  }
  if (body.url !== undefined) {
    const url = optionalUrl(body.url, "url", 500, errors);
    if (url !== undefined) value.url = url;
  }
  if (body.recognitionType !== undefined) {
    if (!RECOGNITION_TYPES.includes(body.recognitionType as RecognitionTypeValue))
      errors.push(
        `recognitionType must be one of: ${RECOGNITION_TYPES.join(", ")}.`,
      );
    else value.recognitionType = body.recognitionType as RecognitionTypeValue;
  }
  if (body.description !== undefined) {
    const description = optionalText(
      body.description,
      "description",
      1000,
      errors,
    );
    if (description !== undefined) value.description = description;
  }
  if (body.sortOrder !== undefined) {
    const sortOrder = optionalSortOrder(body.sortOrder, errors);
    if (sortOrder !== undefined) value.sortOrder = sortOrder;
  }
  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as ContentStatusValue))
      errors.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    else value.status = body.status as ContentStatusValue;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllRecognition(database: QueryDatabase = defaultDb) {
  return database
    .select()
    .from(recognition)
    .orderBy(
      desc(recognition.year),
      asc(recognition.sortOrder),
      asc(recognition.id),
    )
    .all();
}

export async function getRecognitionById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return database
    .select()
    .from(recognition)
    .where(eq(recognition.id, id))
    .limit(1)
    .all()[0];
}

export async function createRecognition(
  input: RecognitionInput,
  database: QueryDatabase = defaultDb,
) {
  return database
    .insert(recognition)
    .values({
      title: input.title,
      organization: input.organization,
      year: input.year,
      url: input.url,
      recognitionType: input.recognitionType,
      description: input.description,
      sortOrder: input.sortOrder,
      status: input.status,
    })
    .returning()
    .all()[0];
}

export async function updateRecognition(
  id: number,
  patch: Partial<RecognitionInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.organization !== undefined) values.organization = patch.organization;
  if (patch.year !== undefined) values.year = patch.year;
  if (patch.url !== undefined) values.url = patch.url;
  if (patch.recognitionType !== undefined)
    values.recognitionType = patch.recognitionType;
  if (patch.description !== undefined) values.description = patch.description;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;

  return database
    .update(recognition)
    .set(values)
    .where(eq(recognition.id, id))
    .returning()
    .all()[0];
}

export async function deleteRecognition(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = database
    .delete(recognition)
    .where(eq(recognition.id, id))
    .returning({ id: recognition.id })
    .all()[0];
  return Boolean(deleted);
}
