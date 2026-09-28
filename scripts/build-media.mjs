#!/usr/bin/env bun
/**
 * Media pipeline for real Ocassio.Project content.
 *
 * Scans ocassio-list-projects/ (the storage-only source of truth) and:
 *   - photos -> public/media/photos/<slug>/<id>@480|960|1920.jpg (sips)
 *   - videos -> public/media/videos/<slug>/<id>.mp4 (avconvert, web H.264)
 *               + <id>-poster.jpg (qlmanage first frame)
 *   - writes src/lib/content/media-manifest.json (single data source)
 *
 * Originals are never copied or served as-is. Deterministic + idempotent.
 *
 * Usage:
 *   bun scripts/build-media.mjs [--photos] [--videos] [--force]
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join } from "node:path";

const SRC_ROOT = "ocassio-list-projects";
const PHOTOS_DIR = "public/media/photos";
const VIDEOS_DIR = "public/media/videos";
const STUDIO_SRC = "logo-ocassio-project";
const STUDIO_DIR = "public/media/studio";
const JOURNAL_SRC = "journal";
const JOURNAL_DIR = "public/media/journal";
const AVATAR_SRC = "avatar-footer";
const AVATAR_DIR = "public/media/footer";
const MANIFEST_PATH = "src/lib/content/media-manifest.json";

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const ONLY_PHOTOS = args.has("--photos");
const ONLY_VIDEOS = args.has("--videos");

/** Folder -> canonical project mapping (agreed with the studio). */
const PROJECTS = [
  {
    match: "Dean & Deb",
    slug: "dean-and-deb",
    date: "2026-07-26",
    wedding: false,
  },
  {
    match: "Sunday School",
    slug: "sunday-school",
    date: "2026-01-28",
    wedding: false,
  },
  {
    match: "The Wedding of Tere & Chris",
    slug: "tere-and-chris",
    date: "2025-10-28",
    wedding: true,
  },
  {
    match: "The Engagement of Nisa & Taffy",
    slug: "nisa-and-taffy",
    date: "2023-07-03",
    wedding: false,
  },
  {
    match: "Adifa & Adila Birthday",
    slug: "adifa-and-adila",
    date: "2023-06-23",
    wedding: false,
  },
];

/** Resolves the storage folder by its stable name prefix. */
function resolveSourceDir(match) {
  const dirs = readdirSync(SRC_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(match))
    .map((entry) => entry.name);
  if (dirs.length !== 1) {
    console.error(
      `✗ Cannot resolve a unique source folder for "${match}" (found ${dirs.length})`,
    );
    process.exit(1);
  }
  return join(SRC_ROOT, dirs[0]);
}

const PHOTO_WIDTHS = [480, 960, 1920];
const JPEG_QUALITY = 80;

/** Studio-owned images (hero, founder, about) outside project folders. */
const STUDIO_PHOTOS = [
  { id: "hero-1", file: "photo-hero-section-1.jpg" },
  { id: "yehuda-alfa", file: "yehuda-alfa-photographer.jpg" },
  { id: "about-hero-1", file: "about-us-hero-sectio-001.jpg" },
];

/** Journal cover prints (article-01..04) from journal/. */
const JOURNAL_PHOTOS = [
  { id: "article-01", file: "journal:article-01.jpg" },
  { id: "article-02", file: "journal:article-02.jpg" },
  { id: "article-03", file: "journal:article-03.jpg" },
  { id: "article-04", file: "journal:article-04.jpg" },
];

/**
 * Footer avatar photos (studio-supplied portraits in avatar-footer/).
 * The folder is scanned, so adding or removing a photo re-syncs the set
 * on the next run without touching this file.
 */
function scanAvatarEntries() {
  const files = readdirSync(AVATAR_SRC, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(jpe?g|png)$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  const usedIds = new Set();
  return files.map((file) => {
    let id = sanitizeId(file);
    while (usedIds.has(id)) id = `${id}-x`;
    usedIds.add(id);
    return { id, file };
  });
}

/**
 * Web video preset by duration (avconvert presets are high-bitrate, so long
 * films get smaller frames to stay streamable; short cuts keep full quality):
 *   <= 30s  -> 1080p   (teasers, story pieces)
 *   <= 75s  -> 720p
 *   > 75s   -> 540p    (full films)
 */
function presetForDuration(seconds) {
  if (!seconds || seconds <= 30) return "Preset1920x1080";
  if (seconds <= 75) return "Preset1280x720";
  return "Preset960x540";
}

function run(cmd, cmdArgs) {
  return execFileSync(cmd, cmdArgs, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function sanitizeId(name) {
  const base = name
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "item";
}

function listFilesRecursive(dir, predicate) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...listFilesRecursive(full, predicate));
    } else if (predicate(entry.name)) {
      found.push(full);
    }
  }
  return found.sort((a, b) => a.localeCompare(b, "en"));
}

function imageSize(file) {
  const out = run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const width = Number(out.match(/pixelWidth: (\d+)/)?.[1] ?? 0);
  const height = Number(out.match(/pixelHeight: (\d+)/)?.[1] ?? 0);
  return { width, height };
}

function videoDuration(file) {
  try {
    const out = run("mdls", ["-name", "kMDItemDurationSeconds", "-raw", file]);
    const value = Number(out.trim());
    return Number.isFinite(value) && value > 0 ? Math.round(value * 10) / 10 : null;
  } catch {
    return null;
  }
}

function buildPhotos(project, sourceDir) {
  const outDir = join(PHOTOS_DIR, project.slug);
  mkdirSync(outDir, { recursive: true });

  const files = listFilesRecursive(sourceDir, (name) =>
    /\.(jpe?g)$/i.test(name),
  );

  const photos = [];
  const usedIds = new Set();
  let generated = 0;

  for (const file of files) {
    let id = sanitizeId(basename(file));
    while (usedIds.has(id)) id = `${id}-x`;
    usedIds.add(id);

    const { width, height } = imageSize(file);
    const maxDim = Math.max(width, height);
    const variants = {};

    const widths = PHOTO_WIDTHS.filter((w) => w < maxDim);
    for (const w of widths) {
      const out = join(outDir, `${id}@${w}.jpg`);
      if (FORCE || !existsSync(out)) {
        run("sips", [
          "-Z",
          String(w),
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          String(JPEG_QUALITY),
          file,
          "--out",
          out,
        ]);
        generated += 1;
      }
      variants[String(w)] = `/media/photos/${project.slug}/${id}@${w}.jpg`;
    }

    if (widths.length === 0) {
      // Safety: never upscale; fall back to a 1920 max variant of the original.
      const fallback = join(outDir, `${id}@original.jpg`);
      if (FORCE || !existsSync(fallback)) {
        run("sips", [
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          String(JPEG_QUALITY),
          file,
          "--out",
          fallback,
        ]);
        generated += 1;
      }
      variants[String(maxDim)] = `/media/photos/${project.slug}/${id}@original.jpg`;
    }

    photos.push({ id, file: basename(file), width, height, variants });
  }

  return { photos, generated };
}

/** Flat photo sets (studio images, journal covers) from a single folder. */
function buildFlatPhotos(entries, srcDir, outDir, urlPrefix) {
  mkdirSync(outDir, { recursive: true });
  const photos = [];

  for (const entry of entries) {
    const file = join(srcDir, entry.file);
    if (!existsSync(file)) {
      console.error(`✗ Missing photo: ${file}`);
      process.exit(1);
    }

    const { width, height } = imageSize(file);
    const maxDim = Math.max(width, height);
    const variants = {};

    const widths = PHOTO_WIDTHS.filter((w) => w < maxDim);
    for (const w of widths) {
      const out = join(outDir, `${entry.id}@${w}.jpg`);
      if (FORCE || !existsSync(out)) {
        run("sips", [
          "-Z",
          String(w),
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          String(JPEG_QUALITY),
          file,
          "--out",
          out,
        ]);
      }
      variants[String(w)] = `${urlPrefix}/${entry.id}@${w}.jpg`;
    }

    if (widths.length === 0) {
      const fallback = join(outDir, `${entry.id}@original.jpg`);
      if (FORCE || !existsSync(fallback)) {
        run("sips", [
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          String(JPEG_QUALITY),
          file,
          "--out",
          fallback,
        ]);
      }
      variants[String(maxDim)] = `${urlPrefix}/${entry.id}@original.jpg`;
    }

    photos.push({ id: entry.id, file: entry.file, width, height, variants });
  }

  return photos;
}

function buildVideos(project, sourceDir) {
  const outDir = join(VIDEOS_DIR, project.slug);
  mkdirSync(outDir, { recursive: true });

  const files = listFilesRecursive(sourceDir, (name) => /\.mp4$/i.test(name));

  const videos = [];
  const usedIds = new Set();

  for (const file of files) {
    let id = sanitizeId(basename(file));
    while (usedIds.has(id)) id = `${id}-x`;
    usedIds.add(id);

    const sourceBytes = statSync(file).size;
    const durationSeconds = videoDuration(file);
    const preset = presetForDuration(durationSeconds);
    const out = join(outDir, `${id}.mp4`);

    if (FORCE || !existsSync(out)) {
      run("avconvert", ["-p", preset, "-s", file, "-o", out, "--replace"]);
    }

    const poster = join(outDir, `${id}-poster.jpg`);
    if (FORCE || !existsSync(poster)) {
      const rawPoster = `${poster}.png`;
      run("qlmanage", ["-t", "-s", "1600", "-o", outDir, file]);
      const produced = join(outDir, `${basename(file)}.png`);
      if (existsSync(produced)) {
        run("sips", [
          "-s",
          "format",
          "jpeg",
          "-s",
          "formatOptions",
          "82",
          produced,
          "--out",
          poster,
        ]);
        execFileSync("rm", ["-f", produced]);
      }
    }

    videos.push({
      id,
      title: basename(file).replace(/\.mp4$/i, "").trim(),
      src: `/media/videos/${project.slug}/${id}.mp4`,
      poster: existsSync(poster)
        ? `/media/videos/${project.slug}/${id}-poster.jpg`
        : null,
      durationSeconds,
      sourceBytes,
      webBytes: existsSync(out) ? statSync(out).size : null,
      wedding: project.wedding,
    });
  }

  return videos;
}

const manifestProjects = [];
let totalPhotos = 0;
let totalVideos = 0;
let totalGeneratedPhotos = 0;

for (const project of PROJECTS) {
  const sourceDir = resolveSourceDir(project.match);

  let photos = [];
  let generated = 0;
  if (!ONLY_VIDEOS) {
    const photoResult = buildPhotos(project, sourceDir);
    photos = photoResult.photos;
    generated = photoResult.generated;
  }

  let videos = [];
  if (!ONLY_PHOTOS) {
    videos = buildVideos(project, sourceDir);
  }

  const sourcePhotoCount = listFilesRecursive(sourceDir, (name) =>
    /\.(jpe?g)$/i.test(name),
  ).length;
  const sourceVideoCount = listFilesRecursive(sourceDir, (name) =>
    /\.mp4$/i.test(name),
  ).length;

  if (!ONLY_VIDEOS && photos.length !== sourcePhotoCount) {
    console.error(
      `✗ Photo count mismatch for ${project.slug}: manifest=${photos.length} source=${sourcePhotoCount}`,
    );
    process.exit(1);
  }
  if (!ONLY_PHOTOS && videos.length !== sourceVideoCount) {
    console.error(
      `✗ Video count mismatch for ${project.slug}: manifest=${videos.length} source=${sourceVideoCount}`,
    );
    process.exit(1);
  }

  totalPhotos += sourcePhotoCount;
  totalVideos += sourceVideoCount;
  totalGeneratedPhotos += generated;

  manifestProjects.push({
    slug: project.slug,
    folder: basename(sourceDir),
    date: project.date,
    wedding: project.wedding,
    photos,
    videos,
  });

  const videoMb = videos.reduce(
    (sum, video) => sum + (video.webBytes ?? 0) / 1024 / 1024,
    0,
  );
  console.log(
    `✓ ${project.slug.padEnd(16)} photos=${photos.length}/${sourcePhotoCount}  videos=${videos.length}/${sourceVideoCount}` +
      (videos.length ? `  web≈${videoMb.toFixed(1)}MB` : ""),
  );
}

const studioPhotos = ONLY_VIDEOS
  ? []
  : buildFlatPhotos(STUDIO_PHOTOS, STUDIO_SRC, STUDIO_DIR, "/media/studio");
if (studioPhotos.length > 0) {
  console.log(
    `✓ studio           photos=${studioPhotos.length} (${studioPhotos.map((p) => p.id).join(", ")})`,
  );
}

const journalPhotos = ONLY_VIDEOS
  ? []
  : buildFlatPhotos(JOURNAL_PHOTOS, JOURNAL_SRC, JOURNAL_DIR, "/media/journal");
if (journalPhotos.length > 0) {
  console.log(
    `✓ journal          photos=${journalPhotos.length} (${journalPhotos.map((p) => p.id).join(", ")})`,
  );
}

const footerAvatars = ONLY_VIDEOS
  ? []
  : buildFlatPhotos(
      scanAvatarEntries(),
      AVATAR_SRC,
      AVATAR_DIR,
      "/media/footer",
    );
if (footerAvatars.length > 0) {
  console.log(
    `✓ footer avatars   photos=${footerAvatars.length} (${footerAvatars.map((p) => p.id).join(", ")})`,
  );
}

const manifest = {
  generatedAt: new Date().toISOString(),
  projects: manifestProjects,
  studio: studioPhotos,
  journal: journalPhotos,
  footerAvatars,
};

mkdirSync("src/lib/content", { recursive: true });
writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `\nManifest -> ${MANIFEST_PATH}\nAudit: ${totalPhotos} photos, ${totalVideos} videos (${totalGeneratedPhotos} photo variants generated this run).`,
);
