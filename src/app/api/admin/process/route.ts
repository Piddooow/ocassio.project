import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createProcessStep,
  listAllProcessSteps,
  validateProcessStepInput,
  type ProcessStepInput,
} from "@/lib/db/queries/process-admin";

/**
 * Admin Process collection.
 * GET  /api/admin/process -> every step (visible and hidden)
 * POST /api/admin/process -> create one step
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const steps = await listAllProcessSteps();
  return NextResponse.json({
    data: steps,
    meta: { total: steps.length },
  });
}

export async function POST(request: NextRequest) {
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

  const validated = validateProcessStepInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const created = await createProcessStep(validated.value as ProcessStepInput);
  return NextResponse.json({ data: created }, { status: 201 });
}
