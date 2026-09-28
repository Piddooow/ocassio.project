import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  deleteNavigationItem,
  getNavigationRowById,
  updateNavigationItem,
  validateNavigationInput,
} from "@/lib/db/queries/navigation-admin";

/**
 * Navigation item by id (§10.2).
 * PATCH  /api/admin/navigation/[id] -> label, href, visibility
 * DELETE /api/admin/navigation/[id] -> remove the item
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
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

  const validated = validateNavigationInput(body, { partial: true });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const existing = await getNavigationRowById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Navigation item not found: ${id}.` },
      { status: 404 },
    );
  }

  const updated = await updateNavigationItem(id, validated.value);
  await recordActivity({
    action: "updated",
    entityType: "navigation",
    entityId: id,
    summary: `Navigation item updated: ${updated?.label ?? id}`,
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid navigation id: ${rawId}.` },
      { status: 400 },
    );
  }

  const deleted = await deleteNavigationItem(id);
  if (!deleted) {
    return NextResponse.json(
      { error: `Navigation item not found: ${id}.` },
      { status: 404 },
    );
  }
  await recordActivity({
    action: "deleted",
    entityType: "navigation",
    entityId: id,
    summary: `Navigation item #${id} removed.`,
  });
  return NextResponse.json({ data: { id, deleted: true } });
}
