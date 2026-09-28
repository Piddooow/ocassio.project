import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createRecognition,
  listAllRecognition,
  validateRecognitionInput,
  type RecognitionInput,
} from "@/lib/db/queries/studio-admin";

/**
 * Admin Studio recognition collection.
 * GET  /api/admin/studio/recognition -> every entry (any status)
 * POST /api/admin/studio/recognition -> create one entry
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const entries = await listAllRecognition();
  return NextResponse.json({
    data: entries,
    meta: { total: entries.length },
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

  const validated = validateRecognitionInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const created = await createRecognition(validated.value as RecognitionInput);
  return NextResponse.json({ data: created }, { status: 201 });
}
