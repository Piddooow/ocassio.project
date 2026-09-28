import { cookies } from "next/headers";
import type { User } from "@/lib/db/schema";
import { getSessionUserByToken, SESSION_COOKIE } from "./sessions";

/**
 * Session read for server components (the admin layouts): validates
 * the httpOnly cookie against the sessions table.
 */
export async function getServerSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUserByToken(token);
}
