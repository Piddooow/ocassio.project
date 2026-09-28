import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createFaq,
  listAllFaq,
  validateFaqInput,
  type FaqInput,
} from "@/lib/db/queries/faq-admin";

/**
 * Admin FAQ collection.
 * GET  /api/admin/faq -> every entry (any status)
 * POST /api/admin/faq -> create one entry
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const entries = await listAllFaq();
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

  const validated = validateFaqInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.errors },
      { status: 400 },
    );
  }

  const created = await createFaq(validated.value as FaqInput);
  return NextResponse.json({ data: created }, { status: 201 });
}
