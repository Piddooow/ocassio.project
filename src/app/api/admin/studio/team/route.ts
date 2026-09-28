import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createTeamMember,
  listAllTeamMembers,
  validateTeamMemberInput,
  type TeamMemberInput,
} from "@/lib/db/queries/studio-admin";

/**
 * Admin Studio team collection.
 * GET  /api/admin/studio/team -> every member (any status/visibility)
 * POST /api/admin/studio/team -> create one member
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const team = await listAllTeamMembers();
  return NextResponse.json({
    data: team,
    meta: { total: team.length },
  });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateTeamMemberInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const created = await createTeamMember(validated.value as TeamMemberInput);
  return NextResponse.json({ data: created }, { status: 201 });
}
