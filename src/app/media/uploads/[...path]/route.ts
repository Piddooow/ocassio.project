import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join, normalize, resolve } from "node:path";

/**
 * Serves runtime-uploaded media (public/media/uploads/**).
 *
 * Static assets that exist at build time are served by the public folder;
 * files uploaded while the server runs are not in the production filesystem
 * map, so this route streams them from disk with the same cache policy.
 * Path traversal is rejected before any filesystem access.
 */
const UPLOADS_ROOT = resolve("public/media/uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const relative = normalize(path.join("/"));

  if (relative.includes("..") || relative.startsWith("/")) {
    return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
  }

  const filePath = resolve(join(UPLOADS_ROOT, relative));
  if (!filePath.startsWith(`${UPLOADS_ROOT}/`)) {
    return NextResponse.json({ error: "Invalid media path." }, { status: 400 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("not a file");
    const data = await readFile(filePath);
    const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }
}
