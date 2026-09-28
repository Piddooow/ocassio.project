import { asc, eq, ne, sql } from "drizzle-orm";
import { hash as argonHash, verify as argonVerify } from "@node-rs/argon2";
import { db as defaultDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { USER_ROLES, USER_ROLE_LABEL, type UserRole } from "./roles";
import type { QueryDatabase } from "@/lib/db/queries/upcoming";
import type { User } from "@/lib/db/schema";

/**
 * User records for the Admin CMS (§27, PRD §26.2). Passwords are hashed
 * with argon2id (@node-rs/argon2) and never leave this module. Existing
 * hashes stay valid: Bun.password and @node-rs/argon2 both write and read
 * the standard PHC argon2id format.
 */

export { USER_ROLES, USER_ROLE_LABEL };
export type { UserRole };

export const MIN_PASSWORD_LENGTH = 10;

export async function hashPassword(password: string): Promise<string> {
  return argonHash(password);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return argonVerify(hash, password);
}

/** The shape that may leave the server: no password hash, ever. */
export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "disabled";
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toPublicUser(row: User): PublicUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const PUBLIC_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  status: users.status,
  lastLoginAt: users.lastLoginAt,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

export async function findUserByEmail(
  email: string,
  database: QueryDatabase = defaultDb,
): Promise<User | undefined> {
  return await database
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1)
    .get();
}

export async function findUserById(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<User | undefined> {
  return await database
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1)
    .get();
}

export async function listUsers(
  database: QueryDatabase = defaultDb,
): Promise<PublicUser[]> {
  return await database.select(PUBLIC_COLUMNS).from(users).orderBy(asc(users.id)).all();
}

export interface UserCreateInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export async function createUser(
  input: UserCreateInput,
  database: QueryDatabase = defaultDb,
): Promise<User> {
  const passwordHash = await hashPassword(input.password);
  return await database
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    })
    .returning()
    .get();
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  role?: UserRole;
  status?: "active" | "disabled";
  password?: string;
}

export async function updateUser(
  id: number,
  patch: UserUpdateInput,
  database: QueryDatabase = defaultDb,
): Promise<User | undefined> {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.name !== undefined) values.name = patch.name;
  if (patch.email !== undefined) values.email = patch.email;
  if (patch.role !== undefined) values.role = patch.role;
  if (patch.status !== undefined) values.status = patch.status;
  if (patch.password !== undefined) {
    values.passwordHash = await hashPassword(patch.password);
  }

  return await database
    .update(users)
    .set(values)
    .where(eq(users.id, id))
    .returning()
    .get();
}

export async function markUserLogin(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<void> {
  const now = new Date();
  await database
    .update(users)
    .set({ lastLoginAt: now, updatedAt: now })
    .where(eq(users.id, id))
    .run();
}

/** Owner-lockout protection (§27): at least one active owner must remain. */
export async function countOtherActiveOwners(
  id: number,
  database: QueryDatabase = defaultDb,
): Promise<number> {
  const row = await database
    .select({ count: sql<number>`COUNT(*)` })
    .from(users)
    .where(
      sql`${users.role} = 'owner' AND ${users.status} = 'active' AND ${ne(users.id, id)}`,
    )
    .get();
  return row?.count ?? 0;
}

/**
 * Pure rule behind the lockout protection, so it can be tested apart
 * from HTTP: the last active owner cannot be demoted or disabled.
 */
export function lastOwnerLockoutIssues(
  existing: { role: string; status: string },
  patch: { role?: string; status?: string },
  otherActiveOwners: number,
): string[] {
  if (existing.role !== "owner" || existing.status !== "active") return [];
  const nextRole = patch.role ?? existing.role;
  const nextStatus = patch.status ?? existing.status;
  if (nextRole === "owner" && nextStatus === "active") return [];
  if (otherActiveOwners > 0) return [];
  return ["At least one active owner must remain."];
}
