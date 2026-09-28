import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  createPricing,
  getServiceById,
  listAllPricing,
  validatePricingInput,
  type PricingEntryInput,
} from "@/lib/db/queries/services-admin";

/**
 * Admin Pricing collection.
 * GET  /api/admin/pricing -> every entry (any status)
 * POST /api/admin/pricing -> create one entry
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const items = await listAllPricing();
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

  const validated = validatePricingInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const service = await getServiceById(validated.value.serviceId as number);
  if (!service) {
    return NextResponse.json(
      {
        error: "Validation failed.",
        issues: ["serviceId must reference an existing service."],
      },
      { status: 400 },
    );
  }

  const created = await createPricing(validated.value as PricingEntryInput);
  const snapshot = await buildVersionSnapshot("pricing", created.id);
  if (snapshot !== null) {
    await recordVersion("pricing", created.id, snapshot);
  }
  return NextResponse.json({ data: created }, { status: 201 });
}
