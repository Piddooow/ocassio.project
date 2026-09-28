import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createClient,
  listAllClients,
  validateStudioClientInput,
  type StudioClientInput,
} from "@/lib/db/queries/studio-admin";

/**
 * Admin Studio clients collection.
 * GET  /api/admin/studio/clients -> every client (any status)
 * POST /api/admin/studio/clients -> create one client
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const clients = await listAllClients();
  return NextResponse.json({
    data: clients,
    meta: { total: clients.length },
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

  const validated = validateStudioClientInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const created = await createClient(validated.value as StudioClientInput);
  return NextResponse.json({ data: created }, { status: 201 });
}
