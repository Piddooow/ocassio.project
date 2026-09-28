import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { listRelatedArticles } from "@/lib/db/queries/articles";

/**
 * Related articles for a public article.
 * GET /api/articles/[slug]/related?limit=<1..6>
 *
 * Same category first (newest), filled with the latest other public
 * articles. Drafts, scheduled, and private rows never appear.
 */
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 3;
const MAX_LIMIT = 6;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return NextResponse.json(
      { error: `limit must be an integer between 1 and ${MAX_LIMIT}.` },
      { status: 400 },
    );
  }

  const related = await listRelatedArticles(slug, limit);
  if (related === undefined) {
    return NextResponse.json(
      { error: `Article not found: ${slug}.` },
      { status: 404 },
    );
  }

  return NextResponse.json({
    data: related,
    meta: { limit, count: related.length },
  });
}
