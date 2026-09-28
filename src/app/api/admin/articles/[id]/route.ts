import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  buildVersionSnapshot,
  recordVersion,
} from "@/lib/db/queries/version-history";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  deleteArticleGuarded,
  getArticleDetail,
  updateArticle,
  validateArticleInput,
} from "@/lib/db/queries/articles-admin";

/**
 * Admin article by id (§17).
 * GET    /api/admin/articles/[id] -> article plus category and blocks
 * PATCH  /api/admin/articles/[id] -> partial update (blocks replace whole set)
 * DELETE /api/admin/articles/[id] -> archive-guarded permanent delete (§26)
 */
export const dynamic = "force-dynamic";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid article id: ${rawId}.` },
      { status: 400 },
    );
  }

  const detail = await getArticleDetail(id);
  if (!detail) {
    return NextResponse.json(
      { error: `Article not found: ${id}.` },
      { status: 404 },
    );
  }
  return NextResponse.json({ data: detail });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid article id: ${rawId}.` },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const validated = validateArticleInput(body, { partial: true });
  if (!validated.ok) {
    return NextResponse.json(
      { error: "Validation failed.", issues: validated.issues },
      { status: 400 },
    );
  }

  const result = await updateArticle(id, validated.value);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Update failed.", issues: result.issues },
      { status: result.status },
    );
  }

  const snapshot = await buildVersionSnapshot("article", id);
  if (snapshot !== null) {
    await recordVersion("article", id, snapshot);
  }
  await recordActivity({
    action: "updated",
    entityType: "article",
    entityId: id,
    summary: `Article updated: ${result.detail.article.title}`,
  });

  return NextResponse.json({ data: result.detail });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid article id: ${rawId}.` },
      { status: 400 },
    );
  }

  const result = await deleteArticleGuarded(id);
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.status === 404
            ? result.issues[0]
            : "Cannot delete. Resolve the issues.",
        issues: result.issues,
      },
      { status: result.status },
    );
  }
  await recordActivity({
    action: "deleted",
    entityType: "article",
    entityId: id,
    summary: `Article #${id} deleted.`,
  });
  return NextResponse.json({ data: { id, deleted: true } });
}
