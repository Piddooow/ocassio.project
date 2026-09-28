import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  createArticle,
  listAllArticles,
  listJournalCategoryOptions,
  validateArticleInput,
  type ArticleInput,
} from "@/lib/db/queries/articles-admin";

/**
 * Journal articles collection (§17).
 * GET  /api/admin/articles -> every article state plus category options
 * POST /api/admin/articles -> create as draft (validation §11)
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const rows = await listAllArticles();
  const categories = listJournalCategoryOptions();
  return NextResponse.json({
    data: rows,
    meta: { total: rows.length, categories },
  });
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateArticleInput(body, { partial: false });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await createArticle(validated.value as ArticleInput);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: result.issues },
      { status: result.status },
    );
  }

  const snapshot = await buildVersionSnapshot("article", result.detail.article.id);
  if (snapshot !== null) {
    await recordVersion("article", result.detail.article.id, snapshot);
  }

  await recordActivity({
    action: "created",
    entityType: "article",
    entityId: result.detail.article.id,
    summary: `Article created: ${result.detail.article.title}`,
  });

  return NextResponse.json({ data: result.detail }, { status: 201 });
}
