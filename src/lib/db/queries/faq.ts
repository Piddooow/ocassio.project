import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { faq } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Public FAQ query (§12.4): published entries only, in display order.
 */

/**
 * Single enforcement point for public FAQ reads (§12.4): published
 * entries only.
 */
export function publicFaqConditions() {
  return eq(faq.status, "published");
}

export interface PublicFaqEntry {
  id: number;
  question: string;
  answer: string;
  sortOrder: number;
}

export async function listPublishedFaq(
  database: QueryDatabase = defaultDb,
): Promise<PublicFaqEntry[]> {
  return await database
    .select({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      sortOrder: faq.sortOrder,
    })
    .from(faq)
    .where(publicFaqConditions())
    .orderBy(asc(faq.sortOrder), asc(faq.id))
    .all();
}
