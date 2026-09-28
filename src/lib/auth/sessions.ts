import { createHash, randomUUID } from "node:crypto";
import { eq, lte } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { sessions, users, type User } from "@/lib/db/schema";
import type { QueryDatabase } from "@/lib/db/queries/upcoming";

/**
 * Server-side admin sessions (§27). The database stores only the
 * SHA-256 hash of the raw cookie token; the raw token exists once, in
 * the visitor's httpOnly cookie.
 */

export const SESSION_COOKIE = "ocassio_admin_session";
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Creates a session row and returns the raw token for the cookie. */
export async function createSession(
  userId: number,
  database: QueryDatabase = defaultDb,
): Promise<string> {
  const token = `${randomUUID()}.${randomUUID()}`;
  database
    .insert(sessions)
    .values({
      id: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    })
    .run();
  return token;
}

/**
 * Validates a raw cookie token: unexpired session and an active user.
 * Synchronous so the route guards can run without ceremony; expired
 * rows are cleaned on sight.
 */
export function getSessionUserByToken(
  token: string,
  database: QueryDatabase = defaultDb,
): User | null {
  const id = hashSessionToken(token);
  const row = database
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      user: users,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1)
    .all()[0];

  if (!row) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    database.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  if (row.user.status !== "active") {
    /* Disabled accounts lose their sessions immediately. */
    database.delete(sessions).where(eq(sessions.id, id)).run();
    return null;
  }
  return row.user;
}

export async function deleteSessionByToken(
  token: string,
  database: QueryDatabase = defaultDb,
): Promise<void> {
  database.delete(sessions).where(eq(sessions.id, hashSessionToken(token))).run();
}

/** Housekeeping: removes expired sessions; returns how many went. */
export async function pruneExpiredSessions(
  database: QueryDatabase = defaultDb,
): Promise<number> {
  return database
    .delete(sessions)
    .where(lte(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id })
    .all().length;
}
