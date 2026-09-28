import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  applyLegalAction,
  validateLegalAction,
} from "@/lib/db/queries/legal-admin";

/**
 * Legal publish workflow (§24).
 * POST /api/admin/legal/[slug]/actions  body: { action, publishAt? }
 *
 * publish / unpublish / schedule / save_draft, with the §11 gate:
 * publishing requires title, updated date, and at least one
 * paragraph block.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { slug } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateLegalAction(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await applyLegalAction(
    slug,
    validated.action,
    validated.publishAt,
  );
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.status === 404
            ? result.issues[0]
            : "Cannot publish yet.",
        issues: result.issues,
      },
      { status: result.status },
    );
  }

  return NextResponse.json({ data: result.row });
}
