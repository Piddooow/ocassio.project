import { NextResponse } from "next/server";
import { getPublicLegalPage } from "@/lib/db/queries/legal";

/**
 * Public legal page content.
 * GET /api/legal/[slug]  (privacy, terms)
 *
 * Unpublished and unknown pages are a 404 (PRD §6.14, §13).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const page = await getPublicLegalPage(slug);

  if (!page) {
    return NextResponse.json(
      { error: `Legal page not found: ${slug}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: page });
}
