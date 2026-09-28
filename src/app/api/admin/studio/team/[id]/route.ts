import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { deleteProtectionIssues } from "@/lib/db/queries/publishing";
import {
  deleteTeamMember,
  getTeamMemberById,
  updateTeamMember,
  validateTeamMemberInput,
} from "@/lib/db/queries/studio-admin";

/**
 * Admin Studio team member by id.
 * PATCH  /api/admin/studio/team/[id] -> partial update
 * DELETE /api/admin/studio/team/[id] -> remove
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid member id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getTeamMemberById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Member not found: ${id}.` },
      { status: 404 },
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

  const validated = validateTeamMemberInput(body, { partial: true });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const updated = await updateTeamMember(id, validated.value);
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid member id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getTeamMemberById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Member not found: ${id}.` },
      { status: 404 },
    );
  }

  const issues = deleteProtectionIssues(existing);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete. Resolve the issues.", issues },
      { status: 409 },
    );
  }

  await deleteTeamMember(id);
  return NextResponse.json({ data: { id, deleted: true } });
}
