import { NextResponse } from "next/server";
import { listPublicNowEntries } from "@/lib/db/queries/upcoming";

/**
 * Public Now entries API.
 * GET /api/now
 *
 * Returns public, due teasers ordered for display. Private and
 * future-scheduled entries never appear (PRD §6.11).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await listPublicNowEntries();
  return NextResponse.json({
    data: entries,
    meta: { total: entries.length },
  });
}
