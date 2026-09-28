import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { listAllLegalPages } from "@/lib/db/queries/legal-admin";

/**
 * Admin legal pages list.
 * GET /api/admin/legal -> every page with status and body blocks.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const pages = await listAllLegalPages();
  return NextResponse.json({
    data: pages,
    meta: { total: pages.length },
  });
}
