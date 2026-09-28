import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  findServiceBySlug,
} from "@/lib/db/queries/services-admin";
import { listPublishedPricing } from "@/lib/db/queries/services";

/**
 * Public Pricing list API.
 * GET /api/pricing?service=<slug>
 *
 * Published pricing entries of published services, in display order
 * (§6.6). The optional service filter scopes one service.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const serviceSlug = request.nextUrl.searchParams.get("service") ?? undefined;

  if (serviceSlug) {
    const service = await findServiceBySlug(serviceSlug);
    if (!service) {
      return NextResponse.json(
        { error: `Unknown service slug: ${serviceSlug}.` },
        { status: 400 },
      );
    }
  }

  const items = await listPublishedPricing({ serviceSlug });
  return NextResponse.json({
    data: items,
    meta: { total: items.length },
  });
}
