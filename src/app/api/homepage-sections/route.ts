import { NextResponse } from "next/server";
import { listPublicHomepageSections } from "@/lib/db/queries/homepage-admin";

/**
 * Public homepage sections (§10.1): visible sections in display order.
 * GET /api/homepage-sections
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const sections = await listPublicHomepageSections();
  return NextResponse.json({ data: sections, meta: { total: sections.length } });
}
