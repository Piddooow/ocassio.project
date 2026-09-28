import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { listRecentActivity } from "@/lib/db/queries/activity";

/**
 * Recent admin activity (§9).
 * GET /api/admin/activity?limit=10
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const limitParam = Number(request.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isInteger(limitParam) && limitParam > 0 ? limitParam : 10;
  const entries = await listRecentActivity(limit);
  return NextResponse.json({ data: entries, meta: { total: entries.length } });
}
