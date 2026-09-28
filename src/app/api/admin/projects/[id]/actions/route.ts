import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  applyProjectAction,
  validateProjectAction,
} from "@/lib/db/queries/projects-admin";

/**
 * Project publish workflow (§24).
 * POST /api/admin/projects/[id]/actions  body: { action, publishAt? }
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
      { error: `Invalid project id: ${rawId}.` },
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

  const validated = validateProjectAction(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await applyProjectAction(
    id,
    validated.action,
    validated.publishAt,
  );
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
    entityType: "project",
    entityId: id,
    summary: `Project #${id} ${validated.action}.`,
  });
  return NextResponse.json({ data: result.row });
}
