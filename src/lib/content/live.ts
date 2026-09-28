import {
  ARTICLE_COVER_PHOTOS,
  JOURNAL_CATEGORIES,
  type Article,
  type ArticleBlock,
} from "./journal";
import { PROJECTS } from "./projects";
import type { ProcessStep } from "./process";
import type { PricingEntry } from "./pricing";
import {
  RECOGNITION_TYPES,
  STUDIO_ABOUT,
  type Client,
  type Recognition,
} from "./studio";
import type { Service, ServiceType } from "./services";
import type { Project } from "./types";
import type { UpcomingProject } from "./upcoming";
import {
  getPublicArticleBySlug,
  listPublicArticles,
  listRelatedArticles,
} from "@/lib/db/queries/articles";
import { listPublicProcessSteps } from "@/lib/db/queries/process";
import {
  getPublishedServiceBySlug,
  listPublishedServices,
  type PublicServiceDetail,
} from "@/lib/db/queries/services";
import {
  getPublicStudioAbout,
  listPublishedClients,
  listPublishedRecognition,
} from "@/lib/db/queries/studio";
import { listPublicNowEntries } from "@/lib/db/queries/upcoming";
import { slugify } from "@/lib/utils";

/**
 * Live wiring layer: converts database rows into the exact static shapes
 * the public components already consume, so the frontend stays untouched
 * while the CMS becomes the source of truth. Project media still resolves
 * from the media manifest until the Portfolio schema lands.
 */

const projectBySlug = new Map(PROJECTS.map((project) => [project.slug, project]));

function toJournalCategory(name: string | null | undefined): Article["category"] {
  if (name && (JOURNAL_CATEGORIES as readonly string[]).includes(name)) {
    return name as Article["category"];
  }
  return "Studio Notes";
}

function toArticleBlock(row: {
  type: string;
  text: string | null;
}): ArticleBlock | null {
  switch (row.type) {
    case "paragraph":
    case "heading":
    case "quote":
      return { type: row.type, text: row.text ?? "" };
    case "image":
      return {
        type: "image",
        media: { aspect: "landscape", label: "Article image" },
      };
    case "image_gallery":
      return {
        type: "image_gallery",
        items: [{ aspect: "landscape", label: "Gallery frame" }],
      };
    case "video":
      return {
        type: "video",
        media: { aspect: "cinematic", label: "Video, 16:9" },
      };
    case "project_reference":
      /* The relation moves to project ids once the Portfolio schema lands. */
      return { type: "project_reference" };
    default:
      return null;
  }
}

/** Cover print for a shipped story; placeholder frame for future articles. */
function coverFor(slug: string): Pick<Article, "cover" | "coverPhotoId"> {
  const mapped = ARTICLE_COVER_PHOTOS[slug];
  if (!mapped) {
    return { cover: { aspect: "landscape", label: "Journal cover" } };
  }
  return {
    cover: { aspect: mapped.aspect, label: "Journal cover" },
    coverPhotoId: mapped.photoId,
  };
}

function articleFromListRow(row: {
  slug: string;
  title: string;
  category: { name: string; slug: string } | null;
  publishDate: string;
  excerpt: string;
  readingTime: string;
}): Article {
  return {
    slug: row.slug,
    title: row.title,
    category: toJournalCategory(row.category?.name),
    publishDate: row.publishDate,
    excerpt: row.excerpt,
    ...coverFor(row.slug),
    blocks: [],
    readingTime: row.readingTime,
    status: "published",
    visibility: "public",
  };
}

/** Published articles, newest first, in the shape the feed consumes. */
export async function getWiredArticles(limit = 100): Promise<Article[]> {
  const { items } = await listPublicArticles({ limit, offset: 0 });
  return items.map(articleFromListRow);
}

/** A single published article with its mapped body blocks. */
export async function getWiredArticleBySlug(
  slug: string,
): Promise<Article | undefined> {
  const detail = await getPublicArticleBySlug(slug);
  if (!detail) return undefined;
  const blocks = detail.blocks
    .map((block) => toArticleBlock(block))
    .filter((block): block is ArticleBlock => block !== null);
  return {
    ...articleFromListRow(detail),
    blocks,
  };
}

/** Related articles for the detail page, same category first. */
export async function getWiredRelatedArticles(
  slug: string,
  limit: number,
): Promise<Article[]> {
  const related = await listRelatedArticles(slug, limit);
  return (related ?? []).map(articleFromListRow);
}

/* ---------------- Services ---------------- */

export interface WiredService {
  service: Service;
  coverProject?: Project;
  relatedProjects: Project[];
  relatedTitles: string[];
}

function toStaticService(detail: PublicServiceDetail): Service {
  const relatedSlugs = detail.relatedProjects;
  const body = detail.details;
  return {
    slug: detail.slug,
    name: detail.name as ServiceType,
    serviceType: detail.serviceType as ServiceType,
    sortOrder: detail.sortOrder,
    shortDescription: detail.shortDescription,
    description: body?.paragraphs ?? [],
    whoItIsFor: body?.whoItIsFor ?? [],
    deliverables: detail.deliverables,
    startingPrice: null,
    coverProjectSlug: relatedSlugs[0],
    relatedProjectSlugs: relatedSlugs,
    faq: detail.faq.map((entry) => ({
      question: entry.question,
      answer: entry.answer,
    })),
    status: "published",
    visibility: "public",
  };
}

function buildWiredService(detail: PublicServiceDetail): WiredService {
  const service = toStaticService(detail);
  const relatedProjects = service.relatedProjectSlugs
    .map((slug) => projectBySlug.get(slug))
    .filter((project): project is Project => Boolean(project));
  return {
    service,
    coverProject: service.coverProjectSlug
      ? projectBySlug.get(service.coverProjectSlug)
      : undefined,
    relatedProjects,
    relatedTitles: relatedProjects.map((project) => project.title),
  };
}

/** Published services with cover and related-work resolved. */
export async function getWiredServices(): Promise<WiredService[]> {
  const summaries = await listPublishedServices();
  const details = await Promise.all(
    summaries.map((summary) => getPublishedServiceBySlug(summary.slug)),
  );
  return details
    .filter((detail): detail is PublicServiceDetail => Boolean(detail))
    .map(buildWiredService);
}

/** One published service plus its publication-ready pricing preview. */
export async function getWiredServiceBySlug(slug: string): Promise<
  | {
      wired: WiredService;
      pricing: PricingEntry[];
    }
  | undefined
> {
  const detail = await getPublishedServiceBySlug(slug);
  if (!detail) return undefined;
  return {
    wired: buildWiredService(detail),
    pricing: detail.pricing.map((entry) => ({
      id: slugify(entry.packageName) || `pricing-${entry.id}`,
      serviceSlug: detail.slug,
      packageName: entry.packageName,
      priceType: entry.priceType,
      amount: entry.amount === null ? null : String(entry.amount),
      duration: entry.duration,
      deliverables: entry.deliverables,
      notes: entry.notes,
      sortOrder: entry.sortOrder,
      status: "published" as const,
    })),
  };
}

/* ---------------- Process ---------------- */

/** Visible process steps in the static display shape. */
export async function getWiredProcessSteps(): Promise<ProcessStep[]> {
  const steps = await listPublicProcessSteps();
  return steps.map((step) => ({
    number: String(step.stepNumber).padStart(2, "0"),
    title: step.title,
    explanation: step.explanation,
    status: "visible" as const,
  }));
}

/* ---------------- Studio ---------------- */

export interface WiredStudioAbout {
  heading: string;
  paragraphs: string[];
  philosophy: string[];
}

/** The About singleton, falling back to the studio copy until saved. */
export async function getWiredStudioAbout(): Promise<WiredStudioAbout> {
  const about = await getPublicStudioAbout();
  return {
    heading: about?.heading ?? STUDIO_ABOUT.heading,
    paragraphs: about?.body.paragraphs ?? STUDIO_ABOUT.paragraphs,
    philosophy: about?.body.philosophy ?? STUDIO_ABOUT.philosophy,
  };
}

function toRecognitionType(value: string): Recognition["type"] {
  const found = RECOGNITION_TYPES.find(
    (type) => type.toLowerCase() === value.toLowerCase(),
  );
  return found ?? "Feature";
}

/** Published featured clients in the static shape. */
export async function getWiredClients(): Promise<Client[]> {
  const clients = await listPublishedClients({ featuredOnly: true });
  return clients.map((client) => ({
    name: client.name,
    featured: true,
    status: "published" as const,
  }));
}

/** Published recognition entries in the static shape. */
export async function getWiredRecognition(): Promise<Recognition[]> {
  const entries = await listPublishedRecognition();
  return entries.map((entry) => ({
    title: entry.title,
    organization: entry.organization ?? "",
    year: entry.year,
    type: toRecognitionType(entry.recognitionType),
    status: "published" as const,
    visibility: "public" as const,
  }));
}

/* ---------------- Now ---------------- */

/** Public upcoming entries in the static shape the Now card consumes. */
export async function getWiredUpcomingEntries(): Promise<UpcomingProject[]> {
  const entries = await listPublicNowEntries();
  return entries.map((entry) => ({
    slug: `now-${entry.id}`,
    title: entry.title,
    projectType: entry.projectType,
    teaser: entry.teaser,
    location: entry.location ?? "",
    expectedRelease: entry.expectedRelease ?? "",
    status: entry.status,
    cover: { aspect: "landscape", label: `${entry.title} · teaser` },
    visibility: "public" as const,
  }));
}
