import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { articles, legalPages } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Lazy auto-publish (§24): the scheduled path DRAFT → SCHEDULE → AUTO
 * PUBLISH runs on the first public read after publish_at, so no
 * background worker is required. Scheduled rows without a publish_at
 * stay parked until an editor schedules them.
 *
 * Upcoming (Now) entries use filter-based scheduling instead:
 * publicNowConditions hides future publish_at values until they arrive
 * without flipping any status.
 */

export interface AutoPublishSummary {
  articles: number;
  legalPages: number;
}

export async function publishDueScheduledContent(
  database: QueryDatabase = defaultDb,
  nowIso: string = new Date().toISOString(),
): Promise<AutoPublishSummary> {
  const now = new Date();

  const flippedArticleRows = await database
    .update(articles)
    .set({ status: "published", updatedAt: now })
    .where(
      and(
        eq(articles.status, "scheduled"),
        isNotNull(articles.publishAt),
        lte(articles.publishAt, nowIso),
      ),
    )
    .returning({ id: articles.id })
    .all();
  const flippedArticles = flippedArticleRows.length;

  const flippedLegalRows = await database
    .update(legalPages)
    .set({ status: "published", updatedAt: now })
    .where(
      and(
        eq(legalPages.status, "scheduled"),
        isNotNull(legalPages.publishAt),
        lte(legalPages.publishAt, nowIso),
      ),
    )
    .returning({ id: legalPages.id })
    .all();
  const flippedLegalPages = flippedLegalRows.length;

  return { articles: flippedArticles, legalPages: flippedLegalPages };
}
