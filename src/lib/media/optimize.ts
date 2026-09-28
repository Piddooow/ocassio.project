import sharp from "sharp";
import {
  deletePublicFolder,
  deleteStoredFile,
  savePublicFile,
  saveStorageOnlyFile,
} from "./storage";

/**
 * Upload image pipeline (PRD §21): the original is stored storage-only
 * and never served; delivery variants are generated with sharp (works
 * locally and on the Node runtime Vercel uses) and written under
 * media/uploads/<token>/ through the storage backend.
 */

export const VARIANT_WIDTHS = [480, 960, 1920] as const;

export type VariantFormat = "thumbnail" | "mobile" | "desktop";

const FORMAT_BY_WIDTH: Record<number, VariantFormat> = {
  480: "thumbnail",
  960: "mobile",
  1920: "desktop",
};

export const ACCEPTED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export interface OptimizedVariant {
  format: VariantFormat;
  width: number;
  height: number;
  url: string;
}

export interface OptimizedImage {
  token: string;
  filename: string;
  storageKey: string;
  width: number;
  height: number;
  fileSize: number;
  variants: OptimizedVariant[];
}

function sanitizeFilename(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return base.replace(/^-+|-+$/g, "") || "image";
}

export async function optimizeImageUpload({
  buffer,
  filename,
  token,
}: {
  buffer: Buffer;
  filename: string;
  token: string;
}): Promise<OptimizedImage> {
  const safeName = sanitizeFilename(filename);
  const storedName = `${token}-${safeName}`;

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (width === 0 || height === 0) {
    throw new Error("The uploaded image could not be read.");
  }

  const storageKey = await saveStorageOnlyFile(
    `uploads/originals/${storedName}`,
    buffer,
  );

  const maxDim = Math.max(width, height);
  const widths = VARIANT_WIDTHS.filter((variantWidth) => variantWidth < maxDim);

  const variants: OptimizedVariant[] = [];

  const storeVariant = async (variantWidth: number, format: VariantFormat) => {
    const pipeline = sharp(buffer).rotate();
    if (variantWidth < maxDim) pipeline.resize({ width: variantWidth });
    const output = await pipeline.jpeg({ quality: 80 }).toBuffer();
    const outputMeta = await sharp(output).metadata();
    const file = `${token}@${variantWidth}.jpg`;
    const url = await savePublicFile(
      `media/uploads/${token}/${file}`,
      output,
      "image/jpeg",
    );
    variants.push({
      format,
      width: outputMeta.width ?? variantWidth,
      height: outputMeta.height ?? Math.round(variantWidth * (height / width)),
      url,
    });
  };

  if (widths.length === 0) {
    /* Small originals: one delivery copy at their own size. */
    await storeVariant(maxDim, "thumbnail");
  } else {
    for (const variantWidth of widths) {
      await storeVariant(variantWidth, FORMAT_BY_WIDTH[variantWidth]);
    }
  }

  return {
    token,
    filename: storedName,
    storageKey,
    width,
    height,
    fileSize: buffer.byteLength,
    variants,
  };
}

/** Removes the stored original and every generated variant for a token. */
export async function removeOptimizedImage(token: string, storageKey: string) {
  await deletePublicFolder(`media/uploads/${token}`);
  await deleteStoredFile(storageKey);
}
