import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { getVersionById } from "@/lib/db/queries/version-history";

/**
 * Compare two versions of the same entity (§25 Compare).
 * GET /api/admin/versions/[id]/compare?with=<otherId>
 *
 * Both snapshots are returned; the admin UI renders the field diff.
 */
export const dynamic = "force-dynamic";

function parseId(raw: string | null): number | null {
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
  const otherId = parseId(request.nextUrl.searchParams.get("with"));

  if (id === null || otherId === null) {
    return NextResponse.json(
      { error: "A version id and a with=<id> version id are required." },
      { status: 400 },
    );
  }

  const [from, to] = await Promise.all([
    getVersionById(id),
    getVersionById(otherId),
  ]);
  if (!from || !to) {
    return NextResponse.json(
      { error: `Version not found: ${!from ? id : otherId}.` },
      { status: 404 },
    );
  }
  if (from.entityType !== to.entityType || from.entityId !== to.entityId) {
    return NextResponse.json(
      { error: "Both versions must belong to the same entity." },
      { status: 400 },
    );
  }

  return NextResponse.json({ data: { from, to } });
}
