import { asc, eq, inArray } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { CONTENT_STATUSES, faq } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for FAQ entries (§12.4). Transport-agnostic; the admin
 * routes own authentication and HTTP statuses.
 */

export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];

export interface FaqInput {
  question: string;
  answer: string;
  sortOrder: number;
  status: ContentStatusValue;
}

export type ValidationResult =
  | { ok: true; value: Partial<FaqInput> }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function validateFaqInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<FaqInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) errors.push(`${key} is required.`);
  };
  requireOnCreate("question");
  requireOnCreate("answer");

  if (body.question !== undefined) {
    if (!isNonEmptyString(body.question))
      errors.push("question must be a non-empty string.");
    else if (body.question.trim().length > 300)
      errors.push("question must be 300 characters or fewer.");
    else value.question = body.question.trim();
  }
  if (body.answer !== undefined) {
    if (!isNonEmptyString(body.answer))
      errors.push("answer must be a non-empty string.");
    else if (body.answer.trim().length > 2000)
      errors.push("answer must be 2000 characters or fewer.");
    else value.answer = body.answer.trim();
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || (body.sortOrder as number) < 0)
      errors.push("sortOrder must be a non-negative integer.");
    else value.sortOrder = body.sortOrder as number;
  }
  if (body.status !== undefined) {
    if (!CONTENT_STATUSES.includes(body.status as ContentStatusValue))
      errors.push(`status must be one of: ${CONTENT_STATUSES.join(", ")}.`);
    else value.status = body.status as ContentStatusValue;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listFaqByIds(
  ids: number[],
  database: QueryDatabase = defaultDb,
) {
  if (ids.length === 0) return [];
  return await database.select().from(faq).where(inArray(faq.id, ids)).all();
}

export async function listAllFaq(database: QueryDatabase = defaultDb) {
  return await database
    .select()
    .from(faq)
    .orderBy(asc(faq.sortOrder), asc(faq.id))
    .all();
}

export async function getFaqById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(faq)
    .where(eq(faq.id, id))
    .limit(1)
    .get();
}

export async function createFaq(
  input: FaqInput,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .insert(faq)
    .values({
      question: input.question,
      answer: input.answer,
      sortOrder: input.sortOrder,
      status: input.status,
    })
    .returning()
    .get();
}

export async function updateFaq(
  id: number,
  patch: Partial<FaqInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.question !== undefined) values.question = patch.question;
  if (patch.answer !== undefined) values.answer = patch.answer;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;

  return await database
    .update(faq)
    .set(values)
    .where(eq(faq.id, id))
    .returning()
    .get();
}

export async function deleteFaq(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = await database
    .delete(faq)
    .where(eq(faq.id, id))
    .returning({ id: faq.id })
    .get();
  return Boolean(deleted);
}
