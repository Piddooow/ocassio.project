import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import { deleteProtectionIssues } from "@/lib/db/queries/publishing";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import {
  deleteService,
  findServiceBySlug,
  getServiceById,
  getServiceWithDetails,
  updateService,
  validateServiceInput,
} from "@/lib/db/queries/services-admin";

/**
 * Admin service by id.
 * GET    /api/admin/services/[id] -> service plus its detail row
 * PATCH  /api/admin/services/[id] -> partial update (optional details)
 * DELETE /api/admin/services/[id] -> remove (cascades to details/pricing)
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid service id: ${rawId}.` },
      { status: 400 },
    );
  }

  const service = await getServiceWithDetails(id);
  if (!service) {
    return NextResponse.json(
      { error: `Service not found: ${id}.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: service });
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
      { error: `Invalid service id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getServiceWithDetails(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Service not found: ${id}.` },
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

  const validated = validateServiceInput(body, { partial: true });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  if (validated.value.slug !== undefined) {
    const clash = await findServiceBySlug(validated.value.slug);
    if (clash && clash.id !== id) {
      return NextResponse.json(
        { error: "Validation failed.", issues: ["slug is already in use."] },
        { status: 400 },
      );
    }
  }

  const updated = await updateService(id, validated.value);
  const snapshot = await buildVersionSnapshot("service", id);
  if (snapshot !== null) {
    await recordVersion("service", id, snapshot);
  }
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
      { error: `Invalid service id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getServiceById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Service not found: ${id}.` },
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

  await deleteService(id);
  return NextResponse.json({ data: { id, deleted: true } });
}
