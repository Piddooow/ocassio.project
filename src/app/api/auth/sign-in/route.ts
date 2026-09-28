import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
} from "@/lib/auth/sessions";
import {
  findUserByEmail,
  markUserLogin,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth/users";

/**
 * Admin sign-in (§27).
 * POST /api/auth/sign-in  body: { email, password }
 *
 * Creates a server-side session and sets the httpOnly cookie. The
 * cookie is Secure only when the request itself is https, so local
 * development and CI over http keep working.
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const payload = (body ?? {}) as Record<string, unknown>;
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (email.length === 0 || password.length === 0) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 },
    );
  }

  const user = findUserByEmail(email);
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : false;
  if (!user || !passwordOk) {
    return NextResponse.json(
      { error: "Email or password is not correct." },
      { status: 401 },
    );
  }
  if (user.status !== "active") {
    return NextResponse.json(
      { error: "This account is disabled. Ask an owner to re-enable it." },
      { status: 403 },
    );
  }

  const token = await createSession(user.id);
  markUserLogin(user.id);

  const response = NextResponse.json({
    data: { user: toPublicUser(user) },
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: request.nextUrl.protocol === "https:",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return response;
}
