import { NextResponse } from "next/server";
import { listPublishedServices } from "@/lib/db/queries/services";

/**
 * Public Services list API.
 * GET /api/services
 *
 * Published services in display order (§6.4).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listPublishedServices();
  return NextResponse.json({
    data: items,
    meta: { total: items.length },
  });
}
