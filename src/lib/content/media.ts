import manifest from "./media-manifest.json";

/**
 * Typed access to the generated media manifest (scripts/build-media.mjs).
 * The manifest is the single source of truth for real photo/video content:
 * one entry per project folder, originals never served.
 */

export interface PhotoAsset {
  id: string;
  file: string;
  width: number;
  height: number;
  /** width token -> public URL (e.g. "960": "/media/photos/…@960.jpg") */
  variants: Record<string, string>;
}

export interface VideoAsset {
  id: string;
  title: string;
  src: string;
  poster: string | null;
  durationSeconds: number | null;
  sourceBytes: number | null;
  webBytes: number | null;
  wedding: boolean;
}

export interface ProjectMedia {
  slug: string;
  folder: string;
  date: string;
  wedding: boolean;
  photos: PhotoAsset[];
  videos: VideoAsset[];
}

const MEDIA_BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE_URL ?? "").replace(
  /\/+$/,
  "",
);

/**
 * Prefixes site-relative media paths with the deployment's media host
 * (Vercel Blob) when NEXT_PUBLIC_MEDIA_BASE_URL is configured; local
 * development keeps the public-folder paths untouched.
 */
function mediaUrl(url: string): string {
  if (!MEDIA_BASE || !url.startsWith("/")) return url;
  return `${MEDIA_BASE}${url}`;
}

function withMediaBase(photo: PhotoAsset): PhotoAsset {
  return {
    ...photo,
    variants: Object.fromEntries(
      Object.entries(photo.variants).map(([token, url]) => [
        token,
        mediaUrl(url),
      ]),
    ),
  };
}

const PROJECT_MEDIA = ((manifest as { projects?: ProjectMedia[] }).projects ?? []).map(
  (project) => ({
    ...project,
    photos: project.photos.map(withMediaBase),
    videos: project.videos.map((video) => ({
      ...video,
      src: mediaUrl(video.src),
      poster: video.poster ? mediaUrl(video.poster) : null,
    })),
  }),
);
const STUDIO_MEDIA = ((manifest as { studio?: PhotoAsset[] }).studio ?? []).map(
  withMediaBase,
);
const JOURNAL_MEDIA = (
  (manifest as { journal?: PhotoAsset[] }).journal ?? []
).map(withMediaBase);
const FOOTER_AVATARS = (
  (manifest as { footerAvatars?: PhotoAsset[] }).footerAvatars ?? []
).map(withMediaBase);

export function getProjectMedia(slug: string): ProjectMedia | undefined {
  return PROJECT_MEDIA.find((project) => project.slug === slug);
}

/** Studio-owned image (hero, founder); same asset shape as project photos. */
export function getStudioPhoto(id: string): PhotoAsset | undefined {
  return STUDIO_MEDIA.find((photo) => photo.id === id);
}

/** Journal cover print (article-01..04) built from journal/ by the pipeline. */
export function getJournalPhoto(id: string): PhotoAsset | undefined {
  return JOURNAL_MEDIA.find((photo) => photo.id === id);
}

/** Footer avatar portraits built from avatar-footer/ (ordered by filename). */
export function getFooterAvatars(): PhotoAsset[] {
  return FOOTER_AVATARS;
}

export function getAllProjectMedia(): ProjectMedia[] {
  return PROJECT_MEDIA;
}

/** Largest available variant for a photo (viewer use). */
export function largestVariant(photo: PhotoAsset): string {
  const tokens = Object.keys(photo.variants)
    .map(Number)
    .sort((a, b) => b - a);
  for (const token of tokens) {
    const url = photo.variants[String(token)];
    if (url) return url;
  }
  return Object.values(photo.variants)[0] ?? "";
}

/** srcset string built from the variant map. */
export function photoSrcSet(photo: PhotoAsset): string {
  return Object.entries(photo.variants)
    .map(([token, url]) => `${url} ${token}w`)
    .join(", ");
}

/** Smallest available variant (grid thumbnails). */
export function thumbnailVariant(photo: PhotoAsset): string {
  const tokens = Object.keys(photo.variants)
    .map(Number)
    .sort((a, b) => a - b);
  for (const token of tokens) {
    const url = photo.variants[String(token)];
    if (url) return url;
  }
  return Object.values(photo.variants)[0] ?? "";
}

/** Human-friendly duration label: 38s / 2:28 / 12:05. */
export function formatDuration(seconds: number | null): string | null {
  if (!seconds || seconds <= 0) return null;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  if (minutes > 0) {
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }
  return `${secs}s`;
}
