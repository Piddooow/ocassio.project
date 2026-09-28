import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  applyHomepageSections,
  listHomepageSections,
  validateHomepageSections,
} from "@/lib/db/queries/homepage-admin";

/**
 * Homepage sections (§10.1).
 * GET /api/admin/homepage-sections -> registry with current order/visibility
 * PUT /api/admin/homepage-sections -> persist order + visibility (Hero and
 *                                    the final CTA stay required)
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const sections = await listHomepageSections();
  return NextResponse.json({ data: sections });
}

export async function PUT(request: NextRequest) {
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

  const validated = validateHomepageSections(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const sections = await applyHomepageSections(validated.value);
  await recordActivity({
    action: "updated",
    entityType: "homepage",
    entityId: null,
    summary: "Homepage sections updated.",
  });
  return NextResponse.json({ data: sections });
}
