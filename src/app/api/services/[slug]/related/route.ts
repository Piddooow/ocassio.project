import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getPublishedServiceBySlug } from "@/lib/db/queries/services";

/**
 * Public Service Detail relations API (§6.5).
 * GET /api/services/[slug]/related
 *
 * Selected work slugs plus the related FAQ entries of a published
 * service. Draft services are a 404 (PRD §13).
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

  return NextResponse.json({
    data: {
      projects: service.relatedProjects,
      faq: service.faq,
    },
  });
}
