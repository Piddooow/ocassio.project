import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import {
  CONTENT_STATUSES,
  legalPages,
  type LegalContentBlock,
} from "@/lib/db/schema";
import { statusForAction, validatePublishAction } from "./publishing";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for legal pages (§9.4). Transport-agnostic: routes own
 * authentication and HTTP statuses.
 */

export interface LegalUpdateInput {
  title?: string;
  body?: LegalContentBlock[];
  updatedDate?: string;
  status?: (typeof CONTENT_STATUSES)[number];
}

export type LegalValidation =
  | { ok: true; value: LegalUpdateInput }
  | { ok: false; issues: string[] };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateLegalUpdate(raw: unknown): LegalValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, issues: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const issues: string[] = [];
  const value: LegalUpdateInput = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length === 0) {
      issues.push("title must be a non-empty string.");
    } else if (body.title.trim().length > 160) {
      issues.push("title must be 160 characters or fewer.");
    } else {
      value.title = body.title.trim();
    }
  }

  if (body.body !== undefined) {
    if (!Array.isArray(body.body)) {
      issues.push("body must be an array of heading and paragraph blocks.");
    } else {
      const blocks: LegalContentBlock[] = [];
      body.body.forEach((block, index) => {
        if (typeof block !== "object" || block === null) {
          issues.push(`body[${index}] must be an object.`);
          return;
        }
        const candidate = block as Record<string, unknown>;
        if (candidate.type !== "heading" && candidate.type !== "paragraph") {
          issues.push(
            `body[${index}].type must be "heading" or "paragraph".`,
          );
          return;
        }
        if (
          typeof candidate.text !== "string" ||
          candidate.text.trim().length === 0
        ) {
          issues.push(`body[${index}].text must be a non-empty string.`);
          return;
        }
        if (candidate.text.trim().length > 5000) {
          issues.push(`body[${index}].text must be 5000 characters or fewer.`);
          return;
        }
        blocks.push({
          type: candidate.type,
          text: candidate.text.trim(),
        });
      });
      if (blocks.length === 0) {
        issues.push("body must contain at least one block.");
      } else if (issues.length === 0) {
        value.body = blocks;
      }
    }
  }

  if (body.updatedDate !== undefined) {
    if (
      typeof body.updatedDate !== "string" ||
      !DATE_PATTERN.test(body.updatedDate) ||
      Number.isNaN(Date.parse(body.updatedDate))
    ) {
      issues.push("updatedDate must be an ISO date like 2026-01-15.");
    } else {
      value.updatedDate = body.updatedDate;
    }
  }

  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as (typeof CONTENT_STATUSES)[number])) {
      issues.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    } else {
      value.status = body.status as (typeof CONTENT_STATUSES)[number];
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (Object.keys(value).length === 0) {
    return { ok: false, issues: ["Provide at least one field to update."] };
  }
  return { ok: true, value };
}

export async function listAllLegalPages(
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(legalPages)
    .orderBy(asc(legalPages.slug))
    .all();
}

export async function getLegalPageRow(
  slug: string,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(legalPages)
    .where(eq(legalPages.slug, slug))
    .limit(1)
    .get();
}

export async function updateLegalPage(
  slug: string,
  patch: LegalUpdateInput,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.body !== undefined) values.body = patch.body;
  if (patch.updatedDate !== undefined) values.updatedDate = patch.updatedDate;
  if (patch.status !== undefined) values.status = patch.status;

  return await database
    .update(legalPages)
    .set(values)
    .where(eq(legalPages.slug, slug))
    .returning()
    .get();
}

/* ---------------- Publish workflow (§24, §11 gate) ---------------- */

export const LEGAL_ACTIONS = [
  "publish",
  "unpublish",
  "schedule",
  "archive",
  "save_draft",
] as const;

export type LegalAction = (typeof LEGAL_ACTIONS)[number];

export type LegalActionValidation =
  | { ok: true; action: LegalAction; publishAt: string | null }
  | { ok: false; issues: string[] };

export function validateLegalAction(raw: unknown): LegalActionValidation {
  const validated = validatePublishAction(raw, { allowSchedule: true });
  if (!validated.ok) return { ok: false, issues: validated.issues };
  return {
    ok: true,
    action: validated.action as LegalAction,
    publishAt: validated.publishAt,
  };
}

/** The §11 publish gate: everything required must be present. */
export function legalPublishIssues(row: {
  title: string;
  body: { type: "heading" | "paragraph"; text: string }[] | null;
  updatedDate: string;
}): string[] {
  const issues: string[] = [];
  if (!row.title.trim()) issues.push("Title is required.");
  const blocks = row.body ?? [];
  if (blocks.length === 0) {
    issues.push("At least one content block is required.");
  } else if (!blocks.some((block) => block.type === "paragraph")) {
    issues.push("At least one paragraph block is required.");
  }
  if (!row.updatedDate.trim()) issues.push("Updated date is required.");
  return issues;
}

export type LegalActionResult =
  | { ok: true; row: typeof legalPages.$inferSelect }
  | { ok: false; status: 404 | 422; issues: string[] };

export async function applyLegalAction(
  slug: string,
  action: LegalAction,
  publishAt: string | null,
  database: QueryDatabase = defaultDb,
): Promise<LegalActionResult> {
  const row = await getLegalPageRow(slug, database);
  if (!row) {
    return { ok: false, status: 404, issues: [`Legal page not found: ${slug}.`] };
  }

  if (action === "publish" || action === "schedule") {
    const issues = legalPublishIssues(row);
    if (issues.length > 0) {
      return { ok: false, status: 422, issues };
    }
  }

  const resolved = statusForAction(action, publishAt);
  const values: Record<string, unknown> = {
    status: resolved.status,
    publishAt: resolved.publishAt,
    updatedAt: new Date(),
  };

  const updated = await database
    .update(legalPages)
    .set(values)
    .where(eq(legalPages.id, row.id))
    .returning()
    .get();

  return { ok: true, row: updated };
}
