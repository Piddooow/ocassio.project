import { asc, desc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { navigationItems } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Admin Navigation (§10.2): manage the primary menu labels, destinations,
 * order, and visibility. When no rows exist the public site falls back to
 * the documented default menu, so the table starts empty and honest.
 */

export interface NavigationInput {
  label: string;
  href: string;
  visible?: boolean;
}

export type NavigationValidation =
  | { ok: true; value: Partial<NavigationInput> }
  | { ok: false; issues: string[] };

const isUrl = (href: string) =>
  href.startsWith("/") || /^https?:\/\//i.test(href);

export function validateNavigationInput(
  raw: unknown,
  { partial }: { partial: boolean },
): NavigationValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, issues: ["Request body must be a JSON object."] };
  }
  const body = raw as Record<string, unknown>;
  const issues: string[] = [];
  const value: Record<string, unknown> = {};

  if (body.label !== undefined || !partial) {
    const label = body.label;
    if (typeof label !== "string" || label.trim().length === 0) {
      issues.push("label must be a non-empty string.");
    } else if (label.trim().length > 40) {
      issues.push("label must be 40 characters or fewer.");
    } else {
      value.label = label.trim();
    }
  }

  if (body.href !== undefined || !partial) {
    const href = body.href;
    if (typeof href !== "string" || !isUrl(href.trim())) {
      issues.push("href must be an internal path or a full https URL.");
    } else if (href.trim().length > 300) {
      issues.push("href must be 300 characters or fewer.");
    } else {
      value.href = href.trim();
    }
  }

  if (body.visible !== undefined) {
    if (typeof body.visible !== "boolean") {
      issues.push("visible must be a boolean.");
    } else {
      value.visible = body.visible;
    }
  }

  if (issues.length > 0) return { ok: false, issues };
  if (partial && Object.keys(value).length === 0) {
    return { ok: false, issues: ["Provide at least one field to update."] };
  }
  return { ok: true, value: value as Partial<NavigationInput> };
}

export async function listAllNavigation(database: QueryDatabase = defaultDb) {
  return await database
    .select()
    .from(navigationItems)
    .orderBy(asc(navigationItems.sortOrder), asc(navigationItems.id))
    .all();
}

/** Public menu: visible rows in display order; empty means "use default". */
export async function listPublicNavigation(database: QueryDatabase = defaultDb) {
  return await database
    .select({
      label: navigationItems.label,
      href: navigationItems.href,
    })
    .from(navigationItems)
    .where(eq(navigationItems.visible, true))
    .orderBy(asc(navigationItems.sortOrder), asc(navigationItems.id))
    .all();
}

export async function getNavigationRowById(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .select()
    .from(navigationItems)
    .where(eq(navigationItems.id, id))
    .limit(1)
    .get();
}

export async function createNavigationItem(
  input: NavigationInput,
  database: QueryDatabase = defaultDb,
) {
  const latest = await database
    .select({ sortOrder: navigationItems.sortOrder })
    .from(navigationItems)
    .orderBy(desc(navigationItems.sortOrder))
    .limit(1)
    .get();
  return await database
    .insert(navigationItems)
    .values({
      label: input.label,
      href: input.href,
      visible: input.visible ?? true,
      sortOrder: (latest?.sortOrder ?? 0) + 1,
      updatedAt: new Date(),
    })
    .returning()
    .get();
}

export async function updateNavigationItem(
  id: number,
  patch: Partial<NavigationInput>,
  database: QueryDatabase = defaultDb,
) {
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (patch.label !== undefined) values.label = patch.label;
  if (patch.href !== undefined) values.href = patch.href;
  if (patch.visible !== undefined) values.visible = patch.visible;

  return await database
    .update(navigationItems)
    .set(values)
    .where(eq(navigationItems.id, id))
    .returning()
    .get();
}

/** Swaps display order with the neighbour above or below. */
export async function moveNavigationItem(
  id: number,
  direction: "up" | "down",
  database: QueryDatabase = defaultDb,
): Promise<{ ok: boolean; status?: 404; issues?: string[] }> {
  const rows = await listAllNavigation(database);
  const index = rows.findIndex((row) => row.id === id);
  if (index === -1) {
    return { ok: false, status: 404, issues: [`Navigation item not found: ${id}.`] };
  }
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= rows.length) {
    return { ok: true };
  }
  const current = rows[index];
  const neighbour = rows[targetIndex];
  await database
    .update(navigationItems)
    .set({ sortOrder: neighbour.sortOrder })
    .where(eq(navigationItems.id, current.id))
    .run();
  await database
    .update(navigationItems)
    .set({ sortOrder: current.sortOrder })
    .where(eq(navigationItems.id, neighbour.id))
    .run();
  return { ok: true };
}

export async function deleteNavigationItem(
  id: number,
  database: QueryDatabase = defaultDb,
) {
  return await database
    .delete(navigationItems)
    .where(eq(navigationItems.id, id))
    .returning()
    .get();
}
