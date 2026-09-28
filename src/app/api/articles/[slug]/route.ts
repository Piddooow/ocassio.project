import { NextResponse } from "next/server";
import { getPublicArticleBySlug } from "@/lib/db/queries/articles";

/**
 * Public single article API.
 * GET /api/articles/[slug]
 *
 * Returns the article with its ordered body blocks; drafts, private
 * entries, and unknown slugs are a 404 (PRD §13).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const article = await getPublicArticleBySlug(slug);

  if (!article) {
    return NextResponse.json(
      { error: `Article not found: ${slug}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: article });
}
