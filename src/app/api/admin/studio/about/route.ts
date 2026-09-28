import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  getStudioAboutRow,
  upsertStudioAbout,
  validateStudioAboutInput,
} from "@/lib/db/queries/studio-admin";

/**
 * Admin Studio About singleton.
 * GET   /api/admin/studio/about -> current content (or null)
 * PATCH /api/admin/studio/about -> create on first write, then patch
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const about = await getStudioAboutRow();
  return NextResponse.json({ data: about ?? null });
}

export async function PATCH(request: NextRequest) {
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

  const existing = await getStudioAboutRow();
  const validated = validateStudioAboutInput(body, {
    partial: existing !== undefined,
  });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const updated = await upsertStudioAbout(validated.value);
  const snapshot = await buildVersionSnapshot("studio_about", updated.id);
  if (snapshot !== null) {
    await recordVersion("studio_about", updated.id, snapshot);
  }
  return NextResponse.json({ data: updated });
}
