/**
 * Backend schema verification (no HTTP).
 * Applies migrations to a throwaway database, then asserts the journal
 * schema end to end: tables, columns, indexes, and cascade behavior.
 *
 * Usage: bun scripts/verify-backend.mjs
 */
import { Database } from "bun:sqlite";
import { mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { seedJournal } from "./seed-journal.mjs";

const dbPath = "data/verify-backend.db";
rmSync(dbPath, { force: true });
rmSync(`${dbPath}-shm`, { force: true });
rmSync(`${dbPath}-wal`, { force: true });
mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath, { create: true });
sqlite.exec("PRAGMA foreign_keys = ON;");
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "drizzle" });

const results = [];
const record = (name, ok, detail = "") =>
  results.push({ name, ok: Boolean(ok), detail });

const tables = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all()
    .map((row) => row.name),
);

record(
  "schema: journal tables exist",
  [
    "journal_categories",
    "articles",
    "article_blocks",
    "projects",
    "project_media",
    "navigation_items",
    "homepage_sections",
    "activity_log",
  ].every((table) => tables.has(table)),
  [...tables].join(","),
);

const columnNames = (table) =>
  new Set(
    sqlite
      .query(`PRAGMA table_info(${table})`)
      .all()
      .map((row) => row.name),
  );

const articleColumns = columnNames("articles");
record(
  "schema: articles carry the documented fields",
  [
    "title",
    "slug",
    "category_id",
    "cover_media_id",
    "excerpt",
    "author",
    "related_project_id",
    "publish_date",
    "status",
    "visibility",
    "publish_at",
    "seo_meta_title",
    "seo_meta_description",
    "seo_og_media_id",
    "created_by",
    "created_at",
    "updated_at",
  ].every((column) => articleColumns.has(column)),
  [...articleColumns].join(","),
);

const projectColumns = columnNames("projects");
record(
  "schema: projects carry the documented fields",
  [
    "title",
    "slug",
    "client",
    "project_type",
    "category",
    "year",
    "project_date",
    "location",
    "short_description",
    "cover_media_id",
    "hero_media_id",
    "credits",
    "related_slugs",
    "seo_meta_title",
    "seo_meta_description",
    "seo_og_media_id",
    "status",
    "visibility",
    "publish_at",
  ].every((column) => projectColumns.has(column)),
  [...projectColumns].join(","),
);
const projectMediaColumns = columnNames("project_media");
record(
  "schema: project_media links projects to media",
  ["project_id", "media_id", "sort_order"].every((column) =>
    projectMediaColumns.has(column),
  ),
  [...projectMediaColumns].join(","),
);

const blockColumns = columnNames("article_blocks");
record(
  "schema: article_blocks carry the documented fields",
  [
    "article_id",
    "block_type",
    "sort_order",
    "text_content",
    "media_id",
    "reference_project_id",
  ].every((column) => blockColumns.has(column)),
  [...blockColumns].join(","),
);

const indexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: slug and feed indexes exist",
  [
    "articles_slug_idx",
    "articles_status_visibility_idx",
    "articles_category_idx",
    "article_blocks_article_idx",
    "journal_categories_slug_idx",
  ].every((index) => indexes.has(index)),
  [...indexes].join(","),
);

/* Roundtrip: categories, articles, blocks + cascade delete. */
const category = sqlite
  .query(
    "INSERT INTO journal_categories (name, slug, sort_order) VALUES (?, ?, ?) RETURNING id",
  )
  .get("Studio Notes", "studio-notes", 1);

const article = sqlite
  .query(
    `INSERT INTO articles (title, slug, category_id, excerpt, publish_date, status, visibility)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
  )
  .get(
    "Verification article",
    "verification-article",
    category.id,
    "Roundtrip check.",
    "2026-01-01",
    "published",
    "public",
  );

sqlite
  .query(
    "INSERT INTO article_blocks (article_id, block_type, sort_order, text_content) VALUES (?, ?, ?, ?)",
  )
  .run(article.id, "paragraph", 1, "Body copy.");

const blockCountBefore = sqlite
  .query("SELECT COUNT(*) AS count FROM article_blocks")
  .get().count;
record("roundtrip: article + block insert works", blockCountBefore === 1);

let uniqueViolation = false;
try {
  sqlite
    .query(
      `INSERT INTO articles (title, slug, excerpt, publish_date) VALUES (?, ?, ?, ?)`,
    )
    .run("Duplicate", "verification-article", "Copy.", "2026-01-02");
} catch {
  uniqueViolation = true;
}
record("schema: slug stays unique", uniqueViolation);

sqlite.query("DELETE FROM articles WHERE id = ?").run(article.id);
const blockCountAfter = sqlite
  .query("SELECT COUNT(*) AS count FROM article_blocks")
  .get().count;
record(
  "schema: deleting an article cascades to its blocks",
  blockCountAfter === 0,
  `blocks=${blockCountAfter}`,
);

/* Seed: categories, articles, and the body block model. */
seedJournal(sqlite);
seedJournal(sqlite); // idempotency: second run must not duplicate anything

const categoryRows = sqlite
  .query("SELECT name, slug, sort_order FROM journal_categories ORDER BY sort_order")
  .all();
record(
  "seed: five documented categories in order",
  JSON.stringify(categoryRows.map((row) => row.slug)) ===
    JSON.stringify([
      "project-stories",
      "behind-the-scenes",
      "photography",
      "film",
      "studio-notes",
    ]),
  categoryRows.map((row) => row.slug).join(","),
);

const articleCount = sqlite
  .query("SELECT COUNT(*) AS count FROM articles")
  .get().count;
record(
  "seed: four journal stories (idempotent)",
  articleCount === 4,
  `articles=${articleCount}`,
);

const publicCount = sqlite
  .query(
    "SELECT COUNT(*) AS count FROM articles WHERE status = 'published' AND visibility = 'public'",
  )
  .get().count;
record(
  "seed: every story is published and public",
  publicCount === 4,
  `public=${publicCount}`,
);

const hiddenStates = sqlite
  .query(
    "SELECT COUNT(*) AS count FROM articles WHERE status <> 'published' OR visibility <> 'public'",
  )
  .get().count;
record(
  "seed: the journal set keeps no hidden fixture states",
  hiddenStates === 0,
  `hidden=${hiddenStates}`,
);

const filmPublic = sqlite
  .query(
    `SELECT COUNT(*) AS count FROM articles a
     JOIN journal_categories c ON c.id = a.category_id
     WHERE c.slug = 'film' AND a.status = 'published' AND a.visibility = 'public'`,
  )
  .get().count;
record(
  "seed: film category has no public article (empty state preserved)",
  filmPublic === 0,
  `filmPublic=${filmPublic}`,
);

const blockRows = sqlite
  .query(
    `SELECT b.sort_order, b.block_type, b.text_content
     FROM article_blocks b JOIN articles a ON a.id = b.article_id
     WHERE a.slug = 'life-untolds-in-monochrome'
     ORDER BY b.sort_order`,
  )
  .all();
record(
  "seed: article body blocks keep order and content",
  blockRows.length === 5 &&
    blockRows[0].block_type === "paragraph" &&
    blockRows[0].text_content.startsWith("Printing black and white") &&
    blockRows.some((row) => row.block_type === "quote"),
  JSON.stringify(blockRows.map((row) => row.block_type)),
);

const { ARTICLE_COVER_PHOTOS } = await import("../src/lib/content/journal.ts");
const { getJournalPhoto } = await import("../src/lib/content/media.ts");
record(
  "seed: every story maps to a built journal cover",
  articleCount === Object.keys(ARTICLE_COVER_PHOTOS).length &&
    Object.values(ARTICLE_COVER_PHOTOS).every((entry) =>
      Boolean(getJournalPhoto(entry.photoId)),
    ),
  Object.values(ARTICLE_COVER_PHOTOS)
    .map((entry) => entry.photoId)
    .join(","),
);

const totalBlocks = sqlite
  .query("SELECT COUNT(*) AS count FROM article_blocks")
  .get().count;
record(
  "seed: every article carries at least one block",
  totalBlocks >= articleCount,
  `blocks=${totalBlocks}`,
);

/* Upcoming projects (Now) schema */
record(
  "schema: upcoming_projects table exists",
  tables.has("upcoming_projects"),
);

const upcomingColumns = columnNames("upcoming_projects");
record(
  "schema: upcoming_projects carry the documented fields",
  [
    "title",
    "project_type",
    "description",
    "media_id",
    "location",
    "expected_release",
    "status",
    "visibility",
    "publish_at",
    "sort_order",
    "related_project_id",
  ].every((column) => upcomingColumns.has(column)),
  [...upcomingColumns].join(","),
);

const upcomingIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: upcoming visibility index exists",
  upcomingIndexes.has("upcoming_projects_status_visibility_idx"),
);

record(
  "schema: fresh database keeps the honest empty Now page",
  sqlite
    .query("SELECT COUNT(*) AS count FROM upcoming_projects")
    .get().count === 0,
);

const publicUpcoming = sqlite
  .query(
    `INSERT INTO upcoming_projects (title, project_type, description, location, expected_release, status, visibility, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id, status, visibility`,
  )
  .get(
    "Verification teaser",
    "Film",
    "Roundtrip check.",
    "Jakarta",
    "Q1 2027",
    "coming_soon",
    "public",
    1,
  );
const privateUpcoming = sqlite
  .query(
    `INSERT INTO upcoming_projects (title, project_type, description, status, visibility)
     VALUES (?, ?, ?, ?, ?) RETURNING id`,
  )
  .get("Confidential", "Commercial", "NDA.", "in_production", "private");
record(
  "roundtrip: upcoming entries store status and visibility",
  publicUpcoming.status === "coming_soon" &&
    publicUpcoming.visibility === "public" &&
    privateUpcoming.id > 0,
);
const publiclyVisible = sqlite
  .query(
    "SELECT COUNT(*) AS count FROM upcoming_projects WHERE visibility = 'public' AND status IN ('in_production','coming_soon')",
  )
  .get().count;
record(
  "roundtrip: only the public entry is publicly visible",
  publiclyVisible === 1,
  `public=${publiclyVisible}`,
);

/* Public Now read query against the throwaway database */
const { listPublicNowEntries } = await import(
  "../src/lib/db/queries/upcoming.ts"
);
sqlite.query("DELETE FROM upcoming_projects").run();
sqlite
  .query(
    `INSERT INTO upcoming_projects (title, project_type, description, location, expected_release, status, visibility, sort_order, publish_at)
     VALUES ('Second teaser', 'Film', 'Second.', 'Bali', 'Q2 2027', 'coming_soon', 'public', 2, NULL)`,
  )
  .run();
sqlite
  .query(
    `INSERT INTO upcoming_projects (title, project_type, description, location, expected_release, status, visibility, sort_order, publish_at)
     VALUES ('First teaser', 'Photography', 'First.', 'Jakarta', 'Late 2026', 'in_production', 'public', 1, NULL)`,
  )
  .run();
sqlite
  .query(
    `INSERT INTO upcoming_projects (title, project_type, description, status, visibility, sort_order)
     VALUES ('Hidden teaser', 'Commercial', 'NDA.', 'in_production', 'private', 0)`,
  )
  .run();
sqlite
  .query(
    `INSERT INTO upcoming_projects (title, project_type, description, status, visibility, sort_order, publish_at)
     VALUES ('Future teaser', 'Event', 'Not yet.', 'coming_soon', 'public', 0, '2999-01-01T00:00:00.000Z')`,
  )
  .run();

const nowEntries = await listPublicNowEntries(db);
record(
  "now query: public due entries only, in display order",
  nowEntries.length === 2 &&
    nowEntries[0].title === "First teaser" &&
    nowEntries[1].title === "Second teaser",
  nowEntries.map((entry) => entry.title).join(","),
);
record(
  "now query: private and future-scheduled entries excluded",
  !nowEntries.some(
    (entry) =>
      entry.title === "Hidden teaser" || entry.title === "Future teaser",
  ),
);
record(
  "now query: teaser maps from the description column",
  nowEntries[0].teaser === "First." &&
    nowEntries[0].location === "Jakarta" &&
    nowEntries[0].expectedRelease === "Late 2026" &&
    nowEntries[0].status === "in_production",
  JSON.stringify(nowEntries[0]),
);

/* Inquiries schema */
record("schema: inquiries table exists", tables.has("inquiries"));
const inquiryColumns = columnNames("inquiries");
record(
  "schema: inquiries carry the documented fields",
  [
    "full_name",
    "company",
    "email",
    "whatsapp",
    "service",
    "project_type",
    "project_description",
    "desired_date",
    "location",
    "budget_range",
    "expected_deliverables",
    "reference_url",
    "attachments",
    "status",
    "created_at",
    "updated_at",
  ].every((column) => inquiryColumns.has(column)),
  [...inquiryColumns].join(","),
);

const inquiryRow = sqlite
  .query(
    `INSERT INTO inquiries (full_name, email, service, project_type, project_description, attachments)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id, status, attachments`,
  )
  .get(
    "Verification Client",
    "client@example.com",
    "Photography",
    "Photography",
    "Roundtrip check.",
    JSON.stringify([
      {
        filename: "brief.pdf",
        mimeType: "application/pdf",
        size: 1024,
        storageKey: "data/uploads/inquiries/verify-brief.pdf",
      },
    ]),
  );
record(
  "roundtrip: inquiry defaults to the NEW pipeline stage",
  inquiryRow.status === "new",
  `status=${inquiryRow.status}`,
);
const parsedAttachments = JSON.parse(inquiryRow.attachments ?? "[]");
record(
  "roundtrip: attachments store as JSON metadata",
  parsedAttachments.length === 1 &&
    parsedAttachments[0].filename === "brief.pdf" &&
    parsedAttachments[0].size === 1024,
);
const inquiryWithoutAttachments = sqlite
  .query(
    `INSERT INTO inquiries (full_name, email, service, project_type, project_description)
     VALUES (?, ?, ?, ?, ?) RETURNING attachments`,
  )
  .get(
    "Second Client",
    "second@example.com",
    "Film & Motion",
    "Film",
    "No attachment.",
  );
record(
  "roundtrip: attachments are optional",
  inquiryWithoutAttachments.attachments === null,
);
const inquiryIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: inquiry status and created indexes exist",
  inquiryIndexes.has("inquiries_status_idx") &&
    inquiryIndexes.has("inquiries_created_idx"),
);

/* Legal pages schema */
record("schema: legal_pages table exists", tables.has("legal_pages"));
const legalColumns = columnNames("legal_pages");
record(
  "schema: legal_pages carry the documented fields",
  ["title", "slug", "body", "updated_date", "status"].every((column) =>
    legalColumns.has(column),
  ),
  [...legalColumns].join(","),
);
const legalRow = sqlite
  .query(
    `INSERT INTO legal_pages (title, slug, body, updated_date, status)
     VALUES (?, ?, ?, ?, ?) RETURNING id, body, status`,
  )
  .get(
    "Verification Policy",
    "verification-policy",
    JSON.stringify([
      { type: "paragraph", text: "Intro paragraph." },
      { type: "heading", text: "A heading" },
      { type: "paragraph", text: "Body paragraph." },
    ]),
    "2026-01-15",
    "published",
  );
const legalBlocks = JSON.parse(legalRow.body);
record(
  "roundtrip: legal body stores ordered blocks as JSON",
  legalBlocks.length === 3 &&
    legalBlocks[0].type === "paragraph" &&
    legalBlocks[1].type === "heading",
  String(legalBlocks.length),
);
let duplicateLegalSlug = false;
try {
  sqlite
    .query(
      `INSERT INTO legal_pages (title, slug, body, updated_date) VALUES (?, ?, ?, ?)`,
    )
    .run("Duplicate", "verification-policy", "[]", "2026-01-16");
} catch {
  duplicateLegalSlug = true;
}
record("schema: legal slugs stay unique", duplicateLegalSlug);
sqlite.query("DELETE FROM legal_pages WHERE slug = ?").run("verification-policy");

/* Legal seed against the throwaway database */
const { seedLegal } = await import("./seed-legal.mjs");
seedLegal(sqlite);
seedLegal(sqlite); // idempotency
const legalSeeded = sqlite
  .query("SELECT slug, status FROM legal_pages ORDER BY slug")
  .all();
record(
  "seed: two published legal pages (idempotent)",
  legalSeeded.length === 2 &&
    legalSeeded[0].slug === "privacy" &&
    legalSeeded[0].status === "published" &&
    legalSeeded[1].slug === "terms",
  JSON.stringify(legalSeeded),
);
const privacyBody = JSON.parse(
  sqlite
    .query("SELECT body FROM legal_pages WHERE slug = 'privacy'")
    .get().body,
);
record(
  "seed: privacy body keeps its ordered blocks",
  privacyBody.length >= 10 &&
    privacyBody[0].type === "paragraph" &&
    privacyBody[1].type === "heading",
  `blocks=${privacyBody.length}`,
);

/* Legal update validation, pure-function layer. */
const { validateLegalUpdate } = await import(
  "../src/lib/db/queries/legal-admin.ts"
);
const badLegalType = validateLegalUpdate({
  body: [{ type: "sparkle", text: "nope" }],
});
record(
  "legal validation: unknown block types are rejected",
  badLegalType.ok === false &&
    badLegalType.issues.some((issue) => issue.includes("heading")),
  JSON.stringify(badLegalType.ok ? [] : badLegalType.issues),
);
const emptyLegalBody = validateLegalUpdate({ body: [] });
record(
  "legal validation: empty bodies are rejected",
  emptyLegalBody.ok === false &&
    emptyLegalBody.issues.some((issue) => issue.includes("at least one block")),
  JSON.stringify(emptyLegalBody.ok ? [] : emptyLegalBody.issues),
);
const emptyLegalPatch = validateLegalUpdate({});
record(
  "legal validation: empty patches are rejected",
  emptyLegalPatch.ok === false &&
    emptyLegalPatch.issues.some((issue) =>
      issue.includes("at least one field"),
    ),
  JSON.stringify(emptyLegalPatch.ok ? [] : emptyLegalPatch.issues),
);
const tidyLegal = validateLegalUpdate({
  title: "  Privacy Policy  ",
  body: [
    { type: "paragraph", text: "  First paragraph.  " },
    { type: "heading", text: "Later" },
  ],
  updatedDate: "2026-02-01",
  status: "draft",
});
record(
  "legal validation: valid patches trim values",
  tidyLegal.ok === true &&
    tidyLegal.value.title === "Privacy Policy" &&
    tidyLegal.value.body?.[0]?.text === "First paragraph." &&
    tidyLegal.value.status === "draft",
  JSON.stringify(tidyLegal.ok ? tidyLegal.value : tidyLegal.issues),
);

/* Inline highlight markup (§6.10 prose): safe links only. */
const { parseInlineText } = await import("../src/lib/content/inline-text.ts");
{
  const linked = parseInlineText(
    "See [our process](/process) and [the archive](https://example.com).",
  );
  record(
    "inline text: highlight markup parses into link segments",
    linked.some((segment) => segment.type === "link" && segment.href === "/process") &&
      linked.some(
        (segment) =>
          segment.type === "link" && segment.href === "https://example.com",
      ),
    linked.map((segment) => segment.type).join(","),
  );
  const unsafe = parseInlineText("[click](javascript:alert(1))");
  const protocolRelative = parseInlineText("[x](//evil.example)");
  const malformed = parseInlineText("an [open bracket");
  record(
    "inline text: unsafe or malformed markup stays plain",
    unsafe.every((segment) => segment.type === "text") &&
      protocolRelative.every((segment) => segment.type === "text") &&
      malformed.every((segment) => segment.type === "text"),
  );
  const plain = parseInlineText("No markup here.");
  record(
    "inline text: plain prose passes through untouched",
    plain.length === 1 &&
      plain[0].type === "text" &&
      plain[0].text === "No markup here.",
  );
}

/* Studio schema (§6.8, §18): about singleton, team, clients, recognition */
record(
  "schema: studio tables exist",
  ["studio_about", "team_members", "clients", "recognition"].every((table) =>
    tables.has(table),
  ),
  [...tables].join(","),
);

const studioAboutColumns = columnNames("studio_about");
record(
  "schema: studio_about carries the documented fields",
  ["heading", "body", "supporting_media_id", "created_at", "updated_at"].every(
    (column) => studioAboutColumns.has(column),
  ),
  [...studioAboutColumns].join(","),
);

const teamColumns = columnNames("team_members");
record(
  "schema: team_members carry the documented fields",
  [
    "name",
    "role_title",
    "photo_media_id",
    "bio",
    "sort_order",
    "status",
    "visibility",
  ].every((column) => teamColumns.has(column)),
  [...teamColumns].join(","),
);

const clientColumns = columnNames("clients");
record(
  "schema: clients carry the documented fields",
  ["name", "logo_media_id", "website", "featured", "sort_order", "status"].every(
    (column) => clientColumns.has(column),
  ),
  [...clientColumns].join(","),
);

const recognitionColumns = columnNames("recognition");
record(
  "schema: recognition carries the documented fields",
  [
    "title",
    "organization",
    "year",
    "url",
    "recognition_type",
    "description",
    "sort_order",
    "status",
  ].every((column) => recognitionColumns.has(column)),
  [...recognitionColumns].join(","),
);

const studioIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: studio list indexes exist",
  [
    "team_members_status_visibility_idx",
    "clients_status_featured_idx",
    "recognition_status_year_idx",
  ].every((index) => studioIndexes.has(index)),
  [...studioIndexes].join(","),
);

const studioAboutRow = sqlite
  .query(
    "INSERT INTO studio_about (heading, body) VALUES (?, ?) RETURNING id, body",
  )
  .get(
    "A small studio for lasting images",
    JSON.stringify({
      paragraphs: ["First paragraph.", "Second paragraph."],
      philosophy: ["Attention over calendar."],
    }),
  );
const studioAboutBody = JSON.parse(studioAboutRow.body);
record(
  "roundtrip: studio_about stores the structured body JSON",
  studioAboutBody.paragraphs.length === 2 &&
    studioAboutBody.philosophy.length === 1,
  String(studioAboutBody.paragraphs.length),
);

const teamRow = sqlite
  .query(
    "INSERT INTO team_members (name, role_title) VALUES (?, ?) RETURNING status, visibility",
  )
  .get("Verification Member", "Photographer");
record(
  "roundtrip: team members default to draft + public",
  teamRow.status === "draft" && teamRow.visibility === "public",
  JSON.stringify(teamRow),
);

const clientRow = sqlite
  .query(
    "INSERT INTO clients (name, website, featured) VALUES (?, ?, ?) RETURNING featured, status",
  )
  .get("Verification Client", "https://example.com", 1);
record(
  "roundtrip: clients store featured as a flag",
  clientRow.featured === 1 && clientRow.status === "draft",
  JSON.stringify(clientRow),
);

const recognitionRow = sqlite
  .query(
    "INSERT INTO recognition (title, organization, year, recognition_type) VALUES (?, ?, ?, ?) RETURNING recognition_type, status",
  )
  .get("Verification Feature", "Example Press", 2026, "feature");
record(
  "roundtrip: recognition stores its type and lifecycle",
  recognitionRow.recognition_type === "feature" &&
    recognitionRow.status === "draft",
  JSON.stringify(recognitionRow),
);

const publicTeam = sqlite
  .query(
    "SELECT COUNT(*) AS count FROM team_members WHERE status = 'published' AND visibility = 'public'",
  )
  .get().count;
record(
  "roundtrip: studio entries start hidden from the public site",
  publicTeam === 0,
  `published=${publicTeam}`,
);

/* Services + pricing schema (§6.4-§6.6, §14-§15) */
record(
  "schema: services tables exist",
  ["services", "service_details", "pricing"].every((table) => tables.has(table)),
  [...tables].join(","),
);

const serviceColumns = columnNames("services");
record(
  "schema: services carry the documented fields",
  [
    "name",
    "slug",
    "service_type",
    "short_description",
    "supporting_media_id",
    "seo_meta_title",
    "seo_meta_description",
    "seo_og_media_id",
    "sort_order",
    "status",
  ].every((column) => serviceColumns.has(column)),
  [...serviceColumns].join(","),
);

const serviceDetailColumns = columnNames("service_details");
record(
  "schema: service_details carry the documented fields",
  ["service_id", "body_blocks", "deliverables", "created_at", "updated_at"].every(
    (column) => serviceDetailColumns.has(column),
  ),
  [...serviceDetailColumns].join(","),
);

const pricingColumns = columnNames("pricing");
record(
  "schema: pricing carries the documented fields",
  [
    "service_id",
    "package_name",
    "price_type",
    "amount",
    "currency",
    "duration",
    "deliverables",
    "notes",
    "sort_order",
    "status",
  ].every((column) => pricingColumns.has(column)),
  [...pricingColumns].join(","),
);

const serviceIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: services indexes exist",
  [
    "services_slug_idx",
    "services_status_idx",
    "service_details_service_idx",
    "pricing_service_idx",
    "pricing_status_idx",
  ].every((index) => serviceIndexes.has(index)),
);

const serviceRow = sqlite
  .query(
    `INSERT INTO services (name, slug, service_type, short_description)
     VALUES (?, ?, ?, ?) RETURNING id, status`,
  )
  .get(
    "Verification Service",
    "verification-service",
    "Photography",
    "Roundtrip check.",
  );
record(
  "roundtrip: services default to draft",
  serviceRow.status === "draft",
  `status=${serviceRow.status}`,
);

const detailRow = sqlite
  .query(
    `INSERT INTO service_details (service_id, body_blocks, deliverables)
     VALUES (?, ?, ?) RETURNING body_blocks, deliverables`,
  )
  .get(
    serviceRow.id,
    JSON.stringify({
      paragraphs: ["First paragraph."],
      whoItIsFor: ["Couples"],
    }),
    JSON.stringify(["Shoot day coverage"]),
  );
const parsedDetail = JSON.parse(detailRow.body_blocks);
record(
  "roundtrip: service_details store structured JSON bodies",
  parsedDetail.paragraphs.length === 1 &&
    parsedDetail.whoItIsFor[0] === "Couples" &&
    JSON.parse(detailRow.deliverables)[0] === "Shoot day coverage",
);

let secondDetailBlocked = false;
try {
  sqlite
    .query(
      `INSERT INTO service_details (service_id, body_blocks, deliverables) VALUES (?, ?, ?)`,
    )
    .run(serviceRow.id, JSON.stringify({ paragraphs: [], whoItIsFor: [] }), "[]");
} catch {
  secondDetailBlocked = true;
}
record(
  "schema: a service holds exactly one detail row",
  secondDetailBlocked,
);

const quoteRow = sqlite
  .query(
    `INSERT INTO pricing (service_id, package_name, price_type, amount, deliverables)
     VALUES (?, ?, ?, ?, ?) RETURNING amount, status`,
  )
  .get(
    serviceRow.id,
    "Commission",
    "custom_quote",
    null,
    JSON.stringify(["Pre-production planning"]),
  );
record(
  "roundtrip: custom quotes keep an empty amount",
  quoteRow.amount === null && quoteRow.status === "draft",
  JSON.stringify(quoteRow),
);

const amountRow = sqlite
  .query(
    `INSERT INTO pricing (service_id, package_name, price_type, amount, currency, deliverables, status)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING amount, currency`,
  )
  .get(
    serviceRow.id,
    "Session",
    "fixed",
    750000,
    "IDR",
    JSON.stringify(["Guided session"]),
    "published",
  );
record(
  "roundtrip: fixed prices store a numeric amount",
  amountRow.amount === 750000 && amountRow.currency === "IDR",
  JSON.stringify(amountRow),
);

sqlite.query("DELETE FROM services WHERE id = ?").run(serviceRow.id);
const orphanDetails = sqlite
  .query("SELECT COUNT(*) AS count FROM service_details")
  .get().count;
const orphanPricing = sqlite
  .query("SELECT COUNT(*) AS count FROM pricing")
  .get().count;
record(
  "schema: deleting a service cascades to its detail and pricing",
  orphanDetails === 0 && orphanPricing === 0,
  `details=${orphanDetails},pricing=${orphanPricing}`,
);

/* Process steps + FAQ schema (§6.7, §16) */
record(
  "schema: process and faq tables exist",
  tables.has("process_steps") && tables.has("faq"),
  [...tables].join(","),
);

const processColumns = columnNames("process_steps");
record(
  "schema: process_steps carry the documented fields",
  ["step_number", "title", "explanation", "sort_order", "status"].every(
    (column) => processColumns.has(column),
  ),
  [...processColumns].join(","),
);

const faqColumns = columnNames("faq");
record(
  "schema: faq carries the documented fields",
  ["question", "answer", "sort_order", "status"].every((column) =>
    faqColumns.has(column),
  ),
  [...faqColumns].join(","),
);

const faqIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record("schema: faq status index exists", faqIndexes.has("faq_status_idx"));

const visibleStep = sqlite
  .query(
    "INSERT INTO process_steps (step_number, title, explanation, sort_order) VALUES (?, ?, ?, ?) RETURNING status",
  )
  .get(1, "Inquiry", "You send a brief.", 1);
record(
  "roundtrip: process steps default to visible",
  visibleStep.status === "visible",
  `status=${visibleStep.status}`,
);

sqlite
  .query(
    "INSERT INTO process_steps (step_number, title, explanation, sort_order, status) VALUES (?, ?, ?, ?, ?)",
  )
  .run(3, "Hidden step", "Not shown.", 3, "hidden");
const orderedSteps = sqlite
  .query(
    "SELECT step_number FROM process_steps WHERE status = 'visible' ORDER BY sort_order",
  )
  .all();
record(
  "roundtrip: hidden steps stay out of the visible ordering",
  orderedSteps.length === 1 && orderedSteps[0].step_number === 1,
  JSON.stringify(orderedSteps),
);

const faqRow = sqlite
  .query(
    "INSERT INTO faq (question, answer) VALUES (?, ?) RETURNING status",
  )
  .get("How do we start?", "Send a brief through Start a Project.");
record(
  "roundtrip: faq entries start as drafts",
  faqRow.status === "draft",
  `status=${faqRow.status}`,
);

/* Studio public queries (§6.8) */
const {
  getPublicStudioAbout,
  listPublicTeamMembers,
  listPublishedClients,
  listPublishedRecognition,
} = await import("../src/lib/db/queries/studio.ts");

sqlite.query("DELETE FROM studio_about").run();
sqlite.query("DELETE FROM team_members").run();
sqlite.query("DELETE FROM clients").run();
sqlite.query("DELETE FROM recognition").run();

record(
  "studio query: the About singleton is null until written",
  (await getPublicStudioAbout(db)) === null,
);
record(
  "studio query: empty lists stay empty",
  (await listPublicTeamMembers(db)).length === 0 &&
    (await listPublishedClients(db)).length === 0 &&
    (await listPublishedRecognition(db)).length === 0,
);

sqlite
  .query("INSERT INTO studio_about (heading, body) VALUES (?, ?)")
  .run(
    "A small studio",
    JSON.stringify({ paragraphs: ["P."], philosophy: ["Ph."] }),
  );
const studioAboutQuery = await getPublicStudioAbout(db);
record(
  "studio query: the About singleton returns its structured body",
  studioAboutQuery?.heading === "A small studio" &&
    studioAboutQuery.body.paragraphs.length === 1 &&
    studioAboutQuery.body.philosophy[0] === "Ph.",
  JSON.stringify(studioAboutQuery),
);

sqlite
  .query(
    `INSERT INTO team_members (name, role_title, status, visibility, sort_order) VALUES
     ('Second', 'Editor', 'published', 'public', 2),
     ('First', 'Photographer', 'published', 'public', 1),
     ('Private', 'Producer', 'published', 'private', 1),
     ('Draft', 'Assistant', 'draft', 'public', 1)`,
  )
  .run();
const publicTeamQuery = await listPublicTeamMembers(db);
record(
  "studio query: only published + public team members, in display order",
  publicTeamQuery.length === 2 &&
    publicTeamQuery[0].name === "First" &&
    publicTeamQuery[1].name === "Second",
  publicTeamQuery.map((member) => member.name).join(","),
);

sqlite
  .query(
    `INSERT INTO clients (name, website, featured, status, sort_order) VALUES
     ('Featured Studio', 'https://example.com', 1, 'published', 2),
     ('Quiet Studio', NULL, 0, 'published', 1),
     ('Draft Studio', NULL, 1, 'draft', 1)`,
  )
  .run();
const clientQuery = await listPublishedClients({}, db);
record(
  "studio query: published clients in display order, drafts excluded",
  clientQuery.length === 2 &&
    clientQuery[0].name === "Quiet Studio" &&
    clientQuery[1].name === "Featured Studio",
  clientQuery.map((client) => client.name).join(","),
);
const featuredClientQuery = await listPublishedClients({ featuredOnly: true }, db);
record(
  "studio query: the featured filter narrows the client list",
  featuredClientQuery.length === 1 &&
    featuredClientQuery[0].name === "Featured Studio" &&
    featuredClientQuery[0].featured === true,
  featuredClientQuery.map((client) => client.name).join(","),
);

sqlite
  .query(
    `INSERT INTO recognition (title, organization, year, recognition_type, status, sort_order) VALUES
     ('Older Feature', 'Press', 2020, 'feature', 'published', 1),
     ('Newer Award', 'Festival', 2024, 'award', 'published', 1),
     ('Future Draft', 'Press', 2030, 'publication', 'draft', 1)`,
  )
  .run();
const recognitionQuery = await listPublishedRecognition(db);
record(
  "studio query: published recognition, newest first, drafts excluded",
  recognitionQuery.length === 2 &&
    recognitionQuery[0].title === "Newer Award" &&
    recognitionQuery[1].title === "Older Feature",
  recognitionQuery.map((entry) => entry.title).join(","),
);

/* Services + pricing public queries (§6.4-§6.6) */
const {
  listPublishedServices,
  getPublishedServiceBySlug,
  listPublishedPricing,
} = await import("../src/lib/db/queries/services.ts");

sqlite.query("DELETE FROM services").run();

record(
  "services query: empty lists stay empty",
  (await listPublishedServices(db)).length === 0 &&
    (await listPublishedPricing({}, db)).length === 0,
);
record(
  "services query: a missing slug is null",
  (await getPublishedServiceBySlug("missing-service", db)) === null,
);

const publishedService = sqlite
  .query(
    `INSERT INTO services (name, slug, service_type, short_description, status, sort_order)
     VALUES ('Photography', 'photography', 'Photography', 'Still stories.', 'published', 1)
     RETURNING id`,
  )
  .get();
const draftService = sqlite
  .query(
    `INSERT INTO services (name, slug, service_type, short_description, status, sort_order)
     VALUES ('Film', 'film-and-motion', 'Film & Motion', 'Motion work.', 'draft', 2)
     RETURNING id`,
  )
  .get();
sqlite
  .query(
    "INSERT INTO service_details (service_id, body_blocks, deliverables) VALUES (?, ?, ?)",
  )
  .run(
    publishedService.id,
    JSON.stringify({ paragraphs: ["P."], whoItIsFor: ["Couples"] }),
    JSON.stringify(["Coverage"]),
  );
sqlite
  .query(
    `INSERT INTO pricing (service_id, package_name, price_type, amount, deliverables, status, sort_order) VALUES
     (?, 'Commission', 'custom_quote', NULL, '["Planning"]', 'published', 1),
     (?, 'Session', 'fixed', 750000, '["Session"]', 'published', 2),
     (?, 'Hidden', 'custom_quote', NULL, '[]', 'draft', 3),
     (?, 'Draft service price', 'custom_quote', NULL, '[]', 'published', 0)`,
  )
  .run(
    publishedService.id,
    publishedService.id,
    publishedService.id,
    draftService.id,
  );

const serviceSummaries = await listPublishedServices(db);
record(
  "services query: only published services, in display order",
  serviceSummaries.length === 1 &&
    serviceSummaries[0].slug === "photography" &&
    serviceSummaries[0].serviceType === "Photography",
  serviceSummaries.map((service) => service.slug).join(","),
);

const serviceDetail = await getPublishedServiceBySlug("photography", db);
record(
  "services query: the detail joins the 1:1 body and published pricing",
  serviceDetail?.details?.paragraphs[0] === "P." &&
    serviceDetail.deliverables[0] === "Coverage" &&
    serviceDetail.pricing.length === 2 &&
    serviceDetail.pricing[0].packageName === "Commission",
  JSON.stringify(serviceDetail?.pricing?.map((entry) => entry.packageName)),
);
record(
  "services query: a draft service never surfaces",
  (await getPublishedServiceBySlug("film-and-motion", db)) === null,
);

const pricingList = await listPublishedPricing({}, db);
record(
  "pricing query: published entries of published services only",
  pricingList.length === 2 &&
    pricingList[0].serviceSlug === "photography" &&
    pricingList[1].amount === 750000,
  pricingList.map((entry) => entry.packageName).join(","),
);
const scopedPricing = await listPublishedPricing(
  { serviceSlug: "photography" },
  db,
);
record(
  "pricing query: the service filter scopes the list",
  scopedPricing.length === 2,
  `total=${scopedPricing.length}`,
);

/* Process + FAQ public queries (§6.7, §12.4) */
const { listPublicProcessSteps } = await import(
  "../src/lib/db/queries/process.ts"
);
const { listPublishedFaq } = await import("../src/lib/db/queries/faq.ts");

sqlite.query("DELETE FROM process_steps").run();
sqlite.query("DELETE FROM faq").run();
record(
  "process query: empty lists stay empty",
  (await listPublicProcessSteps(db)).length === 0 &&
    (await listPublishedFaq(db)).length === 0,
);

sqlite
  .query(
    `INSERT INTO process_steps (step_number, title, explanation, sort_order, status) VALUES
     (1, 'Inquiry', 'You send a brief.', 1, 'visible'),
     (2, 'Discovery', 'We talk.', 2, 'visible'),
     (3, 'Hidden', 'Not shown.', 3, 'hidden')`,
  )
  .run();
const publicSteps = await listPublicProcessSteps(db);
record(
  "process query: visible steps only, in display order",
  publicSteps.length === 2 &&
    publicSteps[0].stepNumber === 1 &&
    publicSteps[1].title === "Discovery",
  publicSteps.map((step) => step.title).join(","),
);

sqlite
  .query(
    `INSERT INTO faq (question, answer, sort_order, status) VALUES
     ('How do we start?', 'Send a brief.', 1, 'published'),
     ('What does it cost?', 'Quoted per scope.', 2, 'published'),
     ('Draft question?', 'Not yet.', 3, 'draft')`,
  )
  .run();
const faqEntries = await listPublishedFaq(db);
record(
  "faq query: published entries only, in display order",
  faqEntries.length === 2 &&
    faqEntries[0].question === "How do we start?" &&
    faqEntries[1].question === "What does it cost?",
  faqEntries.map((entry) => entry.question).join(","),
);

/* Service detail relations (§6.5) */
const {
  listServiceProjectRelations,
  replaceServiceProjectRelations,
  listServiceFaqRelations,
  replaceServiceFaqRelations,
} = await import("../src/lib/db/queries/services-admin.ts");

const relationIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: service relation indexes exist",
  [
    "service_project_relations_unique_idx",
    "service_project_relations_service_idx",
    "service_faq_relations_unique_idx",
    "service_faq_relations_service_idx",
  ].every((index) => relationIndexes.has(index)),
);

record(
  "relations: a fresh service has no relations",
  (await listServiceProjectRelations(publishedService.id, db)).length === 0 &&
    (await listServiceFaqRelations(publishedService.id, db)).length === 0,
);

const replacedProjects = await replaceServiceProjectRelations(
  publishedService.id,
  ["dean-and-deb", "sunday-school"],
  db,
);
record(
  "relations: replacing selected work keeps the order",
  replacedProjects.length === 2 &&
    replacedProjects[0] === "dean-and-deb" &&
    replacedProjects[1] === "sunday-school",
  replacedProjects.join(","),
);

const relPublishedFaq = sqlite
  .query(
    "INSERT INTO faq (question, answer, status) VALUES (?, ?, ?) RETURNING id",
  )
  .get("How do we start?", "Send a brief.", "published");
const relDraftFaq = sqlite
  .query(
    "INSERT INTO faq (question, answer, status) VALUES (?, ?, ?) RETURNING id",
  )
  .get("Draft question?", "Not yet.", "draft");

const replacedFaq = await replaceServiceFaqRelations(
  publishedService.id,
  [relPublishedFaq.id, relDraftFaq.id],
  db,
);
record(
  "relations: replacing related FAQ keeps the order",
  replacedFaq.length === 2 && replacedFaq[0] === relPublishedFaq.id,
  replacedFaq.join(","),
);

const detailWithRelations = await getPublishedServiceBySlug("photography", db);
record(
  "relations: the public detail exposes projects and published FAQ only",
  detailWithRelations?.relatedProjects?.[0] === "dean-and-deb" &&
    detailWithRelations.faq.length === 1 &&
    detailWithRelations.faq[0].id === relPublishedFaq.id,
  `faq=${detailWithRelations?.faq?.length}`,
);

let duplicateRelationBlocked = false;
try {
  sqlite
    .query(
      "INSERT INTO service_project_relations (service_id, project_slug) VALUES (?, ?)",
    )
    .run(publishedService.id, "dean-and-deb");
} catch {
  duplicateRelationBlocked = true;
}
record(
  "relations: a project slug stays unique per service",
  duplicateRelationBlocked,
);

sqlite.query("DELETE FROM faq WHERE id = ?").run(relPublishedFaq.id);
const faqRelationsAfterDelete = await listServiceFaqRelations(
  publishedService.id,
  db,
);
record(
  "relations: deleting a FAQ entry cascades its relations",
  faqRelationsAfterDelete.length === 1 &&
    faqRelationsAfterDelete[0] === relDraftFaq.id,
  faqRelationsAfterDelete.join(","),
);

/* Public visibility + ordering audit (§13, §24): every Info Pages
   public query must drop non-published rows and order deterministically
   (sort_order first, id as the stable tie-breaker). */
sqlite.query("DELETE FROM studio_about").run();
sqlite.query("DELETE FROM team_members").run();
sqlite.query("DELETE FROM clients").run();
sqlite.query("DELETE FROM recognition").run();
sqlite.query("DELETE FROM services").run();
sqlite.query("DELETE FROM faq").run();
sqlite.query("DELETE FROM process_steps").run();

sqlite
  .query(
    `INSERT INTO team_members (name, role_title, status, visibility, sort_order) VALUES
     ('Team A', 'Photographer', 'published', 'public', 1),
     ('Team B', 'Editor', 'published', 'public', 1),
     ('Team C', 'Producer', 'published', 'private', 0),
     ('Team D', 'Assistant', 'draft', 'public', 0)`,
  )
  .run();
const auditTeam = await listPublicTeamMembers(db);
record(
  "audit: team keeps published + public rows, id breaks sort ties",
  JSON.stringify(auditTeam.map((member) => member.name)) ===
    JSON.stringify(["Team A", "Team B"]),
  auditTeam.map((member) => member.name).join(","),
);

sqlite
  .query(
    `INSERT INTO clients (name, featured, status, sort_order) VALUES
     ('Client A', 0, 'published', 2),
     ('Client B', 0, 'published', 2),
     ('Client C', 0, 'draft', 0)`,
  )
  .run();
const auditClients = await listPublishedClients({}, db);
record(
  "audit: clients keep published rows, id breaks sort ties",
  JSON.stringify(auditClients.map((client) => client.name)) ===
    JSON.stringify(["Client A", "Client B"]),
  auditClients.map((client) => client.name).join(","),
);

sqlite
  .query(
    `INSERT INTO recognition (title, year, recognition_type, status, sort_order) VALUES
     ('Rec A', 2024, 'award', 'published', 2),
     ('Rec B', 2024, 'feature', 'published', 1),
     ('Rec C', 2023, 'publication', 'published', 0),
     ('Rec D', 2030, 'award', 'draft', 0)`,
  )
  .run();
const auditRecognition = await listPublishedRecognition(db);
record(
  "audit: recognition keeps published rows, newest year first",
  JSON.stringify(auditRecognition.map((entry) => entry.title)) ===
    JSON.stringify(["Rec B", "Rec A", "Rec C"]),
  auditRecognition.map((entry) => entry.title).join(","),
);

sqlite
  .query(
    `INSERT INTO services (name, slug, service_type, short_description, status, sort_order) VALUES
     ('Service A', 'service-a', 'Photography', 'A.', 'published', 5),
     ('Service B', 'service-b', 'Portrait', 'B.', 'published', 5),
     ('Service C', 'service-c', 'Event', 'C.', 'draft', 0)`,
  )
  .run();
const auditServices = await listPublishedServices(db);
record(
  "audit: services keep published rows, id breaks sort ties",
  JSON.stringify(auditServices.map((service) => service.slug)) ===
    JSON.stringify(["service-a", "service-b"]),
  auditServices.map((service) => service.slug).join(","),
);

const auditServiceA = auditServices[0].id;
const auditDraftService = sqlite
  .query("SELECT id FROM services WHERE slug = 'service-c'")
  .get();
sqlite
  .query(
    `INSERT INTO pricing (service_id, package_name, price_type, amount, deliverables, status, sort_order) VALUES
     (?, 'Price A', 'custom_quote', NULL, '[]', 'published', 1),
     (?, 'Price B', 'fixed', 100, '[]', 'published', 1),
     (?, 'Price C', 'custom_quote', NULL, '[]', 'draft', 0)`,
  )
  .run(auditServiceA, auditServiceA, auditServiceA);
sqlite
  .query(
    `INSERT INTO pricing (service_id, package_name, price_type, amount, deliverables, status, sort_order) VALUES
     (?, 'Price D', 'custom_quote', NULL, '[]', 'published', 0)`,
  )
  .run(auditDraftService.id);
const auditPricing = await listPublishedPricing({}, db);
record(
  "audit: pricing drops drafts and draft-service entries, id breaks ties",
  JSON.stringify(auditPricing.map((entry) => entry.packageName)) ===
    JSON.stringify(["Price A", "Price B"]),
  auditPricing.map((entry) => entry.packageName).join(","),
);

sqlite
  .query(
    `INSERT INTO faq (question, answer, status, sort_order) VALUES
     ('Faq A?', 'A.', 'published', 1),
     ('Faq B?', 'B.', 'published', 1),
     ('Faq C?', 'C.', 'draft', 0)`,
  )
  .run();
const auditFaq = await listPublishedFaq(db);
record(
  "audit: faq keeps published rows, id breaks sort ties",
  JSON.stringify(auditFaq.map((entry) => entry.question)) ===
    JSON.stringify(["Faq A?", "Faq B?"]),
  auditFaq.map((entry) => entry.question).join(","),
);

sqlite
  .query(
    `INSERT INTO process_steps (step_number, title, explanation, status, sort_order) VALUES
     (1, 'Step A', 'A.', 'visible', 1),
     (2, 'Step B', 'B.', 'visible', 1),
     (3, 'Step C', 'C.', 'hidden', 0)`,
  )
  .run();
const auditSteps = await listPublicProcessSteps(db);
record(
  "audit: process keeps visible steps, id breaks sort ties",
  JSON.stringify(auditSteps.map((step) => step.title)) ===
    JSON.stringify(["Step A", "Step B"]),
  auditSteps.map((step) => step.title).join(","),
);

/* Global settings schema + validation (§10.3) */
record("schema: site_settings table exists", tables.has("site_settings"));
const settingsColumns = columnNames("site_settings");
record(
  "schema: site_settings carry the documented fields",
  [
    "contact_email",
    "contact_phone",
    "address",
    "social_links",
    "global_meta",
    "updated_at",
  ].every((column) => settingsColumns.has(column)),
  [...settingsColumns].join(","),
);

const { getPublicSiteSettings } = await import(
  "../src/lib/db/queries/settings.ts"
);
const { validateSiteSettingsInput } = await import(
  "../src/lib/db/queries/settings-admin.ts"
);

sqlite.query("DELETE FROM site_settings").run();
record(
  "settings query: null until the studio writes the values",
  (await getPublicSiteSettings(db)) === null,
);

const badEmail = validateSiteSettingsInput({ contactEmail: "not-an-email" });
record(
  "settings validation: email addresses are checked",
  badEmail.ok === false &&
    badEmail.errors.some((issue) => issue.includes("valid email")),
  JSON.stringify(badEmail.ok ? [] : badEmail.errors),
);
const badPlatform = validateSiteSettingsInput({
  socialLinks: [{ platform: "myspace", url: "https://example.com" }],
});
record(
  "settings validation: social platforms come from the documented set",
  badPlatform.ok === false &&
    badPlatform.errors.some((issue) => issue.includes("instagram")),
  JSON.stringify(badPlatform.ok ? [] : badPlatform.errors),
);
const dupPlatform = validateSiteSettingsInput({
  socialLinks: [
    { platform: "instagram", url: "https://instagram.com/a" },
    { platform: "instagram", url: "https://instagram.com/b" },
  ],
});
record(
  "settings validation: social platforms stay unique",
  dupPlatform.ok === false &&
    dupPlatform.errors.some((issue) => issue.includes("duplicates")),
  JSON.stringify(dupPlatform.ok ? [] : dupPlatform.errors),
);
const emptySettings = validateSiteSettingsInput({});
record(
  "settings validation: empty patches are rejected",
  emptySettings.ok === false &&
    emptySettings.errors.some((issue) => issue.includes("at least one")),
  JSON.stringify(emptySettings.ok ? [] : emptySettings.errors),
);
const tidySettings = validateSiteSettingsInput({
  contactEmail: "  studio@example.com ",
  contactPhone: "  +62 812 0000 ",
  address: "  Jakarta, Indonesia ",
  socialLinks: [
    { platform: "instagram", url: "  https://instagram.com/ocassio  " },
  ],
});
record(
  "settings validation: valid payloads trim values",
  tidySettings.ok === true &&
    tidySettings.value.contactEmail === "studio@example.com" &&
    tidySettings.value.contactPhone === "+62 812 0000" &&
    tidySettings.value.socialLinks?.[0]?.url ===
      "https://instagram.com/ocassio",
  JSON.stringify(tidySettings.ok ? tidySettings.value : tidySettings.errors),
);

sqlite
  .query(
    "INSERT INTO site_settings (contact_email, contact_phone, address, social_links, global_meta) VALUES (?, ?, ?, ?, ?)",
  )
  .run(
    "studio@example.com",
    "+62 812 0000",
    "Jakarta",
    JSON.stringify([
      { platform: "instagram", url: "https://instagram.com/ocassio" },
    ]),
    JSON.stringify({ studioName: "Ocassio.Project" }),
  );
const settingsQuery = await getPublicSiteSettings(db);
record(
  "settings query: contact fields and JSON columns round-trip",
  settingsQuery?.contactEmail === "studio@example.com" &&
    settingsQuery.socialLinks[0].platform === "instagram" &&
    settingsQuery.globalMeta?.studioName === "Ocassio.Project",
  JSON.stringify(settingsQuery),
);

/* Publish workflow (§24, §38): actions, gates, and the draft → publish flow */
const {
  validatePublishAction,
  statusForAction,
  deleteProtectionIssues,
  servicePublishIssues,
  pricingPublishIssues,
  faqPublishIssues,
  teamPublishIssues,
  clientPublishIssues,
  recognitionPublishIssues,
} = await import("../src/lib/db/queries/publishing.ts");
const { createService, updateService } = await import(
  "../src/lib/db/queries/services-admin.ts"
);

const publishAction = validatePublishAction({ action: "publish" });
record(
  "workflow: publish is a valid action",
  publishAction.ok === true &&
    publishAction.action === "publish" &&
    publishAction.publishAt === null,
);
const unknownAction = validatePublishAction({ action: "launch" });
record(
  "workflow: unknown actions list the allowed values",
  unknownAction.ok === false &&
    unknownAction.issues.some((issue) => issue.includes("save_draft")),
  JSON.stringify(unknownAction.ok ? [] : unknownAction.issues),
);
const scheduleNoDate = validatePublishAction({ action: "schedule" });
record(
  "workflow: scheduling requires a future publishAt",
  scheduleNoDate.ok === false &&
    scheduleNoDate.issues.some((issue) => issue.includes("publishAt")),
  JSON.stringify(scheduleNoDate.ok ? [] : scheduleNoDate.issues),
);
const schedulePast = validatePublishAction({
  action: "schedule",
  publishAt: "2020-01-01T00:00:00.000Z",
});
record(
  "workflow: past publishAt is rejected",
  schedulePast.ok === false &&
    schedulePast.issues.some((issue) => issue.includes("future")),
);
const noSchedule = validatePublishAction(
  { action: "schedule", publishAt: "2999-01-01T00:00:00.000Z" },
  { allowSchedule: false },
);
record(
  "workflow: content types without publish_at cannot schedule",
  noSchedule.ok === false &&
    noSchedule.issues.some((issue) => issue.includes("must be one of")),
  JSON.stringify(noSchedule.ok ? [] : noSchedule.issues),
);
const publishMapping = statusForAction("publish", null);
record(
  "workflow: publish maps to published and clears any schedule",
  publishMapping.status === "published" && publishMapping.publishAt === null,
);
const archiveAction = validatePublishAction({ action: "archive" });
const archiveMapping = statusForAction("archive", null);
record(
  "workflow: archive is a valid action and parks the row in Trash",
  archiveAction.ok === true &&
    archiveMapping.status === "archived" &&
    archiveMapping.publishAt === null,
);
const draftDeleteGuard = deleteProtectionIssues({ status: "draft" });
const archivedDeleteGuard = deleteProtectionIssues({ status: "archived" });
record(
  "delete flow: only archived rows may be permanently deleted",
  draftDeleteGuard.length === 1 &&
    draftDeleteGuard[0].includes("Archive it first") &&
    archivedDeleteGuard.length === 0,
  JSON.stringify(draftDeleteGuard),
);

const badServiceGate = servicePublishIssues({
  name: " ",
  slug: "",
  serviceType: "",
  shortDescription: "",
});
record(
  "gate: services explain every missing required field",
  badServiceGate.length === 4,
  JSON.stringify(badServiceGate),
);
record(
  "gate: a complete service passes",
  servicePublishIssues({
    name: "Photography",
    slug: "photography",
    serviceType: "Photography",
    shortDescription: "Stills.",
  }).length === 0,
);
const quoteGate = pricingPublishIssues({
  packageName: "Commission",
  priceType: "custom_quote",
  amount: 1000,
});
record(
  "gate: custom quotes must not carry an amount",
  quoteGate.some((issue) => issue.includes("must not carry")),
  JSON.stringify(quoteGate),
);
const fixedGate = pricingPublishIssues({
  packageName: "Session",
  priceType: "fixed",
  amount: null,
});
record(
  "gate: fixed prices require an amount",
  fixedGate.some((issue) => issue.includes("numeric amount")),
  JSON.stringify(fixedGate),
);
record(
  "gate: FAQ, team, clients, and recognition gates catch empty fields",
  faqPublishIssues({ question: " ", answer: "" }).length === 2 &&
    teamPublishIssues({ name: "", roleTitle: "" }).length === 2 &&
    clientPublishIssues({ name: "" }).length === 1 &&
    recognitionPublishIssues({
      title: "",
      year: 2024,
      recognitionType: "award",
    }).length === 1,
);

/* Draft → publish → unpublish roundtrip against the throwaway database. */
sqlite.query("DELETE FROM services").run();
const workflowService = await createService(
  {
    name: "Workflow Service",
    slug: "workflow-service",
    serviceType: "Photography",
    shortDescription: "Workflow check.",
    supportingMediaId: null,
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgMediaId: null,
    sortOrder: 1,
    status: "draft",
  },
  db,
);
record(
  "workflow: a new service starts as a draft",
  workflowService.status === "draft" &&
    (await listPublishedServices(db)).length === 0,
);
await updateService(workflowService.id, { status: "published" }, db);
record(
  "workflow: publishing makes the service public",
  (await listPublishedServices(db)).some(
    (service) => service.slug === "workflow-service",
  ),
);
await updateService(workflowService.id, { status: "draft" }, db);
record(
  "workflow: unpublishing hides it again",
  !(await listPublishedServices(db)).some(
    (service) => service.slug === "workflow-service",
  ),
);

/* Version history (§25): numbering, view, and restore */
const {
  recordVersion,
  listVersions,
  getVersionById,
  restoreVersion,
  buildVersionSnapshot,
} = await import("../src/lib/db/queries/version-history.ts");
const { getServiceById } = await import(
  "../src/lib/db/queries/services-admin.ts"
);

record(
  "schema: version_history table exists",
  tables.has("version_history"),
  [...tables].join(","),
);
const versionColumns = columnNames("version_history");
record(
  "schema: version_history carries the documented fields",
  [
    "entity_type",
    "entity_id",
    "version_no",
    "snapshot",
    "created_by",
    "created_at",
  ].every((column) => versionColumns.has(column)),
  [...versionColumns].join(","),
);
const versionIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: version history indexes exist",
  versionIndexes.has("version_history_entity_version_idx") &&
    versionIndexes.has("version_history_entity_idx"),
);

sqlite.query("DELETE FROM services").run();
sqlite
  .query(
    `DELETE FROM version_history WHERE entity_type = 'service'
       OR (entity_type = 'studio_about' AND entity_id NOT IN (SELECT id FROM studio_about))
       OR (entity_type = 'pricing' AND entity_id NOT IN (SELECT id FROM pricing))`,
  )
  .run();
const historyService = await createService(
  {
    name: "History Service",
    slug: "history-service",
    serviceType: "Photography",
    shortDescription: "First.",
    supportingMediaId: null,
    seoMetaTitle: null,
    seoMetaDescription: null,
    seoOgMediaId: null,
    sortOrder: 1,
    status: "draft",
  },
  db,
);
await recordVersion(
  "service",
  historyService.id,
  await buildVersionSnapshot("service", historyService.id, db),
  db,
);
await updateService(historyService.id, { shortDescription: "Second." }, db);
await recordVersion(
  "service",
  historyService.id,
  await buildVersionSnapshot("service", historyService.id, db),
  db,
);
const versionList = await listVersions("service", historyService.id, db);
record(
  "version history: saves append numbered versions, newest first",
  versionList.length === 2 &&
    versionList[0].versionNo === 2 &&
    versionList[1].versionNo === 1,
  versionList.map((version) => version.versionNo).join(","),
);
const firstVersion = await getVersionById(versionList[1].id, db);
record(
  "version history: a snapshot keeps the saved content",
  firstVersion?.snapshot?.service?.shortDescription === "First.",
);
const restored = await restoreVersion(firstVersion.id, db);
const restoredRow = await getServiceById(historyService.id, db);
const afterRestoreList = await listVersions("service", historyService.id, db);
record(
  "version history: restore writes content back and appends a version",
  restored.ok === true &&
    restoredRow?.shortDescription === "First." &&
    afterRestoreList.length === 3 &&
    afterRestoreList[0].versionNo === 3,
  `versions=${afterRestoreList.length}`,
);
const missingRestore = await restoreVersion(999999, db);
record(
  "version history: restoring a missing version is a 404 result",
  missingRestore.ok === false && missingRestore.status === 404,
);

sqlite
  .query(
    "DELETE FROM version_history WHERE entity_type = 'service' AND entity_id = ?",
  )
  .run(historyService.id);
sqlite.query("DELETE FROM services WHERE id = ?").run(historyService.id);

/* Scheduled publishing (§24): lazy auto-publish sweeps */
const { publishDueScheduledContent } = await import(
  "../src/lib/db/queries/scheduling.ts"
);

sqlite.query("DELETE FROM articles").run();
sqlite.query("DELETE FROM legal_pages").run();
sqlite
  .query(
    `INSERT INTO articles (title, slug, excerpt, publish_date, status, visibility, publish_at) VALUES
     ('Due article', 'due-article', 'Due.', '2026-01-01', 'scheduled', 'public', '2020-01-01T00:00:00.000Z'),
     ('Future article', 'future-article', 'Future.', '2026-01-02', 'scheduled', 'public', '2999-01-01T00:00:00.000Z'),
     ('Parked article', 'parked-article', 'Parked.', '2026-01-03', 'scheduled', 'public', NULL)`,
  )
  .run();
sqlite
  .query(
    `INSERT INTO legal_pages (title, slug, body, updated_date, status, publish_at) VALUES
     ('Due page', 'due-page', '[{"type":"paragraph","text":"P."}]', '2026-01-01', 'scheduled', '2020-01-01T00:00:00.000Z'),
     ('Future page', 'future-page', '[{"type":"paragraph","text":"P."}]', '2026-01-01', 'scheduled', '2999-01-01T00:00:00.000Z')`,
  )
  .run();
const sweep = await publishDueScheduledContent(db);
const dueArticleRow = sqlite
  .query("SELECT status FROM articles WHERE slug = 'due-article'")
  .get();
const futureArticleRow = sqlite
  .query("SELECT status FROM articles WHERE slug = 'future-article'")
  .get();
const parkedArticleRow = sqlite
  .query("SELECT status FROM articles WHERE slug = 'parked-article'")
  .get();
const duePageRow = sqlite
  .query("SELECT status FROM legal_pages WHERE slug = 'due-page'")
  .get();
const futurePageRow = sqlite
  .query("SELECT status FROM legal_pages WHERE slug = 'future-page'")
  .get();
record(
  "scheduling: due scheduled rows auto-publish, the rest stay parked",
  sweep.articles === 1 &&
    sweep.legalPages === 1 &&
    dueArticleRow.status === "published" &&
    futureArticleRow.status === "scheduled" &&
    parkedArticleRow.status === "scheduled" &&
    duePageRow.status === "published" &&
    futurePageRow.status === "scheduled",
  JSON.stringify({
    sweep,
    due: dueArticleRow.status,
    future: futureArticleRow.status,
    parked: parkedArticleRow.status,
    duePage: duePageRow.status,
    futurePage: futurePageRow.status,
  }),
);
const emptySweep = await publishDueScheduledContent(db);
record(
  "scheduling: a second sweep flips nothing",
  emptySweep.articles === 0 && emptySweep.legalPages === 0,
);

/* Likes (studio request): persisted per visitor */
const { getLikeState, toggleLike } = await import(
  "../src/lib/db/queries/likes.ts"
);

record(
  "schema: likes table exists",
  tables.has("likes"),
  [...tables].join(","),
);
const likeColumns = columnNames("likes");
record(
  "schema: likes carry the documented fields",
  ["entity_type", "entity_slug", "visitor_id", "created_at"].every((column) =>
    likeColumns.has(column),
  ),
  [...likeColumns].join(","),
);
const likeIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: like uniqueness is enforced per visitor",
  likeIndexes.has("likes_entity_visitor_idx") &&
    likeIndexes.has("likes_entity_idx"),
);

sqlite.query("DELETE FROM likes").run();
const likeBaseline = await getLikeState("project", "dean-and-deb", null, db);
record(
  "likes: a fresh entity starts at zero",
  likeBaseline.count === 0 && likeBaseline.liked === false,
);
const firstLike = await toggleLike(
  "project",
  "dean-and-deb",
  "verify-visitor-0001",
  db,
);
record(
  "likes: toggling on persists and counts",
  firstLike.liked === true && firstLike.count === 1,
  JSON.stringify(firstLike),
);
const secondVisitor = await toggleLike(
  "project",
  "dean-and-deb",
  "verify-visitor-0002",
  db,
);
record("likes: a second visitor adds to the count", secondVisitor.count === 2);
const toggledOff = await toggleLike(
  "project",
  "dean-and-deb",
  "verify-visitor-0001",
  db,
);
record(
  "likes: toggling off removes the like",
  toggledOff.liked === false && toggledOff.count === 1,
  JSON.stringify(toggledOff),
);
const otherEntity = await toggleLike(
  "article",
  "life-untolds-in-monochrome",
  "verify-visitor-0001",
  db,
);
record(
  "likes: counts stay per entity",
  otherEntity.count === 1 &&
    (await getLikeState("project", "dean-and-deb", null, db)).count === 1,
);

/* Admin access: users, roles, sessions (§27) */
const {
  createUser,
  findUserByEmail,
  findUserById,
  listUsers,
  updateUser,
  countOtherActiveOwners,
  lastOwnerLockoutIssues,
  hashPassword,
  verifyPassword,
} = await import("../src/lib/auth/users.ts");
const {
  createSession,
  getSessionUserByToken,
  deleteSessionByToken,
  hashSessionToken,
} = await import("../src/lib/auth/sessions.ts");
const { validateUserCreate, validateUserUpdate } = await import(
  "../src/lib/auth/user-validation.ts"
);

record(
  "schema: users and sessions tables exist",
  tables.has("users") && tables.has("sessions"),
  [...tables].join(","),
);
const userColumns = columnNames("users");
record(
  "schema: users carry the documented fields",
  [
    "name",
    "email",
    "password_hash",
    "role",
    "status",
    "last_login_at",
    "created_at",
    "updated_at",
  ].every((column) => userColumns.has(column)),
  [...userColumns].join(","),
);
const sessionColumns = columnNames("sessions");
record(
  "schema: sessions carry expiry and the user link",
  ["id", "user_id", "expires_at", "created_at"].every((column) =>
    sessionColumns.has(column),
  ),
  [...sessionColumns].join(","),
);
const accessIndexes = new Set(
  sqlite
    .query("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((row) => row.name),
);
record(
  "schema: access indexes exist",
  [
    "users_email_idx",
    "users_role_idx",
    "sessions_user_idx",
    "sessions_expires_idx",
  ].every((index) => accessIndexes.has(index)),
);

sqlite.query("DELETE FROM sessions").run();
sqlite.query("DELETE FROM users").run();

const passwordHash = await hashPassword("correct horse battery");
record(
  "auth: passwords hash and verify",
  (await verifyPassword("correct horse battery", passwordHash)) === true &&
    (await verifyPassword("wrong password", passwordHash)) === false &&
    passwordHash !== "correct horse battery",
);

const ownerUser = await createUser(
  {
    name: "Owner One",
    email: "owner-one@example.com",
    password: "owner-password-1",
    role: "owner",
  },
  db,
);
const editorUser = await createUser(
  {
    name: "Editor One",
    email: "editor-one@example.com",
    password: "editor-password-1",
    role: "editor",
  },
  db,
);
const publicUsers = listUsers(db);
record(
  "users: create, find, and list never leak hashes",
  findUserByEmail("owner-one@example.com", db)?.id === ownerUser.id &&
    publicUsers.length === 2 &&
    !("passwordHash" in (publicUsers[0] ?? {})),
  JSON.stringify(publicUsers.map((user) => user.email)),
);
record(
  "users: last-owner counting ignores other roles",
  countOtherActiveOwners(ownerUser.id, db) === 0 &&
    countOtherActiveOwners(editorUser.id, db) === 1,
);
await updateUser(editorUser.id, { status: "disabled" }, db);
record(
  "users: updates apply status",
  findUserById(editorUser.id, db)?.status === "disabled",
);

const lockoutIssues = lastOwnerLockoutIssues(
  { role: "owner", status: "active" },
  { role: "editor" },
  0,
);
record(
  "users: the last active owner cannot be demoted or disabled",
  lockoutIssues.length === 1 &&
    lockoutIssues[0].includes("active owner") &&
    lastOwnerLockoutIssues(
      { role: "owner", status: "active" },
      { role: "editor" },
      1,
    ).length === 0 &&
    lastOwnerLockoutIssues(
      { role: "editor", status: "active" },
      { role: "sales" },
      0,
    ).length === 0,
  JSON.stringify(lockoutIssues),
);

const sessionToken = await createSession(ownerUser.id, db);
record(
  "sessions: a fresh token resolves to its active user",
  getSessionUserByToken(sessionToken, db)?.id === ownerUser.id,
);
record(
  "sessions: disabled users cannot hold a session",
  getSessionUserByToken(await createSession(editorUser.id, db), db) === null,
);
await deleteSessionByToken(sessionToken, db);
record(
  "sessions: sign-out removes the session",
  getSessionUserByToken(sessionToken, db) === null,
);

const expiredToken = "expired-token-for-tests";
sqlite
  .query("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
  .run(hashSessionToken(expiredToken), ownerUser.id, Date.now() - 1000);
record(
  "sessions: expired sessions are pruned on sight",
  getSessionUserByToken(expiredToken, db) === null &&
    sqlite.query("SELECT COUNT(*) AS count FROM sessions").get().count === 0,
);

const badUserCreate = validateUserCreate({
  name: "",
  email: "nope",
  password: "short",
  role: "wizard",
});
record(
  "users validation: create reports every problem",
  badUserCreate.ok === false && badUserCreate.errors.length >= 4,
  JSON.stringify(badUserCreate.ok ? [] : badUserCreate.errors),
);
const tidyUser = validateUserCreate({
  name: "  Editor Two  ",
  email: "  Editor2@Example.com ",
  password: "long-enough-1",
  role: "editor",
});
record(
  "users validation: create trims and lowercases",
  tidyUser.ok === true &&
    tidyUser.value.name === "Editor Two" &&
    tidyUser.value.email === "editor2@example.com" &&
    tidyUser.value.role === "editor",
);
const emptyUserPatch = validateUserUpdate({});
record(
  "users validation: empty patches are rejected",
  emptyUserPatch.ok === false &&
    emptyUserPatch.errors.some((issue) => issue.includes("at least one")),
  JSON.stringify(emptyUserPatch.ok ? [] : emptyUserPatch.errors),
);

/* Studio + Services seeds (§6.4-§6.8) */
const { seedStudio } = await import("./seed-studio.mjs");
const { seedServices } = await import("./seed-services.mjs");
const { seedTeam } = await import("./seed-team.mjs");
const { TEAM_MEMBERS } = await import("../src/lib/content/studio.ts");

sqlite.query("DELETE FROM services").run();
sqlite.query("DELETE FROM studio_about").run();
sqlite.query("DELETE FROM team_members").run();
seedStudio(sqlite);
seedStudio(sqlite); // idempotency
seedTeam(sqlite);
seedTeam(sqlite); // idempotency
sqlite.query("DELETE FROM projects").run();
const { seedProjects } = await import("./seed-projects.mjs");
seedProjects(sqlite);
seedProjects(sqlite); // idempotency
seedServices(sqlite);
seedServices(sqlite); // idempotency

const studioRows = sqlite
  .query("SELECT COUNT(*) AS count FROM studio_about")
  .get().count;
record(
  "seed: the About singleton is seeded once (idempotent)",
  studioRows === 1,
  `rows=${studioRows}`,
);

const seededTeamRows = sqlite
  .query(
    "SELECT COUNT(*) AS count FROM team_members WHERE status = 'published' AND visibility = 'public'",
  )
  .get().count;
const seededTeamTotal = sqlite
  .query("SELECT COUNT(*) AS count FROM team_members")
  .get().count;
record(
  "seed: the placeholder team roster is seeded once (idempotent)",
  seededTeamRows === TEAM_MEMBERS.length &&
    seededTeamTotal === TEAM_MEMBERS.length,
  `rows=${seededTeamTotal}`,
);

const { seedSettings, STUDIO_CONTACT_EMAIL } = await import(
  "./seed-settings.mjs"
);
sqlite.query("DELETE FROM site_settings").run();
seedSettings(sqlite);
seedSettings(sqlite); // idempotency
const settingsSeedRows = sqlite
  .query("SELECT contact_email FROM site_settings")
  .all();
record(
  "seed: the settings singleton carries the studio contact email",
  settingsSeedRows.length === 1 &&
    settingsSeedRows[0].contact_email === STUDIO_CONTACT_EMAIL,
  `rows=${settingsSeedRows.length} email=${settingsSeedRows[0]?.contact_email ?? "null"}`,
);

const seededProjectRows = sqlite
  .query("SELECT COUNT(*) AS count FROM projects")
  .get().count;
record(
  "seed: the five studio projects are seeded once (idempotent)",
  seededProjectRows === 5,
  `rows=${seededProjectRows}`,
);

const seededServices = sqlite
  .query("SELECT slug, status FROM services ORDER BY sort_order")
  .all();
record(
  "seed: seven published services in the documented order",
  seededServices.length === 7 &&
    seededServices[0].slug === "photography" &&
    seededServices[6].slug === "creative-production" &&
    seededServices.every((row) => row.status === "published"),
  seededServices.map((row) => row.slug).join(","),
);
const seededDetails = sqlite
  .query("SELECT COUNT(*) AS count FROM service_details")
  .get().count;
record(
  "seed: every service carries details",
  seededDetails === 7,
  `details=${seededDetails}`,
);
const seededRelations = sqlite
  .query("SELECT COUNT(*) AS count FROM service_project_relations")
  .get().count;
record(
  "seed: selected work relations are seeded",
  seededRelations === 10,
  `relations=${seededRelations}`,
);
const seededPricing = sqlite
  .query("SELECT COUNT(*) AS count FROM pricing")
  .get().count;
const customQuotes = sqlite
  .query(
    "SELECT COUNT(*) AS count FROM pricing WHERE amount IS NULL AND price_type = 'custom_quote'",
  )
  .get().count;
record(
  "seed: four pricing entries, all custom quotes",
  seededPricing === 4 && customQuotes === 4,
  `pricing=${seededPricing}`,
);
const seededSteps = sqlite
  .query("SELECT COUNT(*) AS count FROM process_steps WHERE status = 'visible'")
  .get().count;
record(
  "seed: nine visible process steps",
  seededSteps === 9,
  `steps=${seededSteps}`,
);

/* Media assets + variants schema */
record(
  "schema: media tables exist",
  tables.has("media_assets") && tables.has("media_variants"),
);
const mediaAssetColumns = columnNames("media_assets");
record(
  "schema: media_assets carry the documented fields",
  [
    "filename",
    "media_type",
    "mime_type",
    "width",
    "height",
    "file_size",
    "storage_key",
    "alt_text",
    "credit",
    "focal_point_x",
    "focal_point_y",
    "usage_state",
    "created_at",
  ].every((column) => mediaAssetColumns.has(column)),
  [...mediaAssetColumns].join(","),
);
const mediaVariantColumns = columnNames("media_variants");
record(
  "schema: media_variants carry the documented fields",
  ["asset_id", "format", "url", "width", "height"].every((column) =>
    mediaVariantColumns.has(column),
  ),
  [...mediaVariantColumns].join(","),
);

const cascadeAsset = sqlite
  .query(
    `INSERT INTO media_assets (filename, media_type, mime_type, width, height, file_size, storage_key)
     VALUES ('verify-1.png', 'image', 'image/png', 10, 10, 100, 'data/uploads/originals/verify-1.png') RETURNING id`,
  )
  .get();
sqlite
  .query(
    `INSERT INTO media_variants (asset_id, format, url, width, height)
     VALUES (?, 'thumbnail', '/media/uploads/verify/verify@480.jpg', 480, 480)`,
  )
  .run(cascadeAsset.id);
sqlite.query("DELETE FROM media_assets WHERE id = ?").run(cascadeAsset.id);
record(
  "schema: deleting an asset cascades to its variants",
  sqlite
    .query("SELECT COUNT(*) AS count FROM media_variants")
    .get().count === 0,
);

/* Media manifest: the footer avatar set built from avatar-footer/ */
const { getFooterAvatars } = await import("../src/lib/content/media.ts");
const footerAvatars = getFooterAvatars();
record(
  "media: the footer avatar photos are built from avatar-footer/",
  footerAvatars.length >= 4 &&
    footerAvatars.every(
      (photo) => Object.keys(photo.variants).length >= 1 && photo.width > 0,
    ),
  `avatars=${footerAvatars.map((photo) => photo.id).join(",")}`,
);

/* Entry validation: length limits + tidy values (pure function). */
const { validateUpcomingInput } = await import(
  "../src/lib/db/queries/upcoming-admin.ts"
);
const longTitle = validateUpcomingInput(
  {
    title: "T".repeat(161),
    projectType: "Film",
    teaser: "Teaser.",
    status: "coming_soon",
    visibility: "public",
  },
  { partial: false },
);
record(
  "validation: over-long title is rejected with the limit",
  longTitle.ok === false &&
    longTitle.errors.some((error) => error.includes("160 characters")),
  JSON.stringify(longTitle.ok ? [] : longTitle.errors),
);
const negativeSort = validateUpcomingInput(
  { sortOrder: -1 },
  { partial: true },
);
record(
  "validation: negative sortOrder is rejected",
  negativeSort.ok === false &&
    negativeSort.errors.some((error) => error.includes("non-negative")),
  JSON.stringify(negativeSort.ok ? [] : negativeSort.errors),
);
const blankTeaser = validateUpcomingInput(
  { teaser: "   " },
  { partial: true },
);
record(
  "validation: whitespace-only teaser is rejected",
  blankTeaser.ok === false &&
    blankTeaser.errors.some((error) => error.includes("non-empty")),
  JSON.stringify(blankTeaser.ok ? [] : blankTeaser.errors),
);
const tidyValues = validateUpcomingInput(
  {
    title: "  Trimmed title  ",
    projectType: "Film",
    teaser: "A teaser.",
    location: "   ",
    status: "in_production",
    visibility: "public",
    sortOrder: 3,
  },
  { partial: false },
);
record(
  "validation: valid payloads trim values and null empty optional fields",
  tidyValues.ok === true &&
    tidyValues.value.title === "Trimmed title" &&
    tidyValues.value.location === null &&
    tidyValues.value.sortOrder === 3,
  JSON.stringify(tidyValues.ok ? tidyValues.value : tidyValues.errors),
);

/* Inquiry attachment pipeline (§6.13). */
const {
  AttachmentValidationError,
  MAX_INQUIRY_ATTACHMENT_BYTES,
  removeInquiryAttachment,
  storeInquiryAttachment,
} = await import("../src/lib/media/attachments.ts");
const { existsSync } = await import("node:fs");
const { readFileSync } = await import("node:fs");

const pdfBuffer = Buffer.from("%PDF-1.4 verification attachment");
const stored = await storeInquiryAttachment({
  buffer: pdfBuffer,
  filename: "Mood Board.pdf",
  mimeType: "application/pdf",
});
record(
  "attachments: valid PDF stores with safe metadata",
  existsSync(stored.storageKey) &&
    stored.size === pdfBuffer.byteLength &&
    stored.filename.endsWith("-mood-board.pdf"),
  stored.filename,
);
record(
  "attachments: the stored bytes roundtrip exactly",
  readFileSync(stored.storageKey).equals(pdfBuffer),
);

let wrongMimeError = "";
try {
  await storeInquiryAttachment({
    buffer: Buffer.from("notes"),
    filename: "notes.txt",
    mimeType: "text/plain",
  });
} catch (error) {
  wrongMimeError =
    error instanceof AttachmentValidationError ? error.message : "wrong error";
}
record(
  "attachments: non-PDF/image uploads are rejected",
  wrongMimeError.includes("PDF, JPG, JPEG, or PNG"),
  wrongMimeError,
);

let oversizeError = "";
try {
  await storeInquiryAttachment({
    buffer: Buffer.alloc(MAX_INQUIRY_ATTACHMENT_BYTES + 1),
    filename: "huge.pdf",
    mimeType: "application/pdf",
  });
} catch (error) {
  oversizeError =
    error instanceof AttachmentValidationError ? error.message : "wrong error";
}
record(
  "attachments: files over 10 MB are rejected",
  oversizeError.includes("10 MB"),
  oversizeError,
);

let emptyError = "";
try {
  await storeInquiryAttachment({
    buffer: Buffer.alloc(0),
    filename: "empty.pdf",
    mimeType: "application/pdf",
  });
} catch (error) {
  emptyError =
    error instanceof AttachmentValidationError ? error.message : "wrong error";
}
record("attachments: empty files are rejected", emptyError.includes("empty"));

await removeInquiryAttachment(stored.storageKey);
record(
  "attachments: removal deletes the stored file",
  !existsSync(stored.storageKey),
);

let spoofedPngError = "";
try {
  await storeInquiryAttachment({
    buffer: Buffer.from("this is not really a png"),
    filename: "spoof.png",
    mimeType: "image/png",
  });
} catch (error) {
  spoofedPngError =
    error instanceof AttachmentValidationError ? error.message : "wrong error";
}
record(
  "attachments: spoofed mime types are rejected by signature",
  spoofedPngError.includes("does not match"),
  spoofedPngError,
);
let spoofedJpegError = "";
try {
  await storeInquiryAttachment({
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
    filename: "spoof.jpg",
    mimeType: "image/jpeg",
  });
} catch (error) {
  spoofedJpegError =
    error instanceof AttachmentValidationError ? error.message : "wrong error";
}
record(
  "attachments: png bytes under a jpeg label are rejected",
  spoofedJpegError.includes("does not match"),
  spoofedJpegError,
);

/* Brief validation, pure-function layer. */
const { validateInquiryBody } = await import(
  "../src/lib/api/inquiry-validation.ts"
);
const emptyBrief = validateInquiryBody({}, []);
record(
  "brief validation: every required field is reported",
  emptyBrief.ok === false &&
    emptyBrief.issues.some((issue) => issue.includes("full name")) &&
    emptyBrief.issues.some((issue) => issue.includes("email address")) &&
    emptyBrief.issues.some((issue) => issue.includes("service")) &&
    emptyBrief.issues.some((issue) => issue.includes("project type")) &&
    emptyBrief.issues.some((issue) => issue.includes("Describe")),
  JSON.stringify(emptyBrief.ok ? [] : emptyBrief.issues),
);
const badEnums = validateInquiryBody(
  {
    fullName: "Ayu",
    email: "ayu@example.com",
    service: "Skydiving",
    projectType: "Wedding",
    description: "A commission for a family celebration, planned for late 2026.",
  },
  [],
);
record(
  "brief validation: enum fields list the allowed values",
  badEnums.ok === false &&
    badEnums.issues.some((issue) => issue.includes("Photography")) &&
    badEnums.issues.some((issue) => issue.includes("Editorial")),
  JSON.stringify(badEnums.ok ? [] : badEnums.issues),
);
const longBudget = validateInquiryBody(
  {
    fullName: "Ayu",
    email: "ayu@example.com",
    service: "Photography",
    projectType: "Photography",
    description: "A commission for a family celebration, planned for late 2026.",
    budgetRange: "B".repeat(161),
  },
  [],
);
record(
  "brief validation: field caps are enforced with the limit",
  longBudget.ok === false &&
    longBudget.issues.some((issue) => issue.includes("160 characters")),
  JSON.stringify(longBudget.ok ? [] : longBudget.issues),
);
const tidyBrief = validateInquiryBody(
  {
    fullName: "  Ayu Larasati  ",
    company: "   ",
    email: "  ayu@example.com ",
    service: "Photography",
    projectType: "Photography",
    description:
      "  A commission for a family celebration, planned for late 2026.  ",
    referenceUrl: " https://example.com/mood ",
  },
  [],
);
record(
  "brief validation: valid payloads trim and null empty fields",
  tidyBrief.ok === true &&
    tidyBrief.value.fullName === "Ayu Larasati" &&
    tidyBrief.value.company === null &&
    tidyBrief.value.email === "ayu@example.com" &&
    tidyBrief.value.referenceUrl === "https://example.com/mood",
  JSON.stringify(tidyBrief.ok ? tidyBrief.value : tidyBrief.issues),
);

/* Admin guard: fails closed without a configured token. */const { requireAdminToken } = await import("../src/lib/api/admin-auth.ts");
const previousToken = process.env.OCASSIO_ADMIN_TOKEN;
delete process.env.OCASSIO_ADMIN_TOKEN;
const unconfigured = requireAdminToken(
  new Request("http://localhost/api/admin/now"),
);
record(
  "admin guard: unconfigured token fails closed with 503",
  unconfigured?.status === 503,
  `status=${unconfigured?.status}`,
);
process.env.OCASSIO_ADMIN_TOKEN = "verify-token";
const unauthorized = requireAdminToken(
  new Request("http://localhost/api/admin/now", {
    headers: { authorization: "Bearer wrong" },
  }),
);
record(
  "admin guard: wrong bearer token is rejected",
  unauthorized?.status === 401,
  `status=${unauthorized?.status}`,
);
const authorized = requireAdminToken(
  new Request("http://localhost/api/admin/now", {
    headers: { authorization: "Bearer verify-token" },
  }),
);
record("admin guard: matching token passes through", authorized === null);
if (previousToken === undefined) delete process.env.OCASSIO_ADMIN_TOKEN;
else process.env.OCASSIO_ADMIN_TOKEN = previousToken;

sqlite.close();
rmSync(dbPath, { force: true });
rmSync(`${dbPath}-shm`, { force: true });
rmSync(`${dbPath}-wal`, { force: true });

const failed = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    {
      passed: results.length - failed.length,
      failed: failed.length,
      results,
    },
    null,
    2,
  ),
);

if (failed.length > 0) process.exit(1);
