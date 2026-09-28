import { and, eq, sql } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { LIKE_ENTITIES, likes } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Likes (studio request): one row per visitor per entity, persisted
 * immediately. The count is COUNT(*); a visitor toggles their own like on
 * and off.
 */

export type LikeEntity = (typeof LIKE_ENTITIES)[number];

export function isLikeEntity(value: unknown): value is LikeEntity {
  return (
    typeof value === "string" && LIKE_ENTITIES.includes(value as LikeEntity)
  );
}

export interface LikeState {
  count: number;
  liked: boolean;
}

export async function getLikeState(
  entityType: LikeEntity,
  entitySlug: string,
  visitorId: string | null,
  database: QueryDatabase = defaultDb,
): Promise<LikeState> {
  const count = database
    .select({ count: sql<number>`COUNT(*)` })
    .from(likes)
    .where(
      and(
        eq(likes.entityType, entityType),
        eq(likes.entitySlug, entitySlug),
      ),
    )
    .all()[0].count;

  const liked = visitorId
    ? Boolean(
        database
          .select({ id: likes.id })
          .from(likes)
          .where(
            and(
              eq(likes.entityType, entityType),
              eq(likes.entitySlug, entitySlug),
              eq(likes.visitorId, visitorId),
            ),
          )
          .limit(1)
          .all()[0],
      )
    : false;

  return { count, liked };
}

export async function toggleLike(
  entityType: LikeEntity,
  entitySlug: string,
  visitorId: string,
  database: QueryDatabase = defaultDb,
): Promise<LikeState> {
  const existing = database
    .select({ id: likes.id })
    .from(likes)
    .where(
      and(
        eq(likes.entityType, entityType),
        eq(likes.entitySlug, entitySlug),
        eq(likes.visitorId, visitorId),
      ),
    )
    .limit(1)
    .all()[0];

  if (existing) {
    database.delete(likes).where(eq(likes.id, existing.id)).run();
  } else {
    database
      .insert(likes)
      .values({ entityType, entitySlug, visitorId })
      .run();
  }

  return getLikeState(entityType, entitySlug, visitorId, database);
}
