import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { del, list, put } from "@vercel/blob";

/**
 * Media storage backends (stack decision: SQLite + local files in
 * development, Vercel Blob on the serverless deployment).
 *
 * - delivery files (image variants, avatars) keep site-relative URLs in
 *   development and become absolute Blob URLs in production;
 * - storage-only files (originals, inquiry attachments) are never linked
 *   and get an unguessable key in both backends;
 * - deletion accepts either backend's key, detected per call, so rows
 *   created before a migration keep deleting cleanly.
 */

/**
 * Storage backend selector:
 *  - Vercel deployments (VERCEL=1) use Blob automatically;
 *  - local development stays on disk so verification uploads never
 *    touch the production store;
 *  - MEDIA_STORAGE=blob|disk overrides either way.
 */
export function blobStorageEnabled(): boolean {
  if (process.env.MEDIA_STORAGE === "disk") return false;
  if (process.env.MEDIA_STORAGE === "blob") return true;
  return process.env.VERCEL === "1";
}

const PUBLIC_ROOT = join(process.cwd(), "public");
const DATA_ROOT = join(process.cwd(), "data");

/** Saves a file that will be served to visitors; returns its URL. */
export async function savePublicFile(
  pathname: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (blobStorageEnabled()) {
    const blob = await put(pathname, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return blob.url;
  }
  const target = join(PUBLIC_ROOT, pathname);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
  return `/${pathname}`;
}

/** Saves a storage-only file; returns a key for later deletion. */
export async function saveStorageOnlyFile(
  pathname: string,
  body: Buffer,
): Promise<string> {
  if (blobStorageEnabled()) {
    const blob = await put(pathname, body, {
      access: "public",
      addRandomSuffix: true,
      allowOverwrite: false,
    });
    return blob.url;
  }
  const target = join(DATA_ROOT, pathname);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, body);
  return join("data", pathname);
}

/** Deletes one stored file by its key (local path or Blob URL). */
export async function deleteStoredFile(storageKey: string): Promise<void> {
  if (blobStorageEnabled()) {
    if (storageKey.startsWith("http")) {
      await del(storageKey).catch(() => {});
      return;
    }
    const { blobs } = await list({ prefix: storageKey });
    if (blobs.length > 0) {
      await del(blobs.map((blob) => blob.url)).catch(() => {});
    }
    return;
  }
  await rm(storageKey, { force: true });
}

/** Deletes every stored file under a public path prefix. */
export async function deletePublicFolder(prefix: string): Promise<void> {
  if (blobStorageEnabled()) {
    const { blobs } = await list({ prefix });
    if (blobs.length > 0) {
      await del(blobs.map((blob) => blob.url)).catch(() => {});
    }
    return;
  }
  await rm(join(PUBLIC_ROOT, prefix), { recursive: true, force: true });
}
