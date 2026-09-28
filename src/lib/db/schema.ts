import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { USER_ROLES, USER_STATUSES } from "@/lib/auth/roles";

/**
 * Database schema (SQLite / Drizzle), shaped after PRD §26.
 * This module currently covers the Journal slice of phase 1; other
 * entities (users, media, projects, inquiries, ...) arrive with their
 * own backend tasks and are referenced by id until then.
 */

/* ---------------- Enumerations (PRD §26.1) ---------------- */

export const CONTENT_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;

export const PUBLISH_VISIBILITIES = ["public", "private"] as const;

export const ARTICLE_BLOCK_TYPES = [
  "paragraph",
  "heading",
  "image",
  "image_gallery",
  "quote",
  "video",
  "project_reference",
] as const;

export const UPCOMING_STATUSES = ["in_production", "coming_soon"] as const;

export const MEDIA_TYPES = ["image", "video"] as const;

export const MEDIA_VARIANT_FORMATS = [
  "thumbnail",
  "mobile",
  "tablet",
  "desktop",
  "webp",
  "avif",
] as const;

export const MEDIA_USAGE_STATES = ["used", "unused"] as const;

/** Inquiry pipeline (PRD §17): stages plus the DECLINED terminal state. */
export const INQUIRY_STATUSES = [
  "new",
  "reviewed",
  "contacted",
  "discovery",
  "proposal_sent",
  "booked",
  "completed",
  "declined",
] as const;

/** Recognition kinds (PRD §26.1, §18 Studio Management). */
export const RECOGNITION_TYPES = [
  "publication",
  "award",
  "feature",
  "exhibition",
] as const;

/** Pricing entry types (PRD §26.1, §6.6): Fixed, Starting From, Custom Quote. */
export const PRICE_TYPES = ["fixed", "starting_from", "custom_quote"] as const;

/** Process step visibility (§16 Process Management: the Hide action). */
export const PROCESS_STEP_STATUSES = ["visible", "hidden"] as const;

/* ---------------- Journal: categories ---------------- */

export const journalCategories = sqliteTable(
  "journal_categories",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [uniqueIndex("journal_categories_slug_idx").on(table.slug)],
);

/* ---------------- Journal: articles ---------------- */

export const articles = sqliteTable(
  "articles",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    categoryId: integer("category_id").references(() => journalCategories.id, {
      onDelete: "set null",
    }),
    /** References media_assets.id once the media schema task lands. */
    coverMediaId: integer("cover_media_id"),
    excerpt: text("excerpt").notNull(),
    /** Optional byline shown on the article page (§17). */
    author: text("author"),
    /** References projects.id once the portfolio schema task lands. */
    relatedProjectId: integer("related_project_id"),
    /** ISO date string, formatted deterministically at render time. */
    publishDate: text("publish_date").notNull(),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    visibility: text("visibility", { enum: PUBLISH_VISIBILITIES })
      .notNull()
      .default("public"),
    publishAt: text("publish_at"),
    seoMetaTitle: text("seo_meta_title"),
    seoMetaDescription: text("seo_meta_description"),
    /** References media_assets.id once the media schema task lands. */
    seoOgMediaId: integer("seo_og_media_id"),
    /** References users.id once the users schema task lands. */
    createdBy: integer("created_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("articles_slug_idx").on(table.slug),
    index("articles_status_visibility_idx").on(table.status, table.visibility),
    index("articles_category_idx").on(table.categoryId),
  ],
);

/* ---------------- Journal: article blocks ---------------- */

export const articleBlocks = sqliteTable(
  "article_blocks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    articleId: integer("article_id")
      .notNull()
      .references(() => articles.id, { onDelete: "cascade" }),
    blockType: text("block_type", { enum: ARTICLE_BLOCK_TYPES }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    textContent: text("text_content"),
    /** References media_assets.id once the media schema task lands. */
    mediaId: integer("media_id"),
    /** References projects.id once the portfolio schema task lands. */
    referenceProjectId: integer("reference_project_id"),
  },
  (table) => [index("article_blocks_article_idx").on(table.articleId)],
);

/* ---------------- Current: upcoming projects (§6.11, §19) ---------------- */

export const upcomingProjects = sqliteTable(
  "upcoming_projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    projectType: text("project_type").notNull(),
    /** Public teaser copy. */
    description: text("description").notNull(),
    /** References media_assets.id once the media schema task lands. */
    mediaId: integer("media_id"),
    location: text("location"),
    expectedRelease: text("expected_release"),
    status: text("status", { enum: UPCOMING_STATUSES })
      .notNull()
      .default("coming_soon"),
    visibility: text("visibility", { enum: PUBLISH_VISIBILITIES })
      .notNull()
      .default("public"),
    publishAt: text("publish_at"),
    sortOrder: integer("sort_order").notNull().default(0),
    /** References projects.id once the portfolio schema task lands. */
    relatedProjectId: integer("related_project_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("upcoming_projects_status_visibility_idx").on(
      table.status,
      table.visibility,
    ),
  ],
);

/* ---------------- Media: assets and variants (§20, §21, §26.2) ---------------- */

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    filename: text("filename").notNull(),
    mediaType: text("media_type", { enum: MEDIA_TYPES })
      .notNull()
      .default("image"),
    mimeType: text("mime_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    fileSize: integer("file_size").notNull(),
    /** Storage-only path for the original; never served publicly (§21). */
    storageKey: text("storage_key").notNull(),
    altText: text("alt_text"),
    credit: text("credit"),
    focalPointX: integer("focal_point_x"),
    focalPointY: integer("focal_point_y"),
    usageState: text("usage_state", { enum: MEDIA_USAGE_STATES })
      .notNull()
      .default("used"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("media_assets_usage_idx").on(table.usageState)],
);

export const mediaVariants = sqliteTable(
  "media_variants",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    assetId: integer("asset_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    format: text("format", { enum: MEDIA_VARIANT_FORMATS }).notNull(),
    url: text("url").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
  },
  (table) => [index("media_variants_asset_idx").on(table.assetId)],
);

/* ---------------- Business: project inquiries (§6.13, §17, §23) ---------------- */

export interface InquiryAttachment {
  filename: string;
  mimeType: string;
  size: number;
  /** Storage-only path; attachments are never served publicly. */
  storageKey: string;
}

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /* Section 1: contact */
    fullName: text("full_name").notNull(),
    company: text("company"),
    email: text("email").notNull(),
    whatsapp: text("whatsapp"),
    /* Section 2: project */
    service: text("service").notNull(),
    projectType: text("project_type").notNull(),
    projectDescription: text("project_description").notNull(),
    /* Section 3: production */
    desiredDate: text("desired_date"),
    location: text("location"),
    budgetRange: text("budget_range"),
    expectedDeliverables: text("expected_deliverables"),
    /* Section 4: references */
    referenceUrl: text("reference_url"),
    attachments: text("attachments", { mode: "json" }).$type<
      InquiryAttachment[]
    >(),
    /* Internal */
    status: text("status", { enum: INQUIRY_STATUSES })
      .notNull()
      .default("new"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("inquiries_status_idx").on(table.status),
    index("inquiries_created_idx").on(table.createdAt),
  ],
);

/* ---------------- Website: legal pages (§6.14) ---------------- */

export interface LegalContentBlock {
  type: "heading" | "paragraph";
  text: string;
}

export const legalPages = sqliteTable(
  "legal_pages",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    /** Structured body: ordered heading/paragraph blocks. */
    body: text("body", { mode: "json" })
      .$type<LegalContentBlock[]>()
      .notNull(),
    updatedDate: text("updated_date").notNull(),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    /** ISO timestamp for scheduled publishing (lazy auto-publish). */
    publishAt: text("publish_at"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex("legal_pages_slug_idx").on(table.slug)],
);

/* ---------------- Studio: about, team, clients, recognition (§6.8, §18) ---------------- */

/** Structured About body: opening prose plus the philosophy lines. */
export interface StudioAboutBody {
  paragraphs: string[];
  philosophy: string[];
}

/** Singleton: only one About page exists (§18). */
export const studioAbout = sqliteTable("studio_about", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  heading: text("heading").notNull(),
  body: text("body", { mode: "json" }).$type<StudioAboutBody>().notNull(),
  /** References media_assets.id; hero / portrait art for the page. */
  supportingMediaId: integer("supporting_media_id"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** Team and collaborators (§18); display order controls the page list. */
export const teamMembers = sqliteTable(
  "team_members",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    roleTitle: text("role_title").notNull(),
    /** References media_assets.id. */
    photoMediaId: integer("photo_media_id"),
    bio: text("bio"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    visibility: text("visibility", { enum: PUBLISH_VISIBILITIES })
      .notNull()
      .default("public"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("team_members_status_visibility_idx").on(
      table.status,
      table.visibility,
    ),
  ],
);

/** Selected clients (§18); featured clients surface on Home and About. */
export const clients = sqliteTable(
  "clients",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    /** References media_assets.id. */
    logoMediaId: integer("logo_media_id"),
    website: text("website"),
    featured: integer("featured", { mode: "boolean" })
      .notNull()
      .default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("clients_status_featured_idx").on(table.status, table.featured),
  ],
);

/** Recognition and publication entries (§18). */
export const recognition = sqliteTable(
  "recognition",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    organization: text("organization"),
    year: integer("year").notNull(),
    url: text("url"),
    recognitionType: text("recognition_type", { enum: RECOGNITION_TYPES })
      .notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("recognition_status_year_idx").on(table.status, table.year),
  ],
);

/* ---------------- Services: services, details, pricing (§6.4-§6.6) ---------------- */

/** Services offered publicly (§6.4); cover comes from supporting media. */
export const services = sqliteTable(
  "services",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** One of the documented initial service types (§6.4). */
    serviceType: text("service_type").notNull(),
    shortDescription: text("short_description").notNull(),
    /** References media_assets.id; service cover / hero art. */
    supportingMediaId: integer("supporting_media_id"),
    seoMetaTitle: text("seo_meta_title"),
    seoMetaDescription: text("seo_meta_description"),
    /** References media_assets.id. */
    seoOgMediaId: integer("seo_og_media_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("services_slug_idx").on(table.slug),
    index("services_status_idx").on(table.status),
  ],
);

/** Long-form Service Detail body (§6.5): exactly one row per service. */
export interface ServiceDetailBody {
  paragraphs: string[];
  whoItIsFor: string[];
}

export const serviceDetails = sqliteTable(
  "service_details",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    bodyBlocks: text("body_blocks", { mode: "json" })
      .$type<ServiceDetailBody>()
      .notNull(),
    deliverables: text("deliverables", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("service_details_service_idx").on(table.serviceId),
  ],
);

/** Pricing entries (§6.6); custom quotes keep the amount empty. */
export const pricing = sqliteTable(
  "pricing",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    packageName: text("package_name").notNull(),
    priceType: text("price_type", { enum: PRICE_TYPES }).notNull(),
    /** Whole-currency amount; stays null for custom quotes (§6.6). */
    amount: integer("amount"),
    currency: text("currency"),
    duration: text("duration"),
    deliverables: text("deliverables", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("pricing_service_idx").on(table.serviceId),
    index("pricing_status_idx").on(table.status),
  ],
);

/* ---------------- Process steps and FAQ (§6.7, §16) ---------------- */

/** Ordered process steps (§6.7); Hide toggles status without deleting. */
export const processSteps = sqliteTable("process_steps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Display number, formatted two-digit at render time. */
  stepNumber: integer("step_number").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  status: text("status", { enum: PROCESS_STEP_STATUSES })
    .notNull()
    .default("visible"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/** FAQ entries (§12.4); surfaced on Service Detail pages. */
export const faq = sqliteTable(
  "faq",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("faq_status_idx").on(table.status)],
);

/* ---------------- Service detail relations (§6.5) ---------------- */

/**
 * Selected work per service (§6.5). Projects are addressed by slug
 * until the portfolio schema lands, mirroring the unique slug key.
 */
export const serviceProjectRelations = sqliteTable(
  "service_project_relations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    projectSlug: text("project_slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("service_project_relations_unique_idx").on(
      table.serviceId,
      table.projectSlug,
    ),
    index("service_project_relations_service_idx").on(table.serviceId),
  ],
);

/** Related FAQ entries per service (§6.5), referencing the FAQ library. */
export const serviceFaqRelations = sqliteTable(
  "service_faq_relations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => services.id, { onDelete: "cascade" }),
    faqId: integer("faq_id")
      .notNull()
      .references(() => faq.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [
    uniqueIndex("service_faq_relations_unique_idx").on(
      table.serviceId,
      table.faqId,
    ),
    index("service_faq_relations_service_idx").on(table.serviceId),
  ],
);

/* ---------------- Website: global settings (§10.3, §6.12) ---------------- */

/** Social platforms documented in §10.3. */
export const SOCIAL_PLATFORMS = ["instagram", "vimeo", "youtube"] as const;

export interface SocialLink {
  platform: (typeof SOCIAL_PLATFORMS)[number];
  url: string;
}

/**
 * Remaining Global Settings fields (§10.3) that are not contact
 * channels; held as one JSON document until their admin editors land.
 */
export interface SiteGlobalMeta {
  studioName?: string;
  tagline?: string;
  defaultCta?: { label: string; href: string };
  copyright?: string;
  defaultSocialImage?: string | null;
  seo?: { title?: string; description?: string };
}

/** Singleton: the studio's public identity and contact channels. */
export const siteSettings = sqliteTable("site_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactEmail: text("contact_email"),
  /** WhatsApp / phone contact shown on the Contact page. */
  contactPhone: text("contact_phone"),
  /** Location line; informational only, never a booking feature. */
  address: text("address"),
  socialLinks: text("social_links", { mode: "json" }).$type<SocialLink[]>(),
  globalMeta: text("global_meta", { mode: "json" }).$type<SiteGlobalMeta>(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
});

/* ---------------- Portfolio: projects (§11, §12) ---------------- */

export const WORK_CATEGORIES = [
  "Photography",
  "Film",
  "Commercial",
  "Editorial",
  "Portrait",
  "Product",
  "Event",
] as const;

export interface ProjectCreditEntry {
  role: string;
  name: string;
}

export const projects = sqliteTable(
  "projects",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    client: text("client"),
    projectType: text("project_type").notNull(),
    category: text("category", { enum: WORK_CATEGORIES }).notNull(),
    year: integer("year").notNull(),
    /** ISO date; drives newest-first ordering on the Work page. */
    projectDate: text("project_date").notNull(),
    location: text("location"),
    shortDescription: text("short_description").notNull(),
    /** References media_assets.id once the media schema task lands. */
    coverMediaId: integer("cover_media_id"),
    heroMediaId: integer("hero_media_id"),
    credits: text("credits", { mode: "json" })
      .$type<ProjectCreditEntry[]>()
      .notNull()
      .default(sql`'[]'`),
    relatedSlugs: text("related_slugs", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'`),
    seoMetaTitle: text("seo_meta_title"),
    seoMetaDescription: text("seo_meta_description"),
    seoOgMediaId: integer("seo_og_media_id"),
    status: text("status", { enum: CONTENT_STATUSES })
      .notNull()
      .default("draft"),
    visibility: text("visibility", { enum: PUBLISH_VISIBILITIES })
      .notNull()
      .default("public"),
    publishAt: text("publish_at"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("projects_slug_idx").on(table.slug),
    index("projects_status_visibility_idx").on(table.status, table.visibility),
  ],
);

/** Attached media (§12 Media tab): uploaded assets appended to a project. */
export const projectMedia = sqliteTable(
  "project_media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    mediaId: integer("media_id")
      .notNull()
      .references(() => mediaAssets.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("project_media_project_idx").on(table.projectId)],
);

/* ---------------- Website: navigation (§10.2) ---------------- */

export const navigationItems = sqliteTable(
  "navigation_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    label: text("label").notNull(),
    /** Internal path ("/work") or full https URL. */
    href: text("href").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("navigation_items_order_idx").on(table.sortOrder)],
);

/* ---------------- Website: homepage sections (§10.1) ---------------- */

export const homepageSections = sqliteTable(
  "homepage_sections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** matches the documented registry key (hero, selected_work, ...). */
    sectionKey: text("section_key").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [uniqueIndex("homepage_sections_key_idx").on(table.sectionKey)],
);

/* ---------------- Admin: activity log (§9) ---------------- */

export const activityLog = sqliteTable(
  "activity_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /** Null when the change came from the service token. */
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    summary: text("summary").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [index("activity_log_created_idx").on(table.createdAt)],
);

/* ---------------- Version history (§25) ---------------- */

/**
 * Content types whose versions are tracked (§25). Homepage and Projects
 * join once their tables land; Articles once the journal editor lands.
 */
export const VERSIONED_ENTITIES = [
  "service",
  "pricing",
  "studio_about",
  "article",
  "project",
] as const;

export const versionHistory = sqliteTable(
  "version_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id").notNull(),
    versionNo: integer("version_no").notNull(),
    /** Full content snapshot at save time (json). */
    snapshot: text("snapshot", { mode: "json" }).$type<unknown>().notNull(),
    /** References users.id once the users schema lands. */
    createdBy: integer("created_by"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("version_history_entity_version_idx").on(
      table.entityType,
      table.entityId,
      table.versionNo,
    ),
    index("version_history_entity_idx").on(table.entityType, table.entityId),
  ],
);

/* ---------------- Engagement: likes (studio request) ---------------- */

/** Public entities that can be liked. */
export const LIKE_ENTITIES = ["project", "article"] as const;

/**
 * One row per visitor per entity: the count is COUNT(*), and a visitor
 * can toggle their like on and off. Persisted immediately.
 */
export const likes = sqliteTable(
  "likes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    entityType: text("entity_type").notNull(),
    entitySlug: text("entity_slug").notNull(),
    visitorId: text("visitor_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("likes_entity_visitor_idx").on(
      table.entityType,
      table.entitySlug,
      table.visitorId,
    ),
    index("likes_entity_idx").on(table.entityType, table.entitySlug),
  ],
);

/* ---------------- Access: users and sessions (§27, PRD §26.2) ---------------- */

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    /** Bun.password (argon2id) hash; never leaves the server. */
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: USER_ROLES }).notNull(),
    status: text("status", { enum: USER_STATUSES }).notNull().default("active"),
    lastLoginAt: integer("last_login_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    uniqueIndex("users_email_idx").on(table.email),
    index("users_role_idx").on(table.role),
  ],
);

/**
 * Server-side sessions for the Admin CMS. The id is the SHA-256 hash of
 * the raw cookie token, so the database never stores a usable token.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index("sessions_user_idx").on(table.userId),
    index("sessions_expires_idx").on(table.expiresAt),
  ],
);

/* ---------------- Inferred types ---------------- */

export type JournalCategory = typeof journalCategories.$inferSelect;
export type NewJournalCategory = typeof journalCategories.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type ArticleBlock = typeof articleBlocks.$inferSelect;
export type NewArticleBlock = typeof articleBlocks.$inferInsert;
export type UpcomingProject = typeof upcomingProjects.$inferSelect;
export type NewUpcomingProject = typeof upcomingProjects.$inferInsert;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type NewMediaAsset = typeof mediaAssets.$inferInsert;
export type MediaVariant = typeof mediaVariants.$inferSelect;
export type NewMediaVariant = typeof mediaVariants.$inferInsert;
export type Inquiry = typeof inquiries.$inferSelect;
export type NewInquiry = typeof inquiries.$inferInsert;
export type LegalPage = typeof legalPages.$inferSelect;
export type NewLegalPage = typeof legalPages.$inferInsert;
export type StudioAbout = typeof studioAbout.$inferSelect;
export type NewStudioAbout = typeof studioAbout.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type StudioClient = typeof clients.$inferSelect;
export type NewStudioClient = typeof clients.$inferInsert;
export type RecognitionEntry = typeof recognition.$inferSelect;
export type NewRecognitionEntry = typeof recognition.$inferInsert;
export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
export type ServiceDetail = typeof serviceDetails.$inferSelect;
export type NewServiceDetail = typeof serviceDetails.$inferInsert;
export type PricingEntry = typeof pricing.$inferSelect;
export type NewPricingEntry = typeof pricing.$inferInsert;
export type ProcessStep = typeof processSteps.$inferSelect;
export type NewProcessStep = typeof processSteps.$inferInsert;
export type FaqEntry = typeof faq.$inferSelect;
export type NewFaqEntry = typeof faq.$inferInsert;
export type ServiceProjectRelation = typeof serviceProjectRelations.$inferSelect;
export type NewServiceProjectRelation =
  typeof serviceProjectRelations.$inferInsert;
export type ServiceFaqRelation = typeof serviceFaqRelations.$inferSelect;
export type NewServiceFaqRelation = typeof serviceFaqRelations.$inferInsert;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type NewSiteSettings = typeof siteSettings.$inferInsert;
export type VersionRecord = typeof versionHistory.$inferSelect;
export type NewVersionRecord = typeof versionHistory.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
