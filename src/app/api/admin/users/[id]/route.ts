import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OWNER_ROLES, requireAdmin } from "@/lib/api/admin-auth";
import {
  countOtherActiveOwners,
  findUserByEmail,
  findUserById,
  lastOwnerLockoutIssues,
  toPublicUser,
  updateUser,
} from "@/lib/auth/users";
import { validateUserUpdate } from "@/lib/auth/user-validation";

/**
 * Admin Users & Roles, one user (§27): owner-only.
 * PATCH /api/admin/users/[id]
 *
 * Owner-lockout protection: the last active owner cannot be demoted or
 * disabled. Role changes are destructive actions and should be
 * confirmed in the UI (§31.35).
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
  const denied = requireAdmin(request, { roles: OWNER_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid user id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = findUserById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `User not found: ${id}.` },
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

  const validated = validateUserUpdate(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const patch = validated.value;

  if (patch.email !== undefined && patch.email !== existing.email) {
    const clash = findUserByEmail(patch.email);
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: "Validation failed.", issues: ["email is already in use."] },
        { status: 400 },
      );
    }
  }

  const issues = lastOwnerLockoutIssues(
    existing,
    patch,
    countOtherActiveOwners(id),
  );
  if (issues.length > 0) {
    return NextResponse.json(
      { error: "Cannot remove the last active owner.", issues },
      { status: 422 },
    );
  }

  const updated = await updateUser(id, patch);
  return NextResponse.json({ data: toPublicUser(updated!) });
}
