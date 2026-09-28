import type {
  ContentStatus,
  MediaAspect,
  MediaRef,
  PublishVisibility,
} from "./types";

/** Journal categories (§6.9). */
export const JOURNAL_CATEGORIES = [
  "Project Stories",
  "Behind The Scenes",
  "Photography",
  "Film",
  "Studio Notes",
] as const;

export type JournalCategory = (typeof JOURNAL_CATEGORIES)[number];

/** Allowed article blocks (§6.10), admins compose, never code. */
export const ARTICLE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "image",
  "image_gallery",
  "quote",
  "video",
  "project_reference",
] as const;

export type ArticleBlockType = (typeof ARTICLE_BLOCK_TYPES)[number];

export interface ArticleBlock {
  type: ArticleBlockType;
  /** Copy for paragraph, heading, and quote blocks. */
  text?: string;
  /** Primary media for image/video blocks (placeholder until real assets). */
  media?: MediaRef;
  /** Frames for gallery blocks. */
  items?: MediaRef[];
  /** Slug target for project_reference blocks. */
  referenceSlug?: string;
}

export interface Article {
  slug: string;
  title: string;
  category: JournalCategory;
  /** ISO date, formatted deterministically at render time. */
  publishDate: string;
  excerpt: string;
  cover: MediaRef;
  /** Manifest id of the shipped journal cover photo, when one exists. */
  coverPhotoId?: string;
  /** Optional related project (§6.10: RELATED PROJECT). */
  relatedProjectSlug?: string;
  blocks: ArticleBlock[];
  /** Precomputed reading time (database list rows); preferred when set. */
  readingTime?: string;
  status: ContentStatus;
  visibility: PublishVisibility;
}

/**
 * Reading time computed from the actual article text (about 200 words per
 * minute), so no invented numbers are displayed (R-17). Database rows may
 * carry a precomputed value from the same rule.
 */
export function getReadingTime(article: Article): string {
  if (article.readingTime) return article.readingTime;
  const words = article.blocks
    .map((block) => block.text ?? "")
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/**
 * The four shipped journal stories and their covers. Photos come from
 * journal/ through scripts/build-media.mjs (ids article-01..04); the
 * database owns the text, this map keeps each story on its real print
 * while the studio's own uploads take over later.
 */
export const ARTICLE_COVER_PHOTOS: Record<
  string,
  { photoId: string; aspect: MediaAspect }
> = {
  "life-untolds-in-monochrome": { photoId: "article-01", aspect: "portrait" },
  "laidthis-nite-in-print": { photoId: "article-02", aspect: "square" },
  "the-shape-of-someone": { photoId: "article-03", aspect: "portrait" },
  "before-the-first-note": { photoId: "article-04", aspect: "square" },
};

/**
 * The journal stories (studio set, owner-approved placeholder text until
 * the studio supplies final copy). Four entries, one per shipped print.
 */
export const ARTICLES: Article[] = [
  {
    slug: "life-untolds-in-monochrome",
    title: "Life Untolds, in Monochrome",
    category: "Studio Notes",
    publishDate: "2026-09-10",
    excerpt:
      "We printed a year of portraits in black and white. The paper made most of the decisions for us.",
    cover: { aspect: "portrait", label: "Journal cover · 4:5" },
    coverPhotoId: "article-01",
    blocks: [
      {
        type: "paragraph",
        text: "Printing black and white changes how you look at your own work. Color hides a lot. Grey does not.",
      },
      {
        type: "paragraph",
        text: "We laid the year out on one long table, newest prints on top, and removed anything that needed an explanation before it could be liked.",
      },
      { type: "heading", text: "What survived" },
      {
        type: "paragraph",
        text: "What survived was not the sharpest work. It was the frames where someone was mid-thought, looking somewhere we did not ask them to look.",
      },
      {
        type: "quote",
        text: "A portrait is a record of attention, ours and theirs.",
      },
    ],
    status: "published",
    visibility: "public",
  },
  {
    slug: "laidthis-nite-in-print",
    title: "Laid This Nite, in Print",
    category: "Project Stories",
    publishDate: "2026-08-02",
    excerpt:
      "Four musicians, one room, and a print run that nearly did not happen.",
    cover: { aspect: "square", label: "Journal cover · 1:1" },
    coverPhotoId: "article-02",
    blocks: [
      {
        type: "paragraph",
        text: "The brief was a live session: filmed and photographed in one take, then turned into a short print run for the band's table at shows.",
      },
      {
        type: "paragraph",
        text: "We shot at night with two lights and no retakes. The spread above is the third page, the one where everyone stopped performing for the camera.",
      },
      { type: "heading", text: "Print teaches sequence" },
      {
        type: "paragraph",
        text: "On a screen, order is cheap. On paper, every page has to earn the next one. We cut twelve images down to four.",
      },
      {
        type: "quote",
        text: "The short version is usually the honest one.",
      },
    ],
    status: "published",
    visibility: "public",
  },
  {
    slug: "the-shape-of-someone",
    title: "The Shape of Someone",
    category: "Photography",
    publishDate: "2026-06-19",
    excerpt:
      "Backlight, patience, and the case for photographing people as silhouettes.",
    cover: { aspect: "portrait", label: "Journal cover · 4:5" },
    coverPhotoId: "article-03",
    relatedProjectSlug: "dean-and-deb",
    blocks: [
      {
        type: "paragraph",
        text: "Most [portrait](/services/portrait) advice is about faces. We spent a month photographing people almost entirely as shapes.",
      },
      {
        type: "paragraph",
        text: "Backlight removes detail and keeps posture. A person standing still in a doorway says more about them than a smile usually does.",
      },
      { type: "heading", text: "Waiting for the outline" },
      {
        type: "quote",
        text: "Detail is easy. A shape has to be true.",
      },
      {
        type: "paragraph",
        text: "Not every session earns the silhouette. When it does, it is usually the frame the client picks first.",
      },
    ],
    status: "published",
    visibility: "public",
  },
  {
    slug: "before-the-first-note",
    title: "Before the First Note",
    category: "Behind The Scenes",
    publishDate: "2026-04-27",
    excerpt:
      "Two hours before a shoot, the room is mostly cables and quiet. What the studio does before anyone arrives.",
    cover: { aspect: "square", label: "Journal cover · 1:1" },
    coverPhotoId: "article-04",
    relatedProjectSlug: "tere-and-chris",
    blocks: [
      {
        type: "paragraph",
        text: "We arrive two hours early. Cables get taped down, stands get placed, and someone always walks the room twice to see what the light does at that exact hour.",
      },
      { type: "heading", text: "The sound of a room" },
      {
        type: "paragraph",
        text: "Every room has a hum: a fridge, a fan, a street outside. We record it before the crew arrives, because it becomes the bed the whole film sits on later.",
      },
      {
        type: "quote",
        text: "The work starts before there is anything worth filming.",
      },
      {
        type: "paragraph",
        text: "By the time the first note lands, nothing is left to decide. That is the point.",
      },
    ],
    status: "published",
    visibility: "public",
  },
];
