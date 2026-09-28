import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  getLegalPageRow,
  updateLegalPage,
  validateLegalUpdate,
} from "@/lib/db/queries/legal-admin";

/**
 * Admin legal page update.
 * PATCH /api/admin/legal/[slug]  body: { title?, body?, updatedDate?, status? }
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { slug } = await params;
  const existing = await getLegalPageRow(slug);
  if (!existing) {
    return NextResponse.json(
      { error: `Legal page not found: ${slug}.` },
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

  const validated = validateLegalUpdate(body);
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const updated = await updateLegalPage(slug, validated.value);
  return NextResponse.json({ data: updated });
}
