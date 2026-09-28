import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/api/admin-auth";
import { toPublicUser } from "@/lib/auth/users";

/**
 * Current admin session (§27).
 * GET /api/auth/session -> { data: { user } } or { data: { user: null } }
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  return NextResponse.json({
    data: { user: user ? toPublicUser(user) : null },
  });
}
