import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, SALES_ROLES } from "@/lib/api/admin-auth";
import { listInquiryQueue } from "@/lib/db/queries/inquiries";
import { INQUIRY_STATUSES } from "@/lib/db/schema";

/**
 * Admin business queue (§17): project inquiries, newest first.
 * GET /api/admin/inquiries?status=<stage>&limit=<1..50>&offset=<n>
 */
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: SALES_ROLES });
  if (denied) return denied;

  const searchParams = request.nextUrl.searchParams;
  const statusRaw = searchParams.get("status");
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw);
  const offset = offsetRaw === null ? 0 : Number(offsetRaw);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json(
      { error: `limit must be an integer between 1 and ${MAX_LIMIT}.` },
      { status: 400 },
    );
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return NextResponse.json(
      { error: "offset must be an integer of 0 or more." },
      { status: 400 },
    );
  }

  let status: (typeof INQUIRY_STATUSES)[number] | undefined;
  if (statusRaw !== null) {
    if (!INQUIRY_STATUSES.includes(statusRaw as (typeof INQUIRY_STATUSES)[number])) {
      return NextResponse.json(
        {
          error: `Unknown inquiry status: ${statusRaw}. Valid stages: ${INQUIRY_STATUSES.join(", ")}.`,
        },
        { status: 400 },
      );
    }
    status = statusRaw as (typeof INQUIRY_STATUSES)[number];
  }

  const { items, total } = await listInquiryQueue({ status, limit, offset });

  return NextResponse.json({
    data: items,
    meta: { total, limit, offset, status: status ?? null },
  });
}
