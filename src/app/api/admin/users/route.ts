import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { OWNER_ROLES, requireAdmin } from "@/lib/api/admin-auth";
import {
  createUser,
  findUserByEmail,
  listUsers,
  toPublicUser,
} from "@/lib/auth/users";
import { validateUserCreate } from "@/lib/auth/user-validation";

/**
 * Admin Users & Roles (§8, §27): owner-only.
 * GET  /api/admin/users -> every user (never a password hash)
 * POST /api/admin/users -> create one user
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: OWNER_ROLES });
  if (denied) return denied;

  const users = listUsers();
  return NextResponse.json({
    data: users,
    meta: { total: users.length },
  });
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request, { roles: OWNER_ROLES });
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

  const validated = validateUserCreate(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  if (findUserByEmail(validated.value.email)) {
    return NextResponse.json(
      { error: "Validation failed.", issues: ["email is already in use."] },
      { status: 400 },
    );
  }

  const created = await createUser(validated.value);
  return NextResponse.json({ data: toPublicUser(created) }, { status: 201 });
}
