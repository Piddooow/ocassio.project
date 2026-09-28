import { CONTENT_STATUSES } from "@/lib/db/schema";

/**
 * Shared publish workflow (§24, §38): every publishable content type
 * follows SAVE DRAFT → VALIDATE → PREVIEW → PUBLISH. Preview is served
 * by the admin read endpoints (they may return drafts); the public read
 * paths only ever return published rows. Publish gates return specific
 * issues so an attempted publish explains exactly what must be fixed
 * (§11, §13).
 */

export const PUBLISH_ACTIONS = [
  "publish",
  "unpublish",
  "schedule",
  "archive",
  "save_draft",
] as const;

export type PublishAction = (typeof PUBLISH_ACTIONS)[number];

export type PublishActionValidation =
  | { ok: true; action: PublishAction; publishAt: string | null }
  | { ok: false; issues: string[] };

/**
 * Validates a publish action payload. Types without a publish_at
 * column (services, pricing, FAQ, team, clients, recognition) pass
 * allowSchedule: false and cannot schedule (§26 entities).
 */
export function validatePublishAction(
  raw: unknown,
  { allowSchedule = true }: { allowSchedule?: boolean } = {},
): PublishActionValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, issues: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const actions: readonly string[] = allowSchedule
    ? PUBLISH_ACTIONS
    : PUBLISH_ACTIONS.filter((action) => action !== "schedule");

  const action = body.action;
  if (typeof action !== "string" || !actions.includes(action)) {
    return {
      ok: false,
      issues: [`action must be one of: ${actions.join(", ")}.`],
    };
  }

  let publishAt: string | null = null;
  if (action === "schedule") {
    if (typeof body.publishAt !== "string") {
      return {
        ok: false,
        issues: ["publishAt is required when scheduling (ISO timestamp)."],
      };
    }
    const parsed = Date.parse(body.publishAt);
    if (Number.isNaN(parsed)) {
      return {
        ok: false,
        issues: ["publishAt must be a real ISO timestamp."],
      };
    }
    if (parsed <= Date.now()) {
      return { ok: false, issues: ["publishAt must be in the future."] };
    }
    publishAt = new Date(parsed).toISOString();
  }

  return { ok: true, action: action as PublishAction, publishAt };
}

export type ContentStatusValue = (typeof CONTENT_STATUSES)[number];

/**
 * Status mapping for the workflow: publish clears any schedule,
 * schedule stores publishAt, archive parks the item in Trash, and
 * unpublish / save_draft return to draft.
 */
export function statusForAction(
  action: PublishAction,
  publishAt: string | null,
): { status: ContentStatusValue; publishAt: string | null } {
  if (action === "publish") return { status: "published", publishAt: null };
  if (action === "schedule") return { status: "scheduled", publishAt };
  if (action === "archive") return { status: "archived", publishAt: null };
  return { status: "draft", publishAt: null };
}

/**
 * Delete flow protection (§26): avoid direct permanent deletion.
 * Only archived rows may be permanently deleted; everything else must
 * follow Archive → Trash → Permanent Delete first.
 */
export function deleteProtectionIssues(row: { status: string }): string[] {
  if (row.status === "archived") return [];
  return [
    `Cannot delete a ${row.status} entry. Archive it first (Archive → Trash → Permanent Delete).`,
  ];
}

/* ---------------- Publish gates (§11: required data per type) ---------------- */

export function servicePublishIssues(row: {
  name: string;
  slug: string;
  serviceType: string;
  shortDescription: string;
}): string[] {
  const issues: string[] = [];
  if (!row.name.trim()) issues.push("Service name is required.");
  if (!row.slug.trim()) issues.push("Slug is required.");
  if (!row.serviceType.trim()) issues.push("Service type is required.");
  if (!row.shortDescription.trim())
    issues.push("Short description is required.");
  return issues;
}

export function pricingPublishIssues(row: {
  packageName: string;
  priceType: string;
  amount: number | null;
}): string[] {
  const issues: string[] = [];
  if (!row.packageName.trim()) issues.push("Package name is required.");
  if (row.priceType === "custom_quote" && row.amount !== null) {
    issues.push("Custom Quote entries must not carry an amount.");
  }
  if (
    (row.priceType === "fixed" || row.priceType === "starting_from") &&
    row.amount === null
  ) {
    issues.push(
      "A numeric amount is required for Fixed and Starting From entries.",
    );
  }
  return issues;
}

export function faqPublishIssues(row: {
  question: string;
  answer: string;
}): string[] {
  const issues: string[] = [];
  if (!row.question.trim()) issues.push("Question is required.");
  if (!row.answer.trim()) issues.push("Answer is required.");
  return issues;
}

export function teamPublishIssues(row: {
  name: string;
  roleTitle: string;
}): string[] {
  const issues: string[] = [];
  if (!row.name.trim()) issues.push("Name is required.");
  if (!row.roleTitle.trim()) issues.push("Role title is required.");
  return issues;
}

export function clientPublishIssues(row: { name: string }): string[] {
  const issues: string[] = [];
  if (!row.name.trim()) issues.push("Client name is required.");
  return issues;
}

export function recognitionPublishIssues(row: {
  title: string;
  year: number;
  recognitionType: string;
}): string[] {
  const issues: string[] = [];
  if (!row.title.trim()) issues.push("Title is required.");
  if (!Number.isInteger(row.year)) issues.push("Year is required.");
  if (!row.recognitionType.trim()) issues.push("Recognition type is required.");
  return issues;
}
