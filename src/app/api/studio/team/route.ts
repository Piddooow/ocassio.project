import { NextResponse } from "next/server";
import { listPublicTeamMembers } from "@/lib/db/queries/studio";

/**
 * Public Studio team API.
 * GET /api/studio/team
 *
 * Published + public members only, in display order (§18).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const team = await listPublicTeamMembers();
  return NextResponse.json({
    data: team,
    meta: { total: team.length },
  });
}
