import { NextResponse } from "next/server";
import { listPublicProcessSteps } from "@/lib/db/queries/process";

/**
 * Public Process API.
 * GET /api/process
 *
 * Visible process steps in display order (§6.7).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const steps = await listPublicProcessSteps();
  return NextResponse.json({
    data: steps,
    meta: { total: steps.length },
  });
}
