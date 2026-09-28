import { NextResponse } from "next/server";
import { getPublicSiteSettings } from "@/lib/db/queries/settings";

/**
 * Public Global Settings API (§10.3, §6.12).
 * GET /api/settings
 *
 * Contact channels and social links, or null while the studio is
 * still connecting them.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getPublicSiteSettings();
  return NextResponse.json({ data: settings });
}
