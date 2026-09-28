import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { restoreVersion } from "@/lib/db/queries/version-history";

/**
 * Restore a version (§25 Restore).
 * POST /api/admin/versions/[id]/restore
 *
 * Writes the snapshot's content back and appends a new version, so the
 * history stays append-only.
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid version id: ${rawId}.` },
      { status: 400 },
    );
  }

  const restored = await restoreVersion(id);
  if (!restored.ok) {
    return NextResponse.json(
      { error: "Restore failed.", issues: restored.issues },
      { status: restored.status },
    );
  }

  return NextResponse.json({
    data: {
      entityType: restored.entityType,
      entityId: restored.entityId,
      version: restored.recorded,
    },
  });
}
