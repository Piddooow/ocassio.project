import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listPublishedClients } from "@/lib/db/queries/studio";

/**
 * Public Studio clients API.
 * GET /api/studio/clients?featured=true
 *
 * Published clients in display order (§18). The optional featured
 * filter narrows the list for Home and About highlights.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const featuredParam = request.nextUrl.searchParams.get("featured");

  let featuredOnly = false;
  if (featuredParam !== null) {
    if (featuredParam === "true" || featuredParam === "1") {
      featuredOnly = true;
    } else if (featuredParam !== "false" && featuredParam !== "0") {
      return NextResponse.json(
        { error: "featured must be true or false." },
        { status: 400 },
      );
    }
  }

  const clients = await listPublishedClients({ featuredOnly });
  return NextResponse.json({
    data: clients,
    meta: { total: clients.length },
  });
}
