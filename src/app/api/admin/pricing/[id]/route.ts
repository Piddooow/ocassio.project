import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { deleteProtectionIssues } from "@/lib/db/queries/publishing";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  deletePricing,
  getPricingById,
  getServiceById,
  updatePricing,
  validatePricingInput,
} from "@/lib/db/queries/services-admin";

/**
 * Admin pricing entry by id.
 * PATCH  /api/admin/pricing/[id] -> partial update
 * DELETE /api/admin/pricing/[id] -> remove
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
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid entry id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getPricingById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Entry not found: ${id}.` },
      { status: 404 },
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

  const validated = validatePricingInput(body, {
    partial: true,
    existing: { priceType: existing.priceType, amount: existing.amount },
  });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  if (validated.value.serviceId !== undefined) {
    const service = await getServiceById(validated.value.serviceId);
    if (!service) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          issues: ["serviceId must reference an existing service."],
        },
        { status: 400 },
      );
    }
  }

  const updated = await updatePricing(id, validated.value);
  const snapshot = await buildVersionSnapshot("pricing", id);
  if (snapshot !== null) {
    await recordVersion("pricing", id, snapshot);
  }
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid entry id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getPricingById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Entry not found: ${id}.` },
      { status: 404 },
    );
  }

  const issues = deleteProtectionIssues(existing);
  if (issues.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete. Resolve the issues.", issues },
      { status: 409 },
    );
  }

  await deletePricing(id);
  return NextResponse.json({ data: { id, deleted: true } });
}
