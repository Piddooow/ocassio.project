import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getPublishedArticles,
  getPublishedProjectBySlug,
} from "@/lib/content/queries";
import { getLikeState, isLikeEntity, toggleLike } from "@/lib/db/queries/likes";

/**
 * Likes API (studio request).
 * GET  /api/likes?entity=project&slug=<slug>&visitor=<id>
 * POST /api/likes  body: { entity, slug, visitor }  (toggles)
 *
 * Likes are persisted per visitor; counts are public.
 */
export const dynamic = "force-dynamic";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VISITOR_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

async function entityExists(
  entity: "project" | "article",
  slug: string,
): Promise<boolean> {
  if (entity === "project") {
    return Boolean(await getPublishedProjectBySlug(slug));
  }
  const articles = await getPublishedArticles();
  return articles.some((article) => article.slug === slug);
}

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const entity = params.get("entity");
  const slug = params.get("slug") ?? "";
  const visitor = params.get("visitor");

  if (!isLikeEntity(entity)) {
    return badRequest("entity must be one of: project, article.");
  }
  if (!SLUG_PATTERN.test(slug)) {
    return badRequest("slug must be a lowercase content slug.");
  }
  if (visitor !== null && !VISITOR_PATTERN.test(visitor)) {
    return badRequest("visitor must be a valid anonymous id or omitted.");
  }
  if (!(await entityExists(entity, slug))) {
    return NextResponse.json(
      { error: `${entity} not found: ${slug}.` },
      { status: 404 },
    );
  }

  const state = await getLikeState(entity, slug, visitor);
  return NextResponse.json({ data: state });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
  const payload = (body ?? {}) as Record<string, unknown>;
  const entity = payload.entity;
  const slug = payload.slug;
  const visitor = payload.visitor;

  if (!isLikeEntity(entity)) {
    return badRequest("entity must be one of: project, article.");
  }
  if (typeof slug !== "string" || !SLUG_PATTERN.test(slug)) {
    return badRequest("slug must be a lowercase content slug.");
  }
  if (typeof visitor !== "string" || !VISITOR_PATTERN.test(visitor)) {
    return badRequest("visitor must be a valid anonymous id.");
  }
  if (!(await entityExists(entity, slug))) {
    return NextResponse.json(
      { error: `${entity} not found: ${slug}.` },
      { status: 404 },
    );
  }

  const state = await toggleLike(entity, slug, visitor);
  return NextResponse.json({ data: state });
}
