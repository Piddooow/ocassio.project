import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, MEDIA_ROLES } from "@/lib/api/admin-auth";
import { listMediaAssets } from "@/lib/db/queries/media-admin";

/**
 * Media Library collection (§20).
 * GET /api/admin/media?type=image|video&search=name -> filtered assets
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: MEDIA_ROLES });
  if (denied) return denied;

  const typeParam = request.nextUrl.searchParams.get("type");
  const mediaType =
    typeParam === "image" || typeParam === "video" ? typeParam : undefined;
  const search = request.nextUrl.searchParams.get("search") ?? undefined;

  const rows = await listMediaAssets({ mediaType, search });
  return NextResponse.json({
    data: rows,
    meta: { total: rows.length, type: mediaType ?? "all", search: search ?? null },
  });
}
