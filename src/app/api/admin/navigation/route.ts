import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  createNavigationItem,
  listAllNavigation,
  validateNavigationInput,
} from "@/lib/db/queries/navigation-admin";

/**
 * Navigation collection (§10.2).
 * GET  /api/admin/navigation -> every item (including hidden) in order
 * POST /api/admin/navigation -> append a new item
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const rows = await listAllNavigation();
  return NextResponse.json({ data: rows, meta: { total: rows.length } });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateNavigationInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const created = await createNavigationItem(validated.value as {
    label: string;
    href: string;
  });
  await recordActivity({
    action: "created",
    entityType: "navigation",
    entityId: created.id,
    summary: `Navigation item added: ${created.label}`,
  });
  return NextResponse.json({ data: created }, { status: 201 });
}
