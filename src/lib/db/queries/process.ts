import { asc, eq } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db/client";
import { processSteps } from "@/lib/db/schema";
import type { QueryDatabase } from "./upcoming";

/**
 * Public Process query (§6.7): visible steps only, in display order.
 * Hidden steps stay out of the public flow (§16 Hide action).
 */

/**
 * Single enforcement point for public Process reads (§6.7): visible
 * steps only. Hidden steps stay out of the public flow (§16 Hide).
 */
export function publicProcessConditions() {
  return eq(processSteps.status, "visible");
}

export interface PublicProcessStep {
  id: number;
  stepNumber: number;
  title: string;
  explanation: string;
  sortOrder: number;
}

export async function listPublicProcessSteps(
  database: QueryDatabase = defaultDb,
): Promise<PublicProcessStep[]> {
  return database
    .select({
      id: processSteps.id,
      stepNumber: processSteps.stepNumber,
      title: processSteps.title,
      explanation: processSteps.explanation,
      sortOrder: processSteps.sortOrder,
    })
    .from(processSteps)
    .where(publicProcessConditions())
    .orderBy(asc(processSteps.sortOrder), asc(processSteps.id))
    .all();
}
