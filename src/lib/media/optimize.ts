import { execFile } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Upload image pipeline (PRD §21): the original is stored storage-only
 * and never served; delivery variants are generated with the built-in
 * sips tool and written under public/media/uploads/<token>/.
 */

export const VARIANT_WIDTHS = [480, 960, 1920] as const;

export type VariantFormat = "thumbnail" | "mobile" | "desktop";

const FORMAT_BY_WIDTH: Record<number, VariantFormat> = {
  480: "thumbnail",
  960: "mobile",
  1920: "desktop",
};

const ORIGINALS_DIR = "data/uploads/originals";
const PUBLIC_UPLOADS_DIR = "public/media/uploads";

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

async function imageSize(file: string): Promise<{ width: number; height: number }> {
  const { stdout } = await execFileAsync("sips", [
    "-g",
    "pixelWidth",
    "-g",
    "pixelHeight",
    file,
  ]);
  const width = Number(stdout.match(/pixelWidth: (\d+)/)?.[1] ?? 0);
  const height = Number(stdout.match(/pixelHeight: (\d+)/)?.[1] ?? 0);
  return { width, height };
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
  const storageKey = join(ORIGINALS_DIR, storedName);
  const publicDir = join(PUBLIC_UPLOADS_DIR, token);
  const publicUrlBase = `/media/uploads/${token}`;

  await mkdir(ORIGINALS_DIR, { recursive: true });
  await mkdir(publicDir, { recursive: true });
  await writeFile(storageKey, buffer);

  const { width, height } = await imageSize(storageKey);
  const maxDim = Math.max(width, height);
  const widths = VARIANT_WIDTHS.filter((variantWidth) => variantWidth < maxDim);

  const variants: OptimizedVariant[] = [];

  if (widths.length === 0) {
    /* Small originals: one delivery copy at their own size. */
    const url = `${publicUrlBase}/${token}@${maxDim}.jpg`;
    await execFileAsync("sips", [
      "-s",
      "format",
      "jpeg",
      "-s",
      "formatOptions",
      "80",
      storageKey,
      "--out",
      join(publicDir, `${token}@${maxDim}.jpg`),
    ]);
    variants.push({ format: "thumbnail", width, height, url });
  } else {
    for (const variantWidth of widths) {
      const variantHeight = Math.round(variantWidth * (height / width));
      const variantFile = `${token}@${variantWidth}.jpg`;
      await execFileAsync("sips", [
        "-Z",
        String(variantWidth),
        "-s",
        "format",
        "jpeg",
        "-s",
        "formatOptions",
        "80",
        storageKey,
        "--out",
        join(publicDir, variantFile),
      ]);
      variants.push({
        format: FORMAT_BY_WIDTH[variantWidth],
        width: variantWidth,
        height: variantHeight,
        url: `${publicUrlBase}/${variantFile}`,
      });
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
  await rm(join(PUBLIC_UPLOADS_DIR, token), { recursive: true, force: true });
  await rm(storageKey, { force: true });
}
