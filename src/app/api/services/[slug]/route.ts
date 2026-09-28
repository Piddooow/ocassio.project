import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublishedServiceBySlug } from "@/lib/db/queries/services";

/**
 * Public Service Detail API.
 * GET /api/services/[slug]
 *
 * A published service with its 1:1 details and published pricing
 * entries (§6.5). Draft services are a 404 here (PRD §13).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const service = await getPublishedServiceBySlug(slug);
  if (!service) {
    return NextResponse.json(
      { error: `Service not found: ${slug}.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: service });
}
