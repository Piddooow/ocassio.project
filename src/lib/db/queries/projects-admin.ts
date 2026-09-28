import { asc, desc, eq, sql } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  CONTENT_STATUSES,
  PUBLISH_VISIBILITIES,
  WORK_CATEGORIES,
  projectMedia,
  projects,
  type ProjectCreditEntry,
} from "@/lib/db/schema";
import { statusForAction, validatePublishAction } from "./publishing";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for portfolio projects (§11, §12). Transport-agnostic:
 * routes own authentication, HTTP statuses, version snapshots, and the
 * activity log.
 */

export type WorkCategory = (typeof WORK_CATEGORIES)[number];

export interface ProjectInput {
  title: string;
  slug: string;
  client?: string | null;
  projectType: string;
  category: WorkCategory;
  year: number;
  projectDate: string;
  location?: string | null;
  shortDescription: string;
  coverMediaId?: number | null;
  heroMediaId?: number | null;
  seoMetaTitle?: string | null;
  seoMetaDescription?: string | null;
  seoOgMediaId?: number | null;
  credits?: ProjectCreditEntry[];
  relatedSlugs?: string[];
  visibility?: (typeof PUBLISH_VISIBILITIES)[number];
  /** Attached uploads (media_assets ids); replaces the whole set. */
  mediaIds?: number[];
}

export type ProjectUpdateInput = Partial<ProjectInput>;

export type ProjectValidation =
  | { ok: true; value: ProjectUpdateInput }
  | { ok: false; issues: string[] };

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateProjectInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ProjectValidation {
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
  requireText("projectType", 60);
  requireText("shortDescription", 400);

  if (body.slug !== undefined || !partial) {
    const slug = body.slug;
    if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
      issues.push(
        "slug must be lowercase words separated by dashes (e.g. dean-and-deb).",
      );
    } else {
      value.slug = slug;
    }
  }

  if (body.category !== undefined || !partial) {
    const category = body.category;
    if (
      typeof category !== "string" ||
      !(WORK_CATEGORIES as readonly string[]).includes(category)
    ) {
      issues.push(`category must be one of: ${WORK_CATEGORIES.join(", ")}.`);
    } else {
      value.category = category;
    }
  }

  if (body.year !== undefined || !partial) {
    const year = body.year;
    if (
      typeof year !== "number" ||
      !Number.isInteger(year) ||
      year < 1900 ||
      year > 2100
    ) {
      issues.push("year must be an integer between 1900 and 2100.");
    } else {
      value.year = year;
    }
  }

  if (body.projectDate !== undefined || !partial) {
    const date = body.projectDate;
    if (
      typeof date !== "string" ||
      !DATE_PATTERN.test(date) ||
      Number.isNaN(Date.parse(date))
    ) {
      issues.push("projectDate must be an ISO date like 2026-07-26.");
    } else {
      value.projectDate = date;
    }
  }

  const readNullableText = (key: string, max: number) => {
    const field = body[key];
    if (field === undefined) return;
    if (field === null || field === "") {
      value[key] = null;
      return;
    }
    if (typeof field !== "string" || field.trim().length > max) {
      issues.push(`${key} must be a string of ${max} characters or fewer.`);
      return;
    }
    value[key] = field.trim();
  };
  readNullableText("client", 120);
  readNullableText("location", 120);
  readNullableText("seoMetaTitle", 160);
  readNullableText("seoMetaDescription", 320);

  const readNullableId = (key: string) => {
    const field = body[key];
    if (field === undefined) return;
    if (field === null) {
      value[key] = null;
      return;
    }
    if (typeof field !== "number" || !Number.isInteger(field) || field <= 0) {
      issues.push(`${key} must be a positive integer or null.`);
      return;
    }
    value[key] = field;
  };
  readNullableId("coverMediaId");
  readNullableId("heroMediaId");
  readNullableId("seoOgMediaId");

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

  if (body.credits !== undefined) {
    if (!Array.isArray(body.credits)) {
      issues.push("credits must be an array of { role, name }.");
    } else if (body.credits.length > 30) {
      issues.push("credits must carry 30 entries or fewer.");
    } else {
      const credits: ProjectCreditEntry[] = [];
      for (const entry of body.credits) {
        if (typeof entry !== "object" || entry === null) {
          issues.push("credits entries must be objects.");
          break;
        }
        const candidate = entry as Record<string, unknown>;
        const role =
          typeof candidate.role === "string" ? candidate.role.trim() : "";
        const name =
          typeof candidate.name === "string" ? candidate.name.trim() : "";
        if (!role || role.length > 60 || !name || name.length > 120) {
          issues.push(
            "credits entries need a role (1-60) and a name (1-120).",
          );
          break;
        }
        credits.push({ role, name });
      }
      if (issues.length === 0) value.credits = credits;
    }
  }

  if (body.relatedSlugs !== undefined) {
    if (!Array.isArray(body.relatedSlugs)) {
      issues.push("relatedSlugs must be an array of project slugs.");
    } else if (body.relatedSlugs.length > 12) {
      issues.push("relatedSlugs must carry 12 entries or fewer.");
    } else {
      const slugs: string[] = [];
      let valid = true;
      for (const candidate of body.relatedSlugs) {
        if (typeof candidate !== "string" || !SLUG_PATTERN.test(candidate)) {
          issues.push("relatedSlugs entries must be project slugs.");
          valid = false;
          break;
        }
        slugs.push(candidate);
      }
      if (valid) value.relatedSlugs = slugs;
    }
  }

  if (body.mediaIds !== undefined) {
    if (!Array.isArray(body.mediaIds)) {
      issues.push("mediaIds must be an array of media asset ids.");
    } else if (body.mediaIds.length > 200) {
      issues.push("mediaIds must carry 200 entries or fewer.");
    } else {
      const ids: number[] = [];
      let valid = true;
      for (const candidate of body.mediaIds) {
        if (typeof candidate !== "number" || !Number.isInteger(candidate) || candidate <= 0) {
          issues.push("mediaIds entries must be positive integers.");
          valid = false;
          break;
        }
        if (!ids.includes(candidate)) ids.push(candidate);
      }
      if (valid) value.mediaIds = ids;
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (partial && Object.keys(value).length === 0) {
    return { ok: false, issues: ["Provide at least one field to update."] };
  }
  return { ok: true, value: value as ProjectUpdateInput };
}

/* ---------------- Reads ---------------- */

export async function listAllProjects(database: QueryDatabase = defaultDb) {
  return await database
    .select({
      id: projects.id,
      title: projects.title,
      slug: projects.slug,
      client: projects.client,
      category: projects.category,
      year: projects.year,
      projectDate: projects.projectDate,
      status: projects.status,
      visibility: projects.visibility,
      publishAt: projects.publishAt,
      updatedAt: projects.updatedAt,
      mediaCount: sql<number>`(
        SELECT COUNT(*) FROM project_media WHERE project_media.project_id = ${projects.id}
      )`,
    })
    .from(projects)
    .orderBy(desc(projects.updatedAt), desc(projects.id))
    .all();
}

export async function getProjectRowById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1)
    .get();
}

export async function findProjectBySlug(
  slug: string,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
    .get();
}

export async function getProjectMediaRows(
  projectId: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(projectMedia)
    .where(eq(projectMedia.projectId, projectId))
    .orderBy(asc(projectMedia.sortOrder), asc(projectMedia.id))
    .all();
}

export interface ProjectAdminDetail {
  project: typeof projects.$inferSelect;
  media: (typeof projectMedia.$inferSelect)[];
}

export async function getProjectAdminDetail(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<ProjectAdminDetail | null> {
  const project = await getProjectRowById(id, database);
  if (!project) return null;
  const media = await getProjectMediaRows(id, database);
  return { project, media };
}

/* ---------------- Mutations ---------------- */

async function replaceMedia(
  projectId: number,
  mediaIds: number[],
  database: QueryDatabase,
): Promise<void> {
  await database
    .delete(projectMedia)
    .where(eq(projectMedia.projectId, projectId))
    .run();
  for (const [index, mediaId] of mediaIds.entries()) {
    await database
      .insert(projectMedia)
      .values({ projectId, mediaId, sortOrder: index })
      .run();
  }
}

function columnValues(input: ProjectUpdateInput) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (input.title !== undefined) values.title = input.title;
  if (input.slug !== undefined) values.slug = input.slug;
  if (input.client !== undefined) values.client = input.client;
  if (input.projectType !== undefined) values.projectType = input.projectType;
  if (input.category !== undefined) values.category = input.category;
  if (input.year !== undefined) values.year = input.year;
  if (input.projectDate !== undefined) values.projectDate = input.projectDate;
  if (input.location !== undefined) values.location = input.location;
  if (input.shortDescription !== undefined) {
    values.shortDescription = input.shortDescription;
  }
  if (input.coverMediaId !== undefined) values.coverMediaId = input.coverMediaId;
  if (input.heroMediaId !== undefined) values.heroMediaId = input.heroMediaId;
  if (input.seoMetaTitle !== undefined) values.seoMetaTitle = input.seoMetaTitle;
  if (input.seoMetaDescription !== undefined) {
    values.seoMetaDescription = input.seoMetaDescription;
  }
  if (input.seoOgMediaId !== undefined) values.seoOgMediaId = input.seoOgMediaId;
  if (input.credits !== undefined) values.credits = input.credits;
  if (input.relatedSlugs !== undefined) values.relatedSlugs = input.relatedSlugs;
  if (input.visibility !== undefined) values.visibility = input.visibility;
  return values;
}

export async function createProject(
  input: ProjectInput,
  database: QueryDatabase = defaultDb,
): Promise<
  | { ok: true; detail: ProjectAdminDetail }
  | { ok: false; status: 409; issues: string[] }
> {
  const duplicate = await findProjectBySlug(input.slug, database);
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      issues: [`Slug already in use: ${input.slug}.`],
    };
  }

  const row = await database
    .insert(projects)
    .values({
      title: input.title,
      slug: input.slug,
      client: input.client ?? null,
      projectType: input.projectType,
      category: input.category,
      year: input.year,
      projectDate: input.projectDate,
      location: input.location ?? null,
      shortDescription: input.shortDescription,
      coverMediaId: input.coverMediaId ?? null,
      heroMediaId: input.heroMediaId ?? null,
      credits: input.credits ?? [],
      relatedSlugs: input.relatedSlugs ?? [],
      seoMetaTitle: input.seoMetaTitle ?? null,
      seoMetaDescription: input.seoMetaDescription ?? null,
      seoOgMediaId: input.seoOgMediaId ?? null,
      status: "draft",
      visibility: input.visibility ?? "public",
      updatedAt: new Date(),
    })
    .returning()
    .get();

  if (input.mediaIds?.length) {
    replaceMedia(row.id, input.mediaIds, database);
  }

  const detail = await getProjectAdminDetail(row.id, database);
  if (!detail) {
    return {
      ok: false,
      status: 409,
      issues: ["Project could not be read back."],
    };
  }
  return { ok: true, detail };
}

export async function updateProject(
  id: number,
  patch: ProjectUpdateInput,
  database: QueryDatabase = defaultDb,
): Promise<
  | { ok: true; detail: ProjectAdminDetail }
  | { ok: false; status: 404 | 409; issues: string[] }
> {
  const existing = await getProjectRowById(id, database);
  if (!existing) {
    return { ok: false, status: 404, issues: [`Project not found: ${id}.`] };
  }
  if (patch.slug && patch.slug !== existing.slug) {
    const duplicate = await findProjectBySlug(patch.slug, database);
    if (duplicate && duplicate.id !== id) {
      return {
        ok: false,
        status: 409,
        issues: [`Slug already in use: ${patch.slug}.`],
      };
    }
  }

  await database
    .update(projects)
    .set(columnValues(patch))
    .where(eq(projects.id, id))
    .run();
  if (patch.mediaIds !== undefined) {
    replaceMedia(id, patch.mediaIds, database);
  }

  const detail = await getProjectAdminDetail(id, database);
  if (!detail) {
    return { ok: false, status: 404, issues: [`Project not found: ${id}.`] };
  }
  return { ok: true, detail };
}

export async function deleteProjectGuarded(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<
  | { ok: true }
  | { ok: false; status: 404 | 409; issues: string[] }
> {
  const existing = await getProjectRowById(id, database);
  if (!existing) {
    return { ok: false, status: 404, issues: [`Project not found: ${id}.`] };
  }
  if (existing.status !== "archived") {
    return {
      ok: false,
      status: 409,
      issues: ["Archive the project before deleting it permanently."],
    };
  }
  database.delete(projects).where(eq(projects.id, id)).run();
  return { ok: true };
}

/* ---------------- Publish workflow (§24, §11 gate) ---------------- */

export const PROJECT_ACTIONS = [
  "publish",
  "unpublish",
  "schedule",
  "archive",
  "save_draft",
] as const;

export type ProjectAction = (typeof PROJECT_ACTIONS)[number];

export type ProjectActionValidation =
  | { ok: true; action: ProjectAction; publishAt: string | null }
  | { ok: false; issues: string[] };

export function validateProjectAction(raw: unknown): ProjectActionValidation {
  const validated = validatePublishAction(raw, { allowSchedule: true });
  if (!validated.ok) return { ok: false, issues: validated.issues };
  return {
    ok: true,
    action: validated.action as ProjectAction,
    publishAt: validated.publishAt,
  };
}

/** §13 gate: the documented editorial fields must exist before publish. */
export function projectPublishIssues(row: {
  title: string;
  category: string;
  year: number;
  projectDate: string;
  shortDescription: string;
}): string[] {
  const issues: string[] = [];
  if (!row.title.trim()) issues.push("Title is required.");
  if (!row.category.trim()) issues.push("Category is required.");
  if (!row.year) issues.push("Year is required.");
  if (!row.projectDate.trim()) issues.push("Project date is required.");
  if (!row.shortDescription.trim()) {
    issues.push("Short description is required.");
  }
  return issues;
}

export type ProjectActionResult =
  | { ok: true; row: typeof projects.$inferSelect }
  | { ok: false; status: 404 | 422; issues: string[] };

export async function applyProjectAction(
  id: number,
  action: ProjectAction,
  publishAt: string | null,
  database: QueryDatabase = defaultDb,
): Promise<ProjectActionResult> {
  const row = await getProjectRowById(id, database);
  if (!row) {
    return { ok: false, status: 404, issues: [`Project not found: ${id}.`] };
  }
  if (action === "publish" || action === "schedule") {
    const issues = projectPublishIssues(row);
    if (issues.length > 0) {
      return { ok: false, status: 422, issues };
    }
  }

  const resolved = statusForAction(action, publishAt);
  const updated = await database
    .update(projects)
    .set({
      status: resolved.status,
      publishAt: resolved.publishAt,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning()
    .get();

  return { ok: true, row: updated };
}

export { CONTENT_STATUSES };
