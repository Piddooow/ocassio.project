import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdmin, EDITOR_ROLES } from "@/lib/api/admin-auth";
import {
  createAssetWithVariants,
  deleteAssetRow,
  getAssetWithVariants,
  setEntryMedia,
} from "@/lib/db/queries/media-admin";
import { getUpcomingEntryById } from "@/lib/db/queries/upcoming-admin";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  optimizeImageUpload,
  removeOptimizedImage,
} from "@/lib/media/optimize";

/**
 * Teaser image for a Now entry.
 * POST   /api/admin/now/[id]/image  -> upload, optimize, link (replace)
 * DELETE /api/admin/now/[id]/image  -> unlink, delete rows and files
 *
 * The uploaded original is stored storage-only; only optimized variants
 * are served publicly (PRD §21).
 */
export const dynamic = "force-dynamic";

const TOKEN_LENGTH = 32;

function tokenFromStoredName(storedName: string): string {
  return storedName.slice(0, TOKEN_LENGTH);
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function publicAssetShape(asset: {
  id: number;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  fileSize: number;
  altText: string | null;
  usageState: string;
}) {
  return {
    id: asset.id,
    filename: asset.filename,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    fileSize: asset.fileSize,
    altText: asset.altText,
    usageState: asset.usageState,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid entry id: ${rawId}.` },
      { status: 400 },
    );
  }
  const entry = await getUpcomingEntryById(id);
  if (!entry) {
    return NextResponse.json(
      { error: `Entry not found: ${id}.` },
      { status: 404 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request must be multipart form data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "A file field named 'file' is required." },
      { status: 400 },
    );
  }
  if (
    !ACCEPTED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ACCEPTED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    return NextResponse.json(
      {
        error: `Teaser image must be one of: ${ACCEPTED_IMAGE_MIME_TYPES.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Teaser image must be 15 MB or smaller." },
      { status: 400 },
    );
  }

  const altValue = form.get("alt");
  const altText =
    typeof altValue === "string" && altValue.trim().length > 0
      ? altValue.trim()
      : null;

  /* Replace semantics: clean up any previous teaser image first. */
  if (entry.mediaId) {
    const existing = await getAssetWithVariants(entry.mediaId);
    if (existing) {
      await removeOptimizedImage(
        tokenFromStoredName(existing.asset.filename),
        existing.asset.storageKey,
      );
      await deleteAssetRow(existing.asset.id);
    }
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const optimized = await optimizeImageUpload({
    buffer,
    filename: file.name || "teaser",
    token,
  });
  const { asset, variants } = await createAssetWithVariants(
    {
      filename: optimized.filename,
      mimeType: file.type,
      width: optimized.width,
      height: optimized.height,
      fileSize: optimized.fileSize,
      storageKey: optimized.storageKey,
      altText,
    },
    optimized.variants,
  );
  const updatedEntry = await setEntryMedia(id, asset.id);

  return NextResponse.json(
    {
      data: {
        entry: updatedEntry,
        asset: publicAssetShape(asset),
        variants: variants.map((variant) => ({
          format: variant.format,
          url: variant.url,
          width: variant.width,
          height: variant.height,
        })),
      },
    },
    { status: 201 },
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await requireAdmin(request, { roles: EDITOR_ROLES });
  if (denied) return denied;

  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json(
      { error: `Invalid entry id: ${rawId}.` },
      { status: 400 },
    );
  }
  const entry = await getUpcomingEntryById(id);
  if (!entry) {
    return NextResponse.json(
      { error: `Entry not found: ${id}.` },
      { status: 404 },
    );
  }
  if (!entry.mediaId) {
    return NextResponse.json(
      { error: "This entry has no teaser image." },
      { status: 400 },
    );
  }

  const existing = await getAssetWithVariants(entry.mediaId);
  if (existing) {
    await removeOptimizedImage(
      tokenFromStoredName(existing.asset.filename),
      existing.asset.storageKey,
    );
    await deleteAssetRow(existing.asset.id);
  }
  await setEntryMedia(id, null);

  return NextResponse.json({ data: { id, deleted: true } });
}
