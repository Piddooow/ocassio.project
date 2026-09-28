import { NextResponse } from "next/server";
import { getPublicStudioAbout } from "@/lib/db/queries/studio";

/**
 * Public Studio About API.
 * GET /api/studio/about
 *
 * Returns the About singleton, or null while the studio is still
 * writing the content (§18).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const about = await getPublicStudioAbout();
  return NextResponse.json({ data: about });
}
