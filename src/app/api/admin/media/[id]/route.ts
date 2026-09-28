import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, MEDIA_ROLES } from "@/lib/api/admin-auth";
import { recordActivity } from "@/lib/db/queries/activity";
import {
  deleteMediaAssetGuarded,
  getMediaAssetDetail,
  mediaUsageLabels,
  updateMediaAsset,
  type MediaMetadataPatch,
} from "@/lib/db/queries/media-admin";

/**
 * Media asset by id (§20).
 * GET    /api/admin/media/[id] -> asset, variants, and "Used in" labels
 * PATCH  /api/admin/media/[id] -> alt text, credit, usage state
 * DELETE /api/admin/media/[id] -> guarded by the Used-in audit
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
  const denied = await requireAdmin(request, { roles: MEDIA_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid asset id: ${rawId}.` },
      { status: 400 },
    );
  }

  const detail = await getMediaAssetDetail(id);
  if (!detail) {
    return NextResponse.json(
      { error: `Asset not found: ${id}.` },
      { status: 404 },
    );
  }
  const usage = await mediaUsageLabels(id);
  return NextResponse.json({ data: { ...detail, usage } });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: MEDIA_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid asset id: ${rawId}.` },
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

  const raw = (body ?? {}) as Record<string, unknown>;
  const issues: string[] = [];
  const patch: MediaMetadataPatch = {};

  if (raw.altText !== undefined) {
    if (raw.altText === null || raw.altText === "") patch.altText = null;
    else if (typeof raw.altText === "string" && raw.altText.trim().length <= 300) {
      patch.altText = raw.altText.trim();
    } else {
      issues.push("altText must be a string of 300 characters or fewer.");
    }
  }
  if (raw.credit !== undefined) {
    if (raw.credit === null || raw.credit === "") patch.credit = null;
    else if (typeof raw.credit === "string" && raw.credit.trim().length <= 200) {
      patch.credit = raw.credit.trim();
    } else {
      issues.push("credit must be a string of 200 characters or fewer.");
    }
  }
  if (raw.usageState !== undefined) {
    if (raw.usageState === "used" || raw.usageState === "unused") {
      patch.usageState = raw.usageState;
    } else {
      issues.push("usageState must be used or unused.");
    }
  }
  if (issues.length === 0 && Object.keys(patch).length === 0) {
    issues.push("Provide at least one metadata field.");
  }

  if (issues.length > 0) {
    return NextResponse.json(
      { error: "Validation failed.", issues },
      { status: 400 },
    );
  }

  const updated = await updateMediaAsset(id, patch);
  if (!updated) {
    return NextResponse.json(
      { error: `Asset not found: ${id}.` },
      { status: 404 },
    );
  }
  await recordActivity({
    action: "updated",
    entityType: "media",
    entityId: id,
    summary: `Media metadata updated: ${updated.filename}`,
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: MEDIA_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid asset id: ${rawId}.` },
      { status: 400 },
    );
  }

  const result = await deleteMediaAssetGuarded(id);
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
    entityType: "media",
    entityId: id,
    summary: `Media asset #${id} deleted.`,
  });
  return NextResponse.json({ data: { id, deleted: true } });
}
