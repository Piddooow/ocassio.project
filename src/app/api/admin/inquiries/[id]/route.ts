import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, SALES_ROLES } from "@/lib/api/admin-auth";
import {
  getInquiryById,
  updateInquiryStatus,
} from "@/lib/db/queries/inquiries";
import { INQUIRY_STATUSES } from "@/lib/db/schema";

/**
 * Admin inquiry stage update (§17).
 * PATCH /api/admin/inquiries/[id]  body: { status }
 */
export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: SALES_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: `Invalid inquiry id: ${rawId}.` },
      { status: 400 },
    );
  }

  const existing = await getInquiryById(id);
  if (!existing) {
    return NextResponse.json(
      { error: `Inquiry not found: ${id}.` },
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

  const status = (body as Record<string, unknown>)?.status;
  if (
    typeof status !== "string" ||
    !INQUIRY_STATUSES.includes(status as (typeof INQUIRY_STATUSES)[number])
  ) {
    return NextResponse.json(
      {
        error: `status must be one of: ${INQUIRY_STATUSES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const updated = await updateInquiryStatus(
    id,
    status as (typeof INQUIRY_STATUSES)[number],
  );
  return NextResponse.json({ data: updated });
}
