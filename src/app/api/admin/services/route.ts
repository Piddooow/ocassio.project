import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  createService,
  findServiceBySlug,
  listAllServices,
  validateServiceInput,
  type ServiceInput,
} from "@/lib/db/queries/services-admin";

/**
 * Admin Services collection.
 * GET  /api/admin/services -> every service (any status)
 * POST /api/admin/services -> create one service (optional details)
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const items = await listAllServices();
  return NextResponse.json({
    data: items,
    meta: { total: items.length },
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

  const validated = validateServiceInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const slug = validated.value.slug as string;
  const existing = await findServiceBySlug(slug);
  if (existing) {
    return NextResponse.json(
      { error: "Validation failed.", issues: ["slug is already in use."] },
      { status: 400 },
    );
  }

  const created = await createService(validated.value as ServiceInput);
  const snapshot = await buildVersionSnapshot("service", created.id);
  if (snapshot !== null) {
    await recordVersion("service", created.id, snapshot);
  }
  return NextResponse.json({ data: created }, { status: 201 });
}
