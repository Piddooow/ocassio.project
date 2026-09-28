import { NextResponse } from "next/server";
import { listPublishedFaq } from "@/lib/db/queries/faq";

/**
 * Public FAQ API.
 * GET /api/faq
 *
 * Published FAQ entries in display order (§12.4).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await listPublishedFaq();
  return NextResponse.json({
    data: entries,
    meta: { total: entries.length },
  });
}
