import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  findJournalCategoryBySlug,
  listPublicArticles,
} from "@/lib/db/queries/articles";

/**
 * Public journal list API.
 * GET /api/articles?category=<slug>&limit=<1..50>&offset=<n>
 *
 * Reads only published + public articles; drafts and private entries
 * never appear here (PRD §13).
 */
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const categorySlug = searchParams.get("category") ?? undefined;

  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const limit = limitRaw === null ? DEFAULT_LIMIT : Number(limitRaw);
  const offset = offsetRaw === null ? 0 : Number(offsetRaw);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return badRequest(`limit must be an integer between 1 and ${MAX_LIMIT}.`);
  }
  if (!Number.isInteger(offset) || offset < 0) {
    return badRequest("offset must be an integer of 0 or more.");
  }
  if (categorySlug && !findJournalCategoryBySlug(categorySlug)) {
    return badRequest(`Unknown category slug: ${categorySlug}.`);
  }

  const { items, total } = await listPublicArticles({
    categorySlug,
    limit,
    offset,
  });

  return NextResponse.json({
    data: items,
    meta: { total, limit, offset },
  });
}
