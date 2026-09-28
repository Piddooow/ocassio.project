import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createUpcomingEntry,
  listAllUpcomingEntries,
  validateUpcomingInput,
  type UpcomingInput,
} from "@/lib/db/queries/upcoming-admin";

/**
 * Admin Now entries collection.
 * GET  /api/admin/now  -> every entry (any visibility/status)
 * POST /api/admin/now  -> create one entry
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const entries = await listAllUpcomingEntries();
  return NextResponse.json({
    data: entries,
    meta: { total: entries.length },
  });
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

  const validated = validateUpcomingInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const created = await createUpcomingEntry(validated.value as UpcomingInput);
  return NextResponse.json({ data: created }, { status: 201 });
}
