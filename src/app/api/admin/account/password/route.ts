import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";
import { recordActivity } from "@/lib/db/queries/activity";
import { getServerSessionUser } from "@/lib/auth/server-session";
import { hashSessionToken, SESSION_COOKIE } from "@/lib/auth/sessions";

/**
 * Self-service password change (§27): only a real session can change its
 * own password; other sessions of the same user are revoked.
 * POST /api/admin/account/password  body: { currentPassword, newPassword }
 */
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await getServerSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "A signed-in session is required." },
      { status: 401 },
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

  const candidate = (body ?? {}) as Record<string, unknown>;
  const issues: string[] = [];
  const currentPassword =
    typeof candidate.currentPassword === "string"
      ? candidate.currentPassword
      : "";
  const newPassword =
    typeof candidate.newPassword === "string" ? candidate.newPassword : "";

  if (!currentPassword) issues.push("currentPassword is required.");
  if (newPassword.length < 10) {
    issues.push("newPassword must be at least 10 characters.");
  }
  if (newPassword.length > 200) {
    issues.push("newPassword must be 200 characters or fewer.");
  }
  if (issues.length > 0) {
    return NextResponse.json(
      { error: "Validation failed.", issues },
      { status: 400 },
    );
  }

  const valid = await Bun.password.verify(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Validation failed.", issues: ["Current password is incorrect."] },
      { status: 400 },
    );
  }

  const passwordHash = await Bun.password.hash(newPassword);
  db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .run();

  /* Revoke every other session of this user, keep the current one. */
  const currentToken = request.cookies.get(SESSION_COOKIE)?.value ?? "";
  const currentHash = currentToken ? hashSessionToken(currentToken) : "";
  db.delete(sessions)
    .where(
      currentHash
        ? and(eq(sessions.userId, user.id), ne(sessions.id, currentHash))
        : eq(sessions.userId, user.id),
    )
    .run();

  await recordActivity({
    action: "updated",
    entityType: "account",
    entityId: user.id,
    summary: "Password changed.",
    actorEmail: user.email,
  });

  return NextResponse.json({ data: { email: user.email, changed: true } });
}
