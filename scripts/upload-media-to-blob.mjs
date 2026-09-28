/**
 * Uploads the built media library (public/media) to the production Blob
 * store so Vercel can serve it (deployments cannot carry the 637 MB of
 * video). Paths map 1:1: public/media/photos/x@480.jpg becomes
 * <blob-url>/media/photos/x@480.jpg, so NEXT_PUBLIC_MEDIA_BASE_URL is
 * simply the store URL.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... bun scripts/upload-media-to-blob.mjs
 *   BLOB_READ_WRITE_TOKEN=... bun scripts/upload-media-to-blob.mjs --dry-run
 *
 * Idempotent: existing blobs are overwritten with the same content and
 * the same path, so re-running after a media rebuild is safe.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { put } from "@vercel/blob";

const ROOT = "public/media";
const DRY_RUN = process.argv.includes("--dry-run");
const CONCURRENCY = 4;

const CONTENT_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.isFile() && !entry.name.startsWith(".")) {
      files.push(path);
    }
  }
  return files;
}

const token =
  process.env.BLOB_READ_WRITE_TOKEN ??
  (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN
    ? "oidc"
    : undefined);
if (!token && !DRY_RUN) {
  console.error(
    "No Blob credentials found. Either set BLOB_READ_WRITE_TOKEN, or run " +
      "`vercel env pull .env.local` so the SDK can use BLOB_STORE_ID + " +
      "VERCEL_OIDC_TOKEN.",
  );
  process.exit(1);
}

const files = await walk(ROOT);
files.sort();

let uploaded = 0;
let skipped = 0;
let bytes = 0;

async function uploadOne(file) {
  const info = await stat(file);
  const relativePath = relative(ROOT, file);
  const pathname = `media/${relativePath}`;
  const extension = file.slice(file.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";

  if (DRY_RUN) {
    console.log(`[dry-run] ${pathname} (${(info.size / 1024 / 1024).toFixed(2)} MB)`);
    skipped += 1;
    return;
  }

  const body = await readFile(file);
  await put(pathname, body, {
    access: "public",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
    multipart: info.size > 40 * 1024 * 1024,
  });
  uploaded += 1;
  bytes += info.size;
  if (uploaded % 25 === 0 || info.size > 40 * 1024 * 1024) {
    console.log(`uploaded ${uploaded}/${files.length} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  }
}

let cursor = 0;
async function worker() {
  while (cursor < files.length) {
    const file = files[cursor];
    cursor += 1;
    await uploadOne(file);
  }
}

await Promise.all(
  Array.from({ length: Math.min(CONCURRENCY, files.length) }, () => worker()),
);

if (DRY_RUN) {
  console.log(`dry run: ${files.length} files would be uploaded`);
} else {
  console.log(
    `done: ${uploaded} files uploaded (${(bytes / 1024 / 1024).toFixed(1)} MB)`,
  );
}
