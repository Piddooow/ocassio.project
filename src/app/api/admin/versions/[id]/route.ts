import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { getVersionById } from "@/lib/db/queries/version-history";

/**
 * Single version snapshot (§25 View).
 * GET /api/admin/versions/[id]
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
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

  const version = await getVersionById(id);
  if (!version) {
    return NextResponse.json(
      { error: `Version not found: ${id}.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: version });
}
