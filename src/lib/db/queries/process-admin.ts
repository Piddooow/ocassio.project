import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { PROCESS_STEP_STATUSES, processSteps } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin CRUD for Process steps (§16). Transport-agnostic; the admin
 * routes own authentication and HTTP statuses.
 */

export type ProcessStepStatusValue = (typeof PROCESS_STEP_STATUSES)[number];

export interface ProcessStepInput {
  stepNumber: number;
  title: string;
  explanation: string;
  sortOrder: number;
  status: ProcessStepStatusValue;
}

export type ValidationResult =
  | { ok: true; value: Partial<ProcessStepInput> }
  | { ok: false; errors: string[] };

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function validateProcessStepInput(
  raw: unknown,
  { partial }: { partial: boolean },
): ValidationResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: Partial<ProcessStepInput> = {};

  const requireOnCreate = (key: string) => {
    if (!partial && body[key] === undefined) errors.push(`${key} is required.`);
  };
  requireOnCreate("stepNumber");
  requireOnCreate("title");
  requireOnCreate("explanation");

  if (body.stepNumber !== undefined) {
    if (
      !Number.isInteger(body.stepNumber) ||
      (body.stepNumber as number) < 1 ||
      (body.stepNumber as number) > 99
    )
      errors.push("stepNumber must be an integer between 1 and 99.");
    else value.stepNumber = body.stepNumber as number;
  }
  if (body.title !== undefined) {
    if (!isNonEmptyString(body.title))
      errors.push("title must be a non-empty string.");
    else if (body.title.trim().length > 160)
      errors.push("title must be 160 characters or fewer.");
    else value.title = body.title.trim();
  }
  if (body.explanation !== undefined) {
    if (!isNonEmptyString(body.explanation))
      errors.push("explanation must be a non-empty string.");
    else if (body.explanation.trim().length > 500)
      errors.push("explanation must be 500 characters or fewer.");
    else value.explanation = body.explanation.trim();
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || (body.sortOrder as number) < 0)
      errors.push("sortOrder must be a non-negative integer.");
    else value.sortOrder = body.sortOrder as number;
  }
  if (body.status !== undefined) {
    if (
      !PROCESS_STEP_STATUSES.includes(body.status as ProcessStepStatusValue)
    )
      errors.push(
        `status must be one of: ${PROCESS_STEP_STATUSES.join(", ")}.`,
      );
    else value.status = body.status as ProcessStepStatusValue;
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value };
}

export async function listAllProcessSteps(
  database: QueryDatabase = defaultDb,
) {
  return database
    .select()
    .from(processSteps)
    .orderBy(asc(processSteps.sortOrder), asc(processSteps.id))
    .all();
}

export async function getProcessStepById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return database
    .select()
    .from(processSteps)
    .where(eq(processSteps.id, id))
    .limit(1)
    .all()[0];
}

export async function createProcessStep(
  input: ProcessStepInput,
  database: QueryDatabase = defaultDb,
) {
  return database
    .insert(processSteps)
    .values({
      stepNumber: input.stepNumber,
      title: input.title,
      explanation: input.explanation,
      sortOrder: input.sortOrder,
      status: input.status,
    })
    .returning()
    .all()[0];
}

export async function updateProcessStep(
  id: number,
  patch: Partial<ProcessStepInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.stepNumber !== undefined) values.stepNumber = patch.stepNumber;
  if (patch.title !== undefined) values.title = patch.title;
  if (patch.explanation !== undefined) values.explanation = patch.explanation;
  if (patch.sortOrder !== undefined) values.sortOrder = patch.sortOrder;
  if (patch.status !== undefined) values.status = patch.status;

  return database
    .update(processSteps)
    .set(values)
    .where(eq(processSteps.id, id))
    .returning()
    .all()[0];
}

export async function deleteProcessStep(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  const deleted = database
    .delete(processSteps)
    .where(eq(processSteps.id, id))
    .returning({ id: processSteps.id })
    .all()[0];
  return Boolean(deleted);
}
