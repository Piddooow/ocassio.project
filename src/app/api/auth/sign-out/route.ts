import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readSessionCookie } from "@/lib/api/admin-auth";
import {
  deleteSessionByToken,
  SESSION_COOKIE,
} from "@/lib/auth/sessions";

/**
 * Admin sign-out (§27).
 * POST /api/auth/sign-out
 *
 * Deletes the session row and clears the cookie.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const token = readSessionCookie(request);
  if (token) {
    await deleteSessionByToken(token);
  }

  const response = NextResponse.json({ data: { signedOut: true } });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
