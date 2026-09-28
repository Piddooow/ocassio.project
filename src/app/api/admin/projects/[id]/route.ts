import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  deleteProjectGuarded,
  getProjectAdminDetail,
  updateProject,
  validateProjectInput,
} from "@/lib/db/queries/projects-admin";

/**
 * Admin project by id (§12).
 * GET    /api/admin/projects/[id] -> project plus attached media rows
 * PATCH  /api/admin/projects/[id] -> partial update (mediaIds replaces set)
 * DELETE /api/admin/projects/[id] -> archive-guarded permanent delete (§26)
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid project id: ${rawId}.` },
      { status: 400 },
    );
  }

  const detail = await getProjectAdminDetail(id);
  if (!detail) {
    return NextResponse.json(
      { error: `Project not found: ${id}.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: detail });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
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

  const validated = validateProjectInput(body, { partial: true });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await updateProject(id, validated.value);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Update failed.", issues: result.issues },
      { status: result.status },
    );
  }

  const snapshot = await buildVersionSnapshot("project", id);
  if (snapshot !== null) {
    await recordVersion("project", id, snapshot);
  }
  await recordActivity({
    action: "updated",
    entityType: "project",
    entityId: id,
    summary: `Project updated: ${result.detail.project.title}`,
  });

  return NextResponse.json({ data: result.detail });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid project id: ${rawId}.` },
      { status: 400 },
    );
  }

  const result = await deleteProjectGuarded(id);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.status === 404
            ? result.issues[0]
            : "Cannot delete. Resolve the issues.",
        issues: result.issues,
      },
      { status: result.status },
    );
  }
  await recordActivity({
    action: "deleted",
    entityType: "project",
    entityId: id,
    summary: `Project #${id} deleted.`,
  });
  return NextResponse.json({ data: { id, deleted: true } });
}
