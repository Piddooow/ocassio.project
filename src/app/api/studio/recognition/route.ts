import { NextResponse } from "next/server";
import { listPublishedRecognition } from "@/lib/db/queries/studio";

/**
 * Public Studio recognition API.
 * GET /api/studio/recognition
 *
 * Published recognition entries, newest first (§18).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const entries = await listPublishedRecognition();
  return NextResponse.json({
    data: entries,
    meta: { total: entries.length },
  });
}
