import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { VERSIONED_ENTITIES } from "@/lib/db/schema";
import {
  isVersionedEntity,
  listVersions,
} from "@/lib/db/queries/version-history";

/**
 * Version history list (§25).
 * GET /api/admin/versions?entityType=<type>&entityId=<id>
 *
 * Newest first; snapshots stay on the single-version endpoint.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const searchParams = request.nextUrl.searchParams;
  const entityType = searchParams.get("entityType");
  const entityIdRaw = searchParams.get("entityId");
  const entityId = Number(entityIdRaw);

  if (!isVersionedEntity(entityType)) {
    return NextResponse.json(
      {
        error: `entityType must be one of: ${VERSIONED_ENTITIES.join(", ")}.`,
      },
      { status: 400 },
    );
  }
  if (!Number.isInteger(entityId) || entityId <= 0) {
    return NextResponse.json(
      { error: "entityId must be a positive integer." },
      { status: 400 },
    );
  }

  const versions = await listVersions(entityType, entityId);
  return NextResponse.json({
    data: versions,
    meta: { total: versions.length, entityType, entityId },
  });
}
