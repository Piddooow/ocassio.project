import { eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { legalPages } from "@/lib/db/schema";
import { publishDueScheduledContent } from "./scheduling";
import type { QueryDatabase } from "./upcoming";

/**
 * Public legal content (privacy, terms). Only published pages leave
 * this module (PRD §6.14, §13). Scheduled pages auto-publish lazily:
 * the first public read after publish_at flips them to published.
 */

export interface PublicLegalPage {
  title: string;
  slug: string;
  updatedDate: string;
  blocks: { type: "heading" | "paragraph"; text: string }[];
}

export async function getPublicLegalPage(
  slug: string,
): Promise<PublicLegalPage | undefined> {
  await publishDueScheduledContent(defaultDb);
  const row = defaultDb
    .select()
    .from(legalPages)
    .where(eq(legalPages.slug, slug))
    .limit(1)
    .all()[0];

  if (!row || row.status !== "published") return undefined;

  return {
    title: row.title,
    slug: row.slug,
    updatedDate: row.updatedDate,
    blocks: row.body ?? [],
  };
}
