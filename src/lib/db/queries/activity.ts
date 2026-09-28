import { desc } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { activityLog } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Activity log (§9): one append-only line per admin change. Writes are
 * best-effort and never block the mutation that triggered them.
 */

export interface ActivityInput {
  action: string;
  entityType: string;
  entityId?: number | null;
  summary: string;
  actorEmail?: string | null;
}

export async function recordActivity(
  entry: ActivityInput,
  database: QueryDatabase = defaultDb,
): Promise<void> {
  try {
    database
      .insert(activityLog)
      .values({
        actorEmail: entry.actorEmail ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary,
      })
      .run();
  } catch {
    /* Logging must never break a save. */
  }
}

export async function listRecentActivity(
  limit = 10,
  database: QueryDatabase = defaultDb,
) {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  return database
    .select()
    .from(activityLog)
    .orderBy(desc(activityLog.createdAt), desc(activityLog.id))
    .limit(safeLimit)
    .all();
}
