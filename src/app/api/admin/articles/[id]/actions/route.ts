import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  applyArticleAction,
  validateArticleAction,
} from "@/lib/db/queries/articles-admin";

/**
 * Article publish workflow (§24).
 * POST /api/admin/articles/[id]/actions  body: { action, publishAt? }
 *
 * publish / unpublish / schedule / archive / save_draft, with the §11
 * gate: title, category, excerpt, publish date and at least one block.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: `Invalid article id: ${rawId}.` },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateArticleAction(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await applyArticleAction(id, validated.action, validated.publishAt);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.status === 404 ? result.issues[0] : "Cannot publish yet.",
        issues: result.issues,
      },
      { status: result.status },
    );
  }

  await recordActivity({
    action: validated.action,
    entityType: "article",
    entityId: id,
    summary: `Article #${id} ${validated.action}.`,
  });
  return NextResponse.json({ data: result.row });
}
