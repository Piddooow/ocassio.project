import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  deleteProcessStep,
  getProcessStepById,
  updateProcessStep,
  validateProcessStepInput,
} from "@/lib/db/queries/process-admin";

/**
 * Admin process step by id.
 * PATCH  /api/admin/process/[id] -> partial update (Hide/Show included)
 * DELETE /api/admin/process/[id] -> remove
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
      { error: `Invalid step id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getProcessStepById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Step not found: ${id}.` },
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

  const validated = validateProcessStepInput(body, { partial: true });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const updated = await updateProcessStep(id, validated.value);
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
      { error: `Invalid step id: ${rawId}.` },
      { status: 400 },
    );
  }

  const deleted = await deleteProcessStep(id);
  if (!deleted) {
    return NextResponse.json(
      { error: `Step not found: ${id}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id, deleted: true } });
}
