import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  getSiteSettingsRow,
  upsertSiteSettings,
  validateSiteSettingsInput,
} from "@/lib/db/queries/settings-admin";

/**
 * Admin Global Settings (§10.3): contact fields.
 * GET   /api/admin/settings -> current settings (or null)
 * PATCH /api/admin/settings -> create on first write, then patch
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const settings = await getSiteSettingsRow();
  return NextResponse.json({ data: settings ?? null });
}

export async function PATCH(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
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

  const validated = validateSiteSettingsInput(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const updated = await upsertSiteSettings(validated.value);
  await recordActivity({
    action: "updated",
    entityType: "settings",
    entityId: updated?.id ?? null,
    summary: "Global Settings updated.",
  });
  return NextResponse.json({ data: updated });
}
