import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import { moveNavigationItem } from "@/lib/db/queries/navigation-admin";

/**
 * Navigation ordering (§10.2).
 * POST /api/admin/navigation/[id]/move  body: { direction: "up" | "down" }
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: `Invalid navigation id: ${rawId}.` },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const direction = (body as { direction?: unknown })?.direction;
  if (direction !== "up" && direction !== "down") {
    return NextResponse.json(
      { error: "direction must be \"up\" or \"down\"." },
      { status: 400 },
    );
  }

  const result = await moveNavigationItem(id, direction);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.issues?.[0] ?? "Navigation item not found." },
      { status: result.status ?? 400 },
    );
  }
  await recordActivity({
    action: "reordered",
    entityType: "navigation",
    entityId: id,
    summary: `Navigation item #${id} moved ${direction}.`,
  });
  return NextResponse.json({ data: { id, moved: direction } });
}
