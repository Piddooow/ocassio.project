/**
 * Public API verification against the running dev server.
 * Usage: bun scripts/verify-api.mjs   (or: bun run verify:api)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const { Database } = await import("bun:sqlite");

const results = [];
const record = (name, ok, detail = "") =>
  results.push({ name, ok: Boolean(ok), detail });

async function get(path) {
  const response = await fetch(`${BASE}${path}`);
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
}

/* Baseline list */
const list = await get("/api/articles");
record(
  "api: list responds 200 with four public articles",
  list.status === 200 && list.body?.data?.length === 4,
  `status=${list.status} items=${list.body?.data?.length}`,
);
record(
  "api: meta carries total, limit, offset",
  list.body?.meta?.total === 4 &&
    list.body?.meta?.limit === 10 &&
    list.body?.meta?.offset === 0,
  JSON.stringify(list.body?.meta),
);
const dates = list.body?.data?.map((article) => article.publishDate) ?? [];
record(
  "api: newest first",
  dates.length === 4 &&
    dates.every((date, index) => index === 0 || dates[index - 1] >= date),
  dates.join(","),
);
record(
  "api: items carry category, reading time and block count",
  list.body?.data?.every(
    (article) =>
      article.category?.slug &&
      /^\d+ min read$/.test(article.readingTime) &&
      article.blockCount >= 1,
  ),
);
const allSlugs = (list.body?.data ?? []).map((article) => article.slug);
record(
  "api: the feed carries exactly the four journal stories",
  allSlugs.length === 4 &&
    [
      "life-untolds-in-monochrome",
      "laidthis-nite-in-print",
      "the-shape-of-someone",
      "before-the-first-note",
    ].every((slug) => allSlugs.includes(slug)),
  allSlugs.join(","),
);

const photography = await get("/api/articles?category=photography");
record(
  "api: category counts stay exact",
  photography.status === 200 &&
    photography.body?.data?.length === 1 &&
    photography.body?.data?.[0]?.slug === "the-shape-of-someone",
  `items=${photography.body?.data?.length}`,
);

/* Category filter */
const studioNotes = await get("/api/articles?category=studio-notes");
record(
  "api: category filter narrows the list",
  studioNotes.status === 200 &&
    studioNotes.body?.data?.length === 1 &&
    studioNotes.body?.meta?.total === 1,
  `items=${studioNotes.body?.data?.length}`,
);
const film = await get("/api/articles?category=film");
record(
  "api: film category stays empty for the public",
  film.status === 200 &&
    film.body?.data?.length === 0 &&
    film.body?.meta?.total === 0,
  `items=${film.body?.data?.length}`,
);

/* Pagination */
const page = await get("/api/articles?limit=2&offset=1");
record(
  "api: pagination returns the requested window",
  page.status === 200 &&
    page.body?.data?.length === 2 &&
    page.body.meta.total === 4 &&
    page.body.meta.offset === 1 &&
    page.body.data[0].slug === list.body.data[1].slug,
  JSON.stringify(page.body?.meta),
);

/* Validation */
const unknownCategory = await get("/api/articles?category=not-a-category");
record(
  "api: unknown category is a specific 400",
  unknownCategory.status === 400 &&
    String(unknownCategory.body?.error).includes("not-a-category"),
  `status=${unknownCategory.status}`,
);
const badLimit = await get("/api/articles?limit=999");
record("api: limit above the cap is a 400", badLimit.status === 400);
const badOffset = await get("/api/articles?offset=-1");
record("api: negative offset is a 400", badOffset.status === 400);

/* Single article */
const single = await get("/api/articles/life-untolds-in-monochrome");
record(
  "api single: published article returns 200",
  single.status === 200 &&
    single.body?.data?.title === "Life Untolds, in Monochrome",
  `status=${single.status}`,
);
record(
  "api single: body blocks arrive in order with content",
  Array.isArray(single.body?.data?.blocks) &&
    single.body.data.blocks.length === 5 &&
    single.body.data.blocks[0].type === "paragraph" &&
    String(single.body.data.blocks[0].text).startsWith(
      "Printing black and white",
    ) &&
    single.body.data.blocks.some((block) => block.type === "quote"),
  JSON.stringify((single.body?.data?.blocks ?? []).map((b) => b.type)),
);
record(
  "api single: category and reading time included",
  single.body?.data?.category?.slug === "studio-notes" &&
    /^\d+ min read$/.test(single.body?.data?.readingTime ?? ""),
  JSON.stringify(single.body?.data?.category),
);

const unknownArticle = await get("/api/articles/does-not-exist");
record(
  "api single: unknown slug is a 404",
  unknownArticle.status === 404,
  `status=${unknownArticle.status}`,
);

/* Related articles */
const related = await get(
  "/api/articles/life-untolds-in-monochrome/related",
);
record(
  "api related: defaults to three related articles",
  related.status === 200 && related.body?.data?.length === 3,
  `items=${related.body?.data?.length}`,
);
record(
  "api related: newest remaining story leads, self excluded",
  related.body?.data?.[0]?.slug === "laidthis-nite-in-print" &&
    !(related.body?.data ?? []).some(
      (article) => article.slug === "life-untolds-in-monochrome",
    ),
  (related.body?.data ?? []).map((article) => article.slug).join(","),
);
const relatedLimited = await get(
  "/api/articles/life-untolds-in-monochrome/related?limit=2",
);
record(
  "api related: limit narrows the list",
  relatedLimited.status === 200 && relatedLimited.body?.data?.length === 2,
  `items=${relatedLimited.body?.data?.length}`,
);
const relatedBadLimit = await get(
  "/api/articles/life-untolds-in-monochrome/related?limit=99",
);
record("api related: limit above the cap is a 400", relatedBadLimit.status === 400);
const relatedUnknown = await get("/api/articles/does-not-exist/related");
record(
  "api related: unknown article is a 404",
  relatedUnknown.status === 404,
  `status=${relatedUnknown.status}`,
);

/* Project lookup */
const project = await get("/api/projects/dean-and-deb");
record(
  "api projects: lookup returns public project data",
  project.status === 200 &&
    project.body?.data?.title === "Dean & Deb" &&
    project.body?.data?.category === "Photography" &&
    project.body?.data?.href === "/work/dean-and-deb",
  `status=${project.status}`,
);
record(
  "api projects: media counts match the manifest",
  project.body?.data?.mediaCount?.photographs === 51 &&
    project.body?.data?.mediaCount?.films === 0,
  JSON.stringify(project.body?.data?.mediaCount),
);
const projectFilm = await get("/api/projects/tere-and-chris");
record(
  "api projects: film project exposes five cuts",
  projectFilm.status === 200 &&
    projectFilm.body?.data?.mediaCount?.films === 5,
  JSON.stringify(projectFilm.body?.data?.mediaCount),
);
const unknownProject = await get("/api/projects/does-not-exist");
record(
  "api projects: unknown slug is a 404",
  unknownProject.status === 404,
  `status=${unknownProject.status}`,
);

/* Now entries */
const nowList = await get("/api/now");
record(
  "api now: responds 200, honest empty state until teasers exist",
  nowList.status === 200 &&
    Array.isArray(nowList.body?.data) &&
    nowList.body.data.length === 0 &&
    nowList.body?.meta?.total === 0,
  `total=${nowList.body?.meta?.total}`,
);

/* Admin CRUD for Now entries (guarded, fail closed). */
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "dev-admin-token";

async function call(path, { method = "GET", token, cookie, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  const setCookie =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  return { status: response.status, body: json, setCookie };
}

/** §26 delete flow: Archive → Trash → Permanent Delete. */
async function archiveThenDelete(path) {
  await call(`${path}/actions`, {
    method: "POST",
    token: ADMIN_TOKEN,
    body: { action: "archive" },
  });
  return call(path, { method: "DELETE", token: ADMIN_TOKEN });
}

const adminNoAuth = await call("/api/admin/now");
record(
  "admin now: requests without a token are rejected",
  adminNoAuth.status === 401,
  `status=${adminNoAuth.status}`,
);
const adminWrongAuth = await call("/api/admin/now", { token: "wrong-token" });
record(
  "admin now: wrong tokens are rejected",
  adminWrongAuth.status === 401,
  `status=${adminWrongAuth.status}`,
);

const adminListBefore = await call("/api/admin/now", { token: ADMIN_TOKEN });
record(
  "admin now: authorized listing works",
  adminListBefore.status === 200 && Array.isArray(adminListBefore.body?.data),
  `status=${adminListBefore.status}`,
);

const invalidCreate = await call("/api/admin/now", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { projectType: "Film" },
});
record(
  "admin now: invalid payloads explain every missing field",
  invalidCreate.status === 400 &&
    Array.isArray(invalidCreate.body?.issues) &&
    invalidCreate.body.issues.some((issue) => issue.startsWith("title")) &&
    invalidCreate.body.issues.some((issue) => issue.startsWith("visibility")),
  JSON.stringify(invalidCreate.body?.issues),
);

const overlongCreate = await call("/api/admin/now", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "T".repeat(200),
    projectType: "Film",
    teaser: "Teaser.",
    status: "coming_soon",
    visibility: "public",
  },
});
record(
  "admin now: field length limits are enforced",
  overlongCreate.status === 400 &&
    JSON.stringify(overlongCreate.body?.issues ?? "").includes(
      "160 characters",
    ),
  JSON.stringify(overlongCreate.body?.issues),
);

const created = await call("/api/admin/now", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "API teaser (E2E)",
    projectType: "Film",
    teaser: "Created by the verification suite.",
    location: "Jakarta",
    expectedRelease: "Q3 2027",
    status: "coming_soon",
    visibility: "public",
    sortOrder: 99,
  },
});
record(
  "admin now: create returns the stored entry",
  created.status === 201 &&
    created.body?.data?.title === "API teaser (E2E)" &&
    created.body?.data?.visibility === "public",
  `status=${created.status}`,
);
const createdId = created.body?.data?.id;

const publicAfterCreate = await get("/api/now");
record(
  "admin now: a public entry appears on the public API",
  publicAfterCreate.status === 200 &&
    publicAfterCreate.body?.data?.some(
      (entry) => entry.title === "API teaser (E2E)",
    ),
  `total=${publicAfterCreate.body?.meta?.total}`,
);

/* Teaser image upload + optimization */
async function upload(path, { token, form }) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: form,
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  return { status: response.status, body: json };
}

const pixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

const badMime = new FormData();
badMime.append("file", new Blob([Buffer.from("notes")], { type: "text/plain" }), "notes.txt");
const badMimeUpload = await upload(`/api/admin/now/${createdId}/image`, {
  token: ADMIN_TOKEN,
  form: badMime,
});
record(
  "admin image: non-image uploads are rejected with a specific 400",
  badMimeUpload.status === 400 &&
    String(badMimeUpload.body?.error).includes("image/jpeg"),
  `status=${badMimeUpload.status}`,
);

const missingEntryForm = new FormData();
missingEntryForm.append(
  "file",
  new Blob([pixelPng], { type: "image/png" }),
  "teaser.png",
);
const missingEntryUpload = await upload("/api/admin/now/999999/image", {
  token: ADMIN_TOKEN,
  form: missingEntryForm,
});
record(
  "admin image: uploading to a missing entry is a 404",
  missingEntryUpload.status === 404,
  `status=${missingEntryUpload.status}`,
);

const uploadForm = new FormData();
uploadForm.append(
  "file",
  new Blob([pixelPng], { type: "image/png" }),
  "teaser.png",
);
uploadForm.append("alt", "Teaser alt text");
const uploaded = await upload(`/api/admin/now/${createdId}/image`, {
  token: ADMIN_TOKEN,
  form: uploadForm,
});
record(
  "admin image: upload returns asset, variants and the linked entry",
  uploaded.status === 201 &&
    uploaded.body?.data?.asset?.id > 0 &&
    uploaded.body?.data?.entry?.mediaId === uploaded.body?.data?.asset?.id &&
    Array.isArray(uploaded.body?.data?.variants) &&
    uploaded.body.data.variants.length >= 1,
  `status=${uploaded.status}`,
);
record(
  "admin image: original storage path never leaves the API",
  uploaded.body?.data?.asset?.storageKey === undefined &&
    uploaded.body?.data?.asset?.altText === "Teaser alt text",
);
const variantUrl = uploaded.body?.data?.variants?.[0]?.url;
record(
  "admin image: variants are served from the public media folder",
  typeof variantUrl === "string" && variantUrl.startsWith("/media/uploads/"),
  String(variantUrl),
);
const variantResponse = await fetch(`${BASE}${variantUrl}`);
record(
  "admin image: the optimized variant is a real JPEG",
  variantResponse.status === 200 &&
    variantResponse.headers.get("content-type") === "image/jpeg",
  `status=${variantResponse.status} type=${variantResponse.headers.get("content-type")}`,
);

const publicWithImage = await get("/api/now");
const entryWithImage = publicWithImage.body?.data?.find(
  (entry) => entry.title === "API teaser (E2E)",
);
record(
  "admin image: the public Now API exposes the teaser image",
  entryWithImage?.image?.alt === "Teaser alt text" &&
    entryWithImage.image.variants.some(
      (variant) => variant.url === variantUrl,
    ),
  JSON.stringify(entryWithImage?.image?.variants),
);

const removedImage = await call(`/api/admin/now/${createdId}/image`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin image: delete unlinks and removes the files",
  removedImage.status === 200 && removedImage.body?.data?.deleted === true,
  `status=${removedImage.status}`,
);
const variantAfterDelete = await fetch(`${BASE}${variantUrl}`);
record(
  "admin image: the variant URL stops serving content after delete",
  variantAfterDelete.status >= 400,
  `status=${variantAfterDelete.status}`,
);
const publicWithoutImage = await get("/api/now");
const entryWithoutImage = publicWithoutImage.body?.data?.find(
  (entry) => entry.title === "API teaser (E2E)",
);
record(
  "admin image: the public entry reports no image after delete",
  entryWithoutImage !== undefined && entryWithoutImage.image === null,
);
const removeAgain = await call(`/api/admin/now/${createdId}/image`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin image: deleting twice is a specific 400",
  removeAgain.status === 400 &&
    String(removeAgain.body?.error).includes("no teaser image"),
  `status=${removeAgain.status}`,
);

const privatized = await call(`/api/admin/now/${createdId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { visibility: "private" },
});
record(
  "admin now: patching visibility works",
  privatized.status === 200 &&
    privatized.body?.data?.visibility === "private",
  `status=${privatized.status}`,
);
const publicAfterPrivatize = await get("/api/now");
record(
  "admin now: a private entry disappears from the public API",
  publicAfterPrivatize.status === 200 &&
    !publicAfterPrivatize.body?.data?.some(
      (entry) => entry.title === "API teaser (E2E)",
    ),
  `total=${publicAfterPrivatize.body?.meta?.total}`,
);

const invalidPatch = await call(`/api/admin/now/${createdId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "not-a-status" },
});
record(
  "admin now: invalid status is a specific 400",
  invalidPatch.status === 400 &&
    JSON.stringify(invalidPatch.body?.issues ?? "").includes("not-a-status") ===
      false &&
    JSON.stringify(invalidPatch.body?.issues ?? "").includes("status"),
  JSON.stringify(invalidPatch.body?.issues),
);
const missingPatch = await call("/api/admin/now/999999", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { title: "Ghost" },
});
record(
  "admin now: patching a missing entry is a 404",
  missingPatch.status === 404,
  `status=${missingPatch.status}`,
);

const deleted = await call(`/api/admin/now/${createdId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin now: delete removes the entry",
  deleted.status === 200 && deleted.body?.data?.deleted === true,
  `status=${deleted.status}`,
);
const deleteAgain = await call(`/api/admin/now/${createdId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin now: deleting twice is a 404",
  deleteAgain.status === 404,
  `status=${deleteAgain.status}`,
);
const nowAfterCleanup = await get("/api/now");
record(
  "admin now: dev database returns to the honest empty state",
  nowAfterCleanup.status === 200 &&
    nowAfterCleanup.body?.data?.length === 0,
  `total=${nowAfterCleanup.body?.meta?.total}`,
);

/* Studio content endpoints (§6.8, §18) */
const studioPreClean = new Database("data/ocassio.db");
studioPreClean
  .query("DELETE FROM team_members WHERE name LIKE 'Verify %'")
  .run();
studioPreClean.query("DELETE FROM clients WHERE name LIKE 'Verify %'").run();
studioPreClean
  .query("DELETE FROM recognition WHERE title LIKE 'Verify %'")
  .run();
const originalAbout = studioPreClean
  .query(
    "SELECT id, heading, body, supporting_media_id FROM studio_about ORDER BY id LIMIT 1",
  )
  .get();
const originalAboutMaxVersion = originalAbout
  ? studioPreClean
      .query(
        "SELECT COALESCE(MAX(version_no), 0) AS max FROM version_history WHERE entity_type = 'studio_about' AND entity_id = ?",
      )
      .get(originalAbout.id).max
  : 0;
studioPreClean.close();

const aboutBaseline = await get("/api/studio/about");
record(
  "api studio: about responds 200 with content or null",
  aboutBaseline.status === 200 &&
    (aboutBaseline.body?.data === null ||
      typeof aboutBaseline.body?.data?.heading === "string"),
  `status=${aboutBaseline.status}`,
);
const teamBaseline = await get("/api/studio/team");
const clientsBaseline = await get("/api/studio/clients");
const recognitionBaseline = await get("/api/studio/recognition");
record(
  "api studio: the lists respond with data and totals",
  teamBaseline.status === 200 &&
    Array.isArray(teamBaseline.body?.data) &&
    teamBaseline.body?.meta?.total === teamBaseline.body?.data?.length &&
    Array.isArray(clientsBaseline.body?.data) &&
    Array.isArray(recognitionBaseline.body?.data),
  `team=${teamBaseline.body?.meta?.total}`,
);

const studioNoAuth = await call("/api/admin/studio/team");
record(
  "admin studio: requests without a token are rejected",
  studioNoAuth.status === 401,
  `status=${studioNoAuth.status}`,
);

const invalidMember = await call("/api/admin/studio/team", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {},
});
record(
  "admin studio: invalid team payloads explain every missing field",
  invalidMember.status === 400 &&
    Array.isArray(invalidMember.body?.issues) &&
    invalidMember.body.issues.some((issue) => issue.startsWith("name")) &&
    invalidMember.body.issues.some((issue) =>
      issue.startsWith("roleTitle"),
    ),
  JSON.stringify(invalidMember.body?.issues),
);

const createdMember = await call("/api/admin/studio/team", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Photographer",
    roleTitle: "Photographer",
    bio: "Created by the verification suite.",
    status: "published",
    visibility: "public",
    sortOrder: 90,
  },
});
record(
  "admin studio: creating a public team member works",
  createdMember.status === 201 &&
    createdMember.body?.data?.status === "published",
  `status=${createdMember.status}`,
);
const memberId = createdMember.body?.data?.id;

const teamAfterCreate = await get("/api/studio/team");
record(
  "api studio: the new member appears publicly",
  teamAfterCreate.status === 200 &&
    teamAfterCreate.body?.data?.some(
      (member) => member.name === "Verify Photographer",
    ),
  `total=${teamAfterCreate.body?.meta?.total}`,
);

const secondMember = await call("/api/admin/studio/team", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Photographer Two",
    roleTitle: "Photographer",
    status: "published",
    visibility: "public",
    sortOrder: 90,
  },
});
const secondMemberId = secondMember.body?.data?.id;
const teamOrdered = await get("/api/studio/team");
const teamNames = (teamOrdered.body?.data ?? []).map((member) => member.name);
record(
  "api studio: equal sort orders fall back to id order",
  teamNames.indexOf("Verify Photographer") !== -1 &&
    teamNames.indexOf("Verify Photographer") <
      teamNames.indexOf("Verify Photographer Two"),
  teamNames.join(","),
);

const hiddenMember = await call(`/api/admin/studio/team/${memberId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { visibility: "private" },
});
record(
  "admin studio: patching visibility works",
  hiddenMember.status === 200 &&
    hiddenMember.body?.data?.visibility === "private",
  `status=${hiddenMember.status}`,
);
const teamAfterHide = await get("/api/studio/team");
record(
  "api studio: a private member disappears from the public API",
  !teamAfterHide.body?.data?.some(
    (member) => member.name === "Verify Photographer",
  ),
);

const badStatusPatch = await call(`/api/admin/studio/team/${memberId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "sleeping" },
});
record(
  "admin studio: invalid status is a specific 400",
  badStatusPatch.status === 400 &&
    JSON.stringify(badStatusPatch.body?.issues ?? "").includes("draft"),
  JSON.stringify(badStatusPatch.body?.issues),
);

const missingMemberPatch = await call("/api/admin/studio/team/999999", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { name: "Nobody" },
});
record(
  "admin studio: patching a missing member is a 404",
  missingMemberPatch.status === 404,
  `status=${missingMemberPatch.status}`,
);

const invalidClient = await call("/api/admin/studio/clients", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { name: "Verify Client", website: "example.com" },
});
record(
  "admin studio: client websites must be full URLs",
  invalidClient.status === 400 &&
    JSON.stringify(invalidClient.body?.issues ?? "").includes("https://"),
  JSON.stringify(invalidClient.body?.issues),
);

const createdClient = await call("/api/admin/studio/clients", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Client",
    website: "https://example.com",
    featured: true,
    status: "published",
    sortOrder: 90,
  },
});
const clientId = createdClient.body?.data?.id;
record(
  "admin studio: creating a featured client works",
  createdClient.status === 201 && createdClient.body?.data?.featured === true,
  `status=${createdClient.status}`,
);
const featuredApi = await get("/api/studio/clients?featured=true");
const allClientsApi = await get("/api/studio/clients");
record(
  "api studio: the featured filter narrows the client list",
  featuredApi.status === 200 &&
    featuredApi.body?.data?.every((client) => client.featured === true) &&
    featuredApi.body?.data?.some((client) => client.name === "Verify Client") &&
    allClientsApi.body?.data?.some((client) => client.name === "Verify Client"),
  `featured=${featuredApi.body?.meta?.total}`,
);
const badFeatured = await get("/api/studio/clients?featured=maybe");
record(
  "api studio: an invalid featured filter is a 400",
  badFeatured.status === 400,
  `status=${badFeatured.status}`,
);

const invalidRecognition = await call("/api/admin/studio/recognition", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { title: "Verify Award", year: 2024, recognitionType: "trophy" },
});
record(
  "admin studio: recognition types stay within the documented set",
  invalidRecognition.status === 400 &&
    JSON.stringify(invalidRecognition.body?.issues ?? "").includes(
      "publication",
    ),
  JSON.stringify(invalidRecognition.body?.issues),
);

const createdRecognition = await call("/api/admin/studio/recognition", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Verify Award",
    organization: "Verify Press",
    year: 2024,
    recognitionType: "award",
    status: "published",
    sortOrder: 90,
  },
});
const recognitionId = createdRecognition.body?.data?.id;
record(
  "admin studio: creating a published recognition entry works",
  createdRecognition.status === 201 &&
    createdRecognition.body?.data?.recognitionType === "award",
  `status=${createdRecognition.status}`,
);
const recognitionApi = await get("/api/studio/recognition");
record(
  "api studio: the new recognition entry appears publicly",
  recognitionApi.status === 200 &&
    recognitionApi.body?.data?.some((entry) => entry.title === "Verify Award"),
  `total=${recognitionApi.body?.meta?.total}`,
);

const invalidAbout = await call("/api/admin/studio/about", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { heading: "" },
});
record(
  "admin studio: the About singleton validates its required fields",
  invalidAbout.status === 400 &&
    JSON.stringify(invalidAbout.body?.issues ?? "").includes("heading"),
  JSON.stringify(invalidAbout.body?.issues),
);

const patchedAbout = await call("/api/admin/studio/about", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    heading: "Verified studio heading",
    body: {
      paragraphs: ["Verification paragraph."],
      philosophy: ["Verification line."],
    },
  },
});
record(
  "admin studio: the About singleton upserts on write",
  patchedAbout.status === 200 &&
    patchedAbout.body?.data?.heading === "Verified studio heading",
  `status=${patchedAbout.status}`,
);
const aboutApi = await get("/api/studio/about");
record(
  "api studio: about exposes the structured body",
  aboutApi.status === 200 &&
    aboutApi.body?.data?.heading === "Verified studio heading" &&
    aboutApi.body?.data?.body?.philosophy?.[0] === "Verification line.",
);

/* Cleanup: delete the test rows and restore the About baseline. */
const studioCleanup = new Database("data/ocassio.db");
if (originalAbout) {
  studioCleanup
    .query(
      "UPDATE studio_about SET heading = ?, body = ?, supporting_media_id = ? WHERE id = ?",
    )
    .run(
      originalAbout.heading,
      originalAbout.body,
      originalAbout.supporting_media_id,
      originalAbout.id,
    );
  studioCleanup
    .query(
      "DELETE FROM version_history WHERE entity_type = 'studio_about' AND entity_id = ? AND version_no > ?",
    )
    .run(originalAbout.id, originalAboutMaxVersion);
} else {
  studioCleanup.query("DELETE FROM studio_about").run();
  studioCleanup
    .query("DELETE FROM version_history WHERE entity_type = 'studio_about'")
    .run();
}
studioCleanup.close();

const deletedMember = await archiveThenDelete(
  `/api/admin/studio/team/${memberId}`,
);
const deletedSecondMember = await archiveThenDelete(
  `/api/admin/studio/team/${secondMemberId}`,
);
const deletedClient = await archiveThenDelete(
  `/api/admin/studio/clients/${clientId}`,
);
const deletedRecognition = await archiveThenDelete(
  `/api/admin/studio/recognition/${recognitionId}`,
);
record(
  "admin studio: test rows delete cleanly",
  deletedMember.status === 200 &&
    deletedSecondMember.status === 200 &&
    deletedClient.status === 200 &&
    deletedRecognition.status === 200,
  `member=${deletedMember.status} second=${deletedSecondMember.status} client=${deletedClient.status} recognition=${deletedRecognition.status}`,
);
const studioDeleteAgain = await call(`/api/admin/studio/team/${memberId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin studio: deleting twice is a 404",
  studioDeleteAgain.status === 404,
  `status=${studioDeleteAgain.status}`,
);

const teamAfterCleanup = await get("/api/studio/team");
const clientsAfterCleanup = await get("/api/studio/clients");
const recognitionAfterCleanup = await get("/api/studio/recognition");
const aboutAfterCleanup = await get("/api/studio/about");
record(
  "admin studio: test rows disappear from the public API",
  !teamAfterCleanup.body?.data?.some(
    (member) => member.name === "Verify Photographer",
  ) &&
    !teamAfterCleanup.body?.data?.some(
      (member) => member.name === "Verify Photographer Two",
    ) &&
    !clientsAfterCleanup.body?.data?.some(
      (client) => client.name === "Verify Client",
    ) &&
    !recognitionAfterCleanup.body?.data?.some(
      (entry) => entry.title === "Verify Award",
    ),
);
const aboutRestored = originalAbout
  ? aboutAfterCleanup.body?.data?.heading === originalAbout.heading
  : aboutAfterCleanup.body?.data === null;
record(
  "admin studio: the About singleton returns to its baseline",
  aboutRestored,
  `heading=${aboutAfterCleanup.body?.data?.heading ?? "null"}`,
);

/* Services + pricing endpoints (§6.4-§6.6) */
const servicesPreClean = new Database("data/ocassio.db");
servicesPreClean.query("DELETE FROM services WHERE slug LIKE 'verify-%'").run();
servicesPreClean.close();

const servicesBaseline = await get("/api/services");
const pricingBaseline = await get("/api/pricing");
record(
  "api services: the list responds with data and totals",
  servicesBaseline.status === 200 &&
    Array.isArray(servicesBaseline.body?.data) &&
    servicesBaseline.body?.meta?.total === servicesBaseline.body?.data?.length &&
    pricingBaseline.status === 200 &&
    Array.isArray(pricingBaseline.body?.data),
  `services=${servicesBaseline.body?.meta?.total}`,
);
const missingService = await get("/api/services/does-not-exist");
record(
  "api services: an unknown slug is a 404",
  missingService.status === 404,
  `status=${missingService.status}`,
);

const servicesNoAuth = await call("/api/admin/services");
record(
  "admin services: requests without a token are rejected",
  servicesNoAuth.status === 401,
  `status=${servicesNoAuth.status}`,
);

const invalidService = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {},
});
record(
  "admin services: invalid payloads explain every missing field",
  invalidService.status === 400 &&
    ["name", "slug", "serviceType", "shortDescription"].every((field) =>
      (invalidService.body?.issues ?? []).some((issue) =>
        issue.startsWith(field),
      ),
    ),
  JSON.stringify(invalidService.body?.issues),
);

const badServiceType = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Service",
    slug: "verify-service",
    serviceType: "Skydiving",
    shortDescription: "Not a documented type.",
  },
});
record(
  "admin services: service types stay within the documented set",
  badServiceType.status === 400 &&
    JSON.stringify(badServiceType.body?.issues ?? "").includes("Photography"),
  JSON.stringify(badServiceType.body?.issues),
);

const createdService = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Service",
    slug: "verify-service",
    serviceType: "Photography",
    shortDescription: "Created by the verification suite.",
    sortOrder: 95,
    status: "published",
    details: {
      bodyBlocks: {
        paragraphs: ["Verification paragraph."],
        whoItIsFor: ["Verifiers"],
      },
      deliverables: ["Verification coverage"],
    },
  },
});
record(
  "admin services: creating a published service with details works",
  createdService.status === 201 &&
    createdService.body?.data?.status === "published",
  `status=${createdService.status}`,
);
const serviceId = createdService.body?.data?.id;

const duplicateSlug = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Service Copy",
    slug: "verify-service",
    serviceType: "Photography",
    shortDescription: "Duplicate slug.",
  },
});
record(
  "admin services: duplicate slugs are a specific 400",
  duplicateSlug.status === 400 &&
    JSON.stringify(duplicateSlug.body?.issues ?? "").includes("already in use"),
  JSON.stringify(duplicateSlug.body?.issues),
);

const publicDetail = await get("/api/services/verify-service");
record(
  "api services: the detail exposes details, deliverables and pricing",
  publicDetail.status === 200 &&
    publicDetail.body?.data?.details?.paragraphs?.[0] ===
      "Verification paragraph." &&
    publicDetail.body?.data?.deliverables?.[0] === "Verification coverage" &&
    Array.isArray(publicDetail.body?.data?.pricing),
  `status=${publicDetail.status}`,
);

const quoteWithAmount = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId,
    packageName: "Quoted",
    priceType: "custom_quote",
    amount: 1000,
    status: "published",
  },
});
record(
  "admin pricing: custom quotes must not carry an amount",
  quoteWithAmount.status === 400 &&
    JSON.stringify(quoteWithAmount.body?.issues ?? "").includes(
      "must not carry",
    ),
  JSON.stringify(quoteWithAmount.body?.issues),
);

const fixedWithoutAmount = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId,
    packageName: "Fixed",
    priceType: "fixed",
    status: "published",
  },
});
record(
  "admin pricing: fixed entries require an amount",
  fixedWithoutAmount.status === 400 &&
    JSON.stringify(fixedWithoutAmount.body?.issues ?? "").includes(
      "require an amount",
    ),
  JSON.stringify(fixedWithoutAmount.body?.issues),
);

const unknownService = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId: 999999,
    packageName: "Orphan",
    priceType: "custom_quote",
    status: "published",
  },
});
record(
  "admin pricing: serviceId must reference an existing service",
  unknownService.status === 400 &&
    JSON.stringify(unknownService.body?.issues ?? "").includes(
      "existing service",
    ),
  JSON.stringify(unknownService.body?.issues),
);

const createdQuote = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId,
    packageName: "Verify Quote",
    priceType: "custom_quote",
    deliverables: ["Quoted per scope"],
    status: "published",
    sortOrder: 1,
  },
});
const quoteId = createdQuote.body?.data?.id;
const createdFixed = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId,
    packageName: "Verify Session",
    priceType: "fixed",
    amount: 750000,
    currency: "IDR",
    duration: "90 minutes",
    deliverables: ["Guided session"],
    status: "published",
    sortOrder: 2,
  },
});
const fixedId = createdFixed.body?.data?.id;
record(
  "admin pricing: valid entries store their amounts",
  createdQuote.status === 201 &&
    createdQuote.body?.data?.amount === null &&
    createdFixed.status === 201 &&
    createdFixed.body?.data?.amount === 750000,
  `quote=${createdQuote.status} fixed=${createdFixed.status}`,
);

const switchToFixed = await call(`/api/admin/pricing/${quoteId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { priceType: "fixed" },
});
record(
  "admin pricing: switching to fixed without an amount is rejected",
  switchToFixed.status === 400 &&
    JSON.stringify(switchToFixed.body?.issues ?? "").includes(
      "require an amount",
    ),
  JSON.stringify(switchToFixed.body?.issues),
);
const switchWithAmount = await call(`/api/admin/pricing/${quoteId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { priceType: "starting_from", amount: 500000 },
});
record(
  "admin pricing: switching type with an amount works",
  switchWithAmount.status === 200 &&
    switchWithAmount.body?.data?.amount === 500000,
  `status=${switchWithAmount.status}`,
);

const scopedPricing = await get("/api/pricing?service=verify-service");
record(
  "api pricing: the service filter returns the published entries",
  scopedPricing.status === 200 &&
    scopedPricing.body?.data?.length === 2 &&
    scopedPricing.body?.data?.every(
      (entry) => entry.serviceSlug === "verify-service",
    ),
  `total=${scopedPricing.body?.meta?.total}`,
);
const badPricingFilter = await get("/api/pricing?service=not-a-service");
record(
  "api pricing: an unknown service filter is a 400",
  badPricingFilter.status === 400,
  `status=${badPricingFilter.status}`,
);

const detailWithPricing = await get("/api/services/verify-service");
record(
  "api services: published pricing appears on the detail",
  detailWithPricing.body?.data?.pricing?.length === 2,
  `total=${detailWithPricing.body?.data?.pricing?.length}`,
);

const unpublished = await call(`/api/admin/services/${serviceId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "draft" },
});
record(
  "admin services: unpublishing works",
  unpublished.status === 200 && unpublished.body?.data?.status === "draft",
  `status=${unpublished.status}`,
);
const hiddenDetail = await get("/api/services/verify-service");
const hiddenPricing = await get("/api/pricing?service=verify-service");
record(
  "api services: a draft service and its pricing disappear publicly",
  hiddenDetail.status === 404 && hiddenPricing.body?.data?.length === 0,
  `detail=${hiddenDetail.status} pricing=${hiddenPricing.body?.data?.length}`,
);

const patchedDetails = await call(`/api/admin/services/${serviceId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    details: {
      bodyBlocks: { paragraphs: ["Updated paragraph."], whoItIsFor: [] },
      deliverables: [],
    },
  },
});
const adminService = await call(`/api/admin/services/${serviceId}`, {
  token: ADMIN_TOKEN,
});
record(
  "admin services: nested details upsert on patch",
  patchedDetails.status === 200 &&
    adminService.status === 200 &&
    adminService.body?.data?.details?.paragraphs?.[0] === "Updated paragraph.",
  `status=${patchedDetails.status}`,
);

const deletedService = await archiveThenDelete(
  `/api/admin/services/${serviceId}`,
);
record(
  "admin services: deleting a service works",
  deletedService.status === 200,
  `status=${deletedService.status}`,
);
const pricingAfterCascade = await call(`/api/admin/pricing/${fixedId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin services: the delete cascades to details and pricing",
  pricingAfterCascade.status === 404,
  `status=${pricingAfterCascade.status}`,
);
const servicesAfterCleanup = await get("/api/services");
record(
  "admin services: test rows disappear from the public API",
  !servicesAfterCleanup.body?.data?.some(
    (service) => service.slug === "verify-service",
  ),
);

/* Process + FAQ endpoints (§6.7, §12.4) */
const processPreClean = new Database("data/ocassio.db");
processPreClean
  .query("DELETE FROM process_steps WHERE title LIKE 'Verify %'")
  .run();
processPreClean
  .query("DELETE FROM faq WHERE question LIKE 'Verify %'")
  .run();
processPreClean.close();

const processBaseline = await get("/api/process");
const faqBaseline = await get("/api/faq");
record(
  "api process: the list responds with data and totals",
  processBaseline.status === 200 &&
    Array.isArray(processBaseline.body?.data) &&
    processBaseline.body?.meta?.total === processBaseline.body?.data?.length &&
    faqBaseline.status === 200 &&
    Array.isArray(faqBaseline.body?.data) &&
    faqBaseline.body?.meta?.total === faqBaseline.body?.data?.length,
  `steps=${processBaseline.body?.meta?.total} faq=${faqBaseline.body?.meta?.total}`,
);

const processNoAuth = await call("/api/admin/process");
record(
  "admin process: requests without a token are rejected",
  processNoAuth.status === 401,
  `status=${processNoAuth.status}`,
);

const invalidStep = await call("/api/admin/process", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {},
});
record(
  "admin process: invalid payloads explain every missing field",
  invalidStep.status === 400 &&
    ["stepNumber", "title", "explanation"].every((field) =>
      (invalidStep.body?.issues ?? []).some((issue) => issue.startsWith(field)),
    ),
  JSON.stringify(invalidStep.body?.issues),
);

const badStepNumber = await call("/api/admin/process", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { stepNumber: 0, title: "Verify Step", explanation: "Zero." },
});
record(
  "admin process: step numbers stay within range",
  badStepNumber.status === 400 &&
    JSON.stringify(badStepNumber.body?.issues ?? "").includes("between 1 and 99"),
  JSON.stringify(badStepNumber.body?.issues),
);

const createdStep = await call("/api/admin/process", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    stepNumber: 10,
    title: "Verify Step",
    explanation: "Created by the verification suite.",
    sortOrder: 90,
  },
});
const stepId = createdStep.body?.data?.id;
record(
  "admin process: creating a step defaults to visible",
  createdStep.status === 201 && createdStep.body?.data?.status === "visible",
  `status=${createdStep.status}`,
);
const createdHidden = await call("/api/admin/process", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    stepNumber: 11,
    title: "Verify Hidden Step",
    explanation: "Hidden by the verification suite.",
    sortOrder: 91,
    status: "hidden",
  },
});
const hiddenStepId = createdHidden.body?.data?.id;
record(
  "admin process: steps can be created hidden",
  createdHidden.status === 201 &&
    createdHidden.body?.data?.status === "hidden",
  `status=${createdHidden.status}`,
);

const processPublic = await get("/api/process");
record(
  "api process: only visible steps surface publicly",
  processPublic.body?.data?.some((step) => step.title === "Verify Step") &&
    !processPublic.body?.data?.some(
      (step) => step.title === "Verify Hidden Step",
    ),
  `total=${processPublic.body?.meta?.total}`,
);

const hideStep = await call(`/api/admin/process/${stepId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "hidden" },
});
record(
  "admin process: the Hide action works",
  hideStep.status === 200 && hideStep.body?.data?.status === "hidden",
  `status=${hideStep.status}`,
);
const processAfterHide = await get("/api/process");
record(
  "api process: a hidden step disappears from the public API",
  !processAfterHide.body?.data?.some((step) => step.title === "Verify Step"),
);

const deletedStep = await call(`/api/admin/process/${stepId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
const deletedHiddenStep = await call(`/api/admin/process/${hiddenStepId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin process: test steps delete cleanly",
  deletedStep.status === 200 && deletedHiddenStep.status === 200,
  `status=${deletedStep.status}`,
);
const stepDeleteAgain = await call(`/api/admin/process/${stepId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "admin process: deleting twice is a 404",
  stepDeleteAgain.status === 404,
  `status=${stepDeleteAgain.status}`,
);

const invalidFaq = await call("/api/admin/faq", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { question: "Verify question?" },
});
record(
  "admin faq: invalid payloads explain every missing field",
  invalidFaq.status === 400 &&
    (invalidFaq.body?.issues ?? []).some((issue) => issue.startsWith("answer")),
  JSON.stringify(invalidFaq.body?.issues),
);

const createdFaq = await call("/api/admin/faq", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    question: "Verify question?",
    answer: "Created by the verification suite.",
    sortOrder: 90,
    status: "published",
  },
});
const faqId = createdFaq.body?.data?.id;
record(
  "admin faq: creating a published entry works",
  createdFaq.status === 201 && createdFaq.body?.data?.status === "published",
  `status=${createdFaq.status}`,
);
const faqAfterCreate = await get("/api/faq");
record(
  "api faq: the new entry appears publicly",
  faqAfterCreate.body?.data?.some(
    (entry) => entry.question === "Verify question?",
  ),
  `total=${faqAfterCreate.body?.meta?.total}`,
);

const draftFaq = await call(`/api/admin/faq/${faqId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "draft" },
});
const faqAfterDraft = await get("/api/faq");
record(
  "api faq: a draft entry disappears from the public API",
  draftFaq.status === 200 &&
    !faqAfterDraft.body?.data?.some(
      (entry) => entry.question === "Verify question?",
    ),
  `status=${draftFaq.status}`,
);

const deletedFaq = await archiveThenDelete(`/api/admin/faq/${faqId}`);
record(
  "admin faq: test entries delete cleanly",
  deletedFaq.status === 200,
  `status=${deletedFaq.status}`,
);
const faqAfterCleanup = await get("/api/faq");
const processAfterCleanup = await get("/api/process");
record(
  "admin process: test rows disappear from the public API",
  !faqAfterCleanup.body?.data?.some(
    (entry) => entry.question === "Verify question?",
  ) &&
    !processAfterCleanup.body?.data?.some(
      (step) => step.title === "Verify Step",
    ),
);

/* Service detail relations (§6.5) */
const relationsPreClean = new Database("data/ocassio.db");
relationsPreClean
  .query("DELETE FROM services WHERE slug LIKE 'verify-%'")
  .run();
relationsPreClean.query("DELETE FROM faq WHERE question LIKE 'Verify %'").run();
relationsPreClean.close();

const relService = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "Verify Relations Service",
    slug: "verify-relations-service",
    serviceType: "Photography",
    shortDescription: "Relations roundtrip.",
    status: "published",
    sortOrder: 96,
  },
});
const relServiceId = relService.body?.data?.id;
const relFaqPublished = await call("/api/admin/faq", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    question: "Verify Relations FAQ published?",
    answer: "Yes.",
    status: "published",
    sortOrder: 91,
  },
});
const relFaqDraft = await call("/api/admin/faq", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    question: "Verify Relations FAQ draft?",
    answer: "Later.",
    status: "draft",
    sortOrder: 92,
  },
});
const relFaqPublishedId = relFaqPublished.body?.data?.id;
const relFaqDraftId = relFaqDraft.body?.data?.id;
record(
  "admin relations: fixtures created",
  relService.status === 201 &&
    relFaqPublished.status === 201 &&
    relFaqDraft.status === 201,
  `service=${relService.status}`,
);

const relationsBefore = await call(
  `/api/admin/services/${relServiceId}/relations`,
  { token: ADMIN_TOKEN },
);
record(
  "admin relations: a fresh service starts empty",
  relationsBefore.status === 200 &&
    relationsBefore.body?.data?.projects?.length === 0 &&
    relationsBefore.body?.data?.faqIds?.length === 0,
  JSON.stringify(relationsBefore.body?.data),
);

const badRelations = await call(
  `/api/admin/services/${relServiceId}/relations`,
  {
    method: "PUT",
    token: ADMIN_TOKEN,
    body: { projects: ["Not A Slug"] },
  },
);
record(
  "admin relations: slugs are validated",
  badRelations.status === 400 &&
    JSON.stringify(badRelations.body?.issues ?? "").includes("lowercase slug"),
  JSON.stringify(badRelations.body?.issues),
);
const emptyRelations = await call(
  `/api/admin/services/${relServiceId}/relations`,
  { method: "PUT", token: ADMIN_TOKEN, body: {} },
);
record(
  "admin relations: empty payloads are rejected",
  emptyRelations.status === 400 &&
    JSON.stringify(emptyRelations.body?.issues ?? "").includes("projects"),
  JSON.stringify(emptyRelations.body?.issues),
);
const unknownFaqRelations = await call(
  `/api/admin/services/${relServiceId}/relations`,
  {
    method: "PUT",
    token: ADMIN_TOKEN,
    body: { faqIds: [999999] },
  },
);
record(
  "admin relations: faqIds must reference existing entries",
  unknownFaqRelations.status === 400 &&
    JSON.stringify(unknownFaqRelations.body?.issues ?? "").includes(
      "existing FAQ",
    ),
  JSON.stringify(unknownFaqRelations.body?.issues),
);

const savedRelations = await call(
  `/api/admin/services/${relServiceId}/relations`,
  {
    method: "PUT",
    token: ADMIN_TOKEN,
    body: {
      projects: ["dean-and-deb", "sunday-school"],
      faqIds: [relFaqPublishedId, relFaqDraftId],
    },
  },
);
record(
  "admin relations: replacing both sets works",
  savedRelations.status === 200 &&
    savedRelations.body?.data?.projects?.length === 2 &&
    savedRelations.body?.data?.faqIds?.length === 2,
  JSON.stringify(savedRelations.body?.data),
);

const publicRelated = await get(
  "/api/services/verify-relations-service/related",
);
record(
  "api relations: the public endpoint exposes projects and published FAQ",
  publicRelated.status === 200 &&
    publicRelated.body?.data?.projects?.[0] === "dean-and-deb" &&
    publicRelated.body?.data?.faq?.length === 1 &&
    publicRelated.body?.data?.faq?.[0]?.id === relFaqPublishedId,
  JSON.stringify(publicRelated.body?.data?.faq?.map((entry) => entry.id)),
);
const publicDetailRelations = await get(
  "/api/services/verify-relations-service",
);
record(
  "api services: the detail carries the same relations",
  publicDetailRelations.body?.data?.relatedProjects?.length === 2 &&
    publicDetailRelations.body?.data?.faq?.length === 1,
);
const missingRelated = await get("/api/services/does-not-exist/related");
record(
  "api relations: an unknown slug is a 404",
  missingRelated.status === 404,
  `status=${missingRelated.status}`,
);

const clearedProjects = await call(
  `/api/admin/services/${relServiceId}/relations`,
  { method: "PUT", token: ADMIN_TOKEN, body: { projects: [] } },
);
record(
  "admin relations: partial replaces keep the other set",
  clearedProjects.status === 200 &&
    clearedProjects.body?.data?.projects?.length === 0 &&
    clearedProjects.body?.data?.faqIds?.length === 2,
  JSON.stringify(clearedProjects.body?.data),
);

const relDeletedService = await archiveThenDelete(
  `/api/admin/services/${relServiceId}`,
);
const relDeletedFaq = await archiveThenDelete(
  `/api/admin/faq/${relFaqPublishedId}`,
);
const relDeletedDraftFaq = await archiveThenDelete(
  `/api/admin/faq/${relFaqDraftId}`,
);
record(
  "admin relations: fixtures clean up",
  relDeletedService.status === 200 &&
    relDeletedFaq.status === 200 &&
    relDeletedDraftFaq.status === 200,
  `service=${relDeletedService.status}`,
);
const relatedAfterCleanup = await get(
  "/api/services/verify-relations-service/related",
);
record(
  "admin relations: the service and its relations are gone",
  relatedAfterCleanup.status === 404,
  `status=${relatedAfterCleanup.status}`,
);

/* Global Settings contact fields (§10.3) */
const settingsPreClean = new Database("data/ocassio.db");
const originalSettings = settingsPreClean
  .query(
    "SELECT id, contact_email, contact_phone, address, social_links, global_meta FROM site_settings ORDER BY id LIMIT 1",
  )
  .get();
settingsPreClean.close();

const settingsBaseline = await get("/api/settings");
record(
  "api settings: settings respond 200 with content or null",
  settingsBaseline.status === 200 &&
    (settingsBaseline.body?.data === null ||
      Array.isArray(settingsBaseline.body?.data?.socialLinks)),
  `status=${settingsBaseline.status}`,
);

const settingsNoAuth = await call("/api/admin/settings");
record(
  "admin settings: requests without a token are rejected",
  settingsNoAuth.status === 401,
  `status=${settingsNoAuth.status}`,
);

const emptySettingsPatch = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {},
});
record(
  "admin settings: empty patches are rejected",
  emptySettingsPatch.status === 400 &&
    JSON.stringify(emptySettingsPatch.body?.issues ?? "").includes(
      "at least one",
    ),
  JSON.stringify(emptySettingsPatch.body?.issues),
);

const badSettingsPatch = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { contactEmail: "nope" },
});
record(
  "admin settings: email addresses are validated",
  badSettingsPatch.status === 400 &&
    JSON.stringify(badSettingsPatch.body?.issues ?? "").includes("valid email"),
  JSON.stringify(badSettingsPatch.body?.issues),
);

const patchedSettings = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    contactEmail: "verify-studio@example.com",
    contactPhone: "+62 812 0000",
    address: "Jakarta, Indonesia",
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/ocassio" },
    ],
  },
});
record(
  "admin settings: contact fields save",
  patchedSettings.status === 200 &&
    patchedSettings.body?.data?.contactEmail === "verify-studio@example.com" &&
    patchedSettings.body?.data?.socialLinks?.length === 1,
  `status=${patchedSettings.status}`,
);

const publicSettings = await get("/api/settings");
record(
  "api settings: the saved contact fields are public",
  publicSettings.body?.data?.contactEmail === "verify-studio@example.com" &&
    publicSettings.body?.data?.socialLinks?.[0]?.platform === "instagram",
);

const partialSettings = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { address: "Bandung, Indonesia" },
});
record(
  "admin settings: partial patches keep the other fields",
  partialSettings.status === 200 &&
    partialSettings.body?.data?.address === "Bandung, Indonesia" &&
    partialSettings.body?.data?.contactEmail === "verify-studio@example.com",
);

const badCtaSettings = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { globalMeta: { defaultCta: { label: "Go", href: "not-a-link" } } },
});
record(
  "admin settings: CTA destinations are validated",
  badCtaSettings.status === 400 &&
    JSON.stringify(badCtaSettings.body?.issues ?? "").includes(
      "defaultCta.href",
    ),
  JSON.stringify(badCtaSettings.body?.issues),
);

const metaSettings = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    globalMeta: {
      studioName: "Verify Studio",
      tagline: "A verification tagline.",
      copyright: "Verify Studio",
      defaultCta: { label: "Start a Project", href: "/start-project" },
      seo: {
        title: "Verify Studio · Proof",
        description: "Verified description.",
      },
    },
  },
});
record(
  "admin settings: identity fields save alongside contact fields",
  metaSettings.status === 200 &&
    metaSettings.body?.data?.globalMeta?.tagline === "A verification tagline." &&
    metaSettings.body?.data?.globalMeta?.defaultCta?.href === "/start-project" &&
    metaSettings.body?.data?.globalMeta?.seo?.description ===
      "Verified description." &&
    metaSettings.body?.data?.contactEmail === "verify-studio@example.com",
  JSON.stringify(metaSettings.body?.data?.globalMeta ?? null).slice(0, 120),
);

const metaPublicSettings = await get("/api/settings");
record(
  "api settings: identity fields are public",
  metaPublicSettings.body?.data?.globalMeta?.studioName === "Verify Studio",
);

const mergedSettings = await call("/api/admin/settings", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { globalMeta: { tagline: "Kept fields merge." } },
});
record(
  "admin settings: meta patches merge field by field",
  mergedSettings.status === 200 &&
    mergedSettings.body?.data?.globalMeta?.tagline === "Kept fields merge." &&
    mergedSettings.body?.data?.globalMeta?.copyright === "Verify Studio",
  JSON.stringify(mergedSettings.body?.data?.globalMeta ?? null).slice(0, 120),
);

/* Cleanup: restore the settings baseline. */
const settingsCleanup = new Database("data/ocassio.db");
if (originalSettings) {
  settingsCleanup
    .query(
      "UPDATE site_settings SET contact_email = ?, contact_phone = ?, address = ?, social_links = ?, global_meta = ? WHERE id = ?",
    )
    .run(
      originalSettings.contact_email,
      originalSettings.contact_phone,
      originalSettings.address,
      originalSettings.social_links,
      originalSettings.global_meta,
      originalSettings.id,
    );
} else {
  settingsCleanup.query("DELETE FROM site_settings").run();
}
settingsCleanup.close();

const settingsRestored = await get("/api/settings");
const settingsBaselineHeld = originalSettings
  ? settingsRestored.body?.data?.contactEmail === originalSettings.contact_email
  : settingsRestored.body?.data === null;
record(
  "admin settings: the settings singleton returns to its baseline",
  settingsBaselineHeld,
  `email=${settingsRestored.body?.data?.contactEmail ?? "null"}`,
);

/* Navigation admin (§10.2): CRUD, ordering, visibility */
const navigationPreClean = new Database("data/ocassio.db");
navigationPreClean.query("DELETE FROM navigation_items").run();
navigationPreClean.close();

const navigationNoAuth = await get("/api/admin/navigation");
record(
  "navigation admin: the list requires a token",
  navigationNoAuth.status === 401,
  `status=${navigationNoAuth.status}`,
);

const navCreated = [];
for (const [label, href] of [
  ["Work", "/work"],
  ["About", "/about"],
  ["Journal", "/journal"],
]) {
  navCreated.push(
    await call("/api/admin/navigation", {
      method: "POST",
      token: ADMIN_TOKEN,
      body: { label, href },
    }),
  );
}
record(
  "navigation admin: items are appended in order",
  navCreated.every((response) => response.status === 201) &&
    navCreated[0].body?.data?.sortOrder === 1 &&
    navCreated[2].body?.data?.sortOrder === 3,
  navCreated.map((response) => response.body?.data?.sortOrder).join(","),
);
const navIds = navCreated.map((response) => response.body?.data?.id);

const badNav = await call("/api/admin/navigation", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { label: "", href: "not-a-url" },
});
record(
  "navigation admin: labels and destinations are validated",
  badNav.status === 400 &&
    JSON.stringify(badNav.body?.issues ?? "").includes("href"),
  JSON.stringify(badNav.body?.issues),
);

const movedNav = await call(`/api/admin/navigation/${navIds[2]}/move`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { direction: "up" },
});
const navListAfterMove = await call("/api/admin/navigation", {
  token: ADMIN_TOKEN,
});
record(
  "navigation admin: move reorders the list",
  movedNav.status === 200 && navListAfterMove.body?.data?.[1]?.id === navIds[2],
  JSON.stringify(navListAfterMove.body?.data?.map((row) => row.label)),
);

const renamedNav = await call(`/api/admin/navigation/${navIds[0]}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { label: "Portfolio", visible: false },
});
const navListAfterPatch = await call("/api/admin/navigation", {
  token: ADMIN_TOKEN,
});
record(
  "navigation admin: items can be renamed and hidden",
  renamedNav.status === 200 &&
    renamedNav.body?.data?.label === "Portfolio" &&
    navListAfterPatch.body?.data?.find((row) => row.id === navIds[0])
      ?.visible === false,
);

const deletedNav = await call(`/api/admin/navigation/${navIds[1]}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
const navListAfterDelete = await call("/api/admin/navigation", {
  token: ADMIN_TOKEN,
});
record(
  "navigation admin: items delete cleanly",
  deletedNav.status === 200 && navListAfterDelete.body?.data?.length === 2,
  `rows=${navListAfterDelete.body?.data?.length}`,
);

const navigationCleanup = new Database("data/ocassio.db");
navigationCleanup.query("DELETE FROM navigation_items").run();
navigationCleanup.close();
record("navigation admin: fixtures clean up", true);

/* Media Library (§20): list, filters, metadata, usage guard, delete */
const mediaPreClean = new Database("data/ocassio.db");
mediaPreClean
  .query("DELETE FROM services WHERE slug = 'verify-media-service'")
  .run();
mediaPreClean
  .query("DELETE FROM media_assets WHERE filename LIKE 'verify-media-%'")
  .run();
mediaPreClean.close();

const mediaNoAuth = await get("/api/admin/media");
record(
  "media library: the list requires a token",
  mediaNoAuth.status === 401,
  `status=${mediaNoAuth.status}`,
);

const mediaFixtureDb = new Database("data/ocassio.db");
const mediaAssetRow = mediaFixtureDb
  .query(
    "INSERT INTO media_assets (filename, media_type, mime_type, width, height, file_size, storage_key, alt_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
  .get(
    "verify-media-hero.jpg",
    "image",
    "image/jpeg",
    1600,
    1200,
    250000,
    "verify/media-hero.jpg",
    null,
  );
mediaFixtureDb
  .query(
    "INSERT INTO media_variants (asset_id, format, url, width, height) VALUES (?, ?, ?, ?, ?)",
  )
  .run(mediaAssetRow.id, "mobile", "/media/uploads/verify/hero-960.jpg", 960, 720);
mediaFixtureDb
  .query(
    "INSERT INTO media_variants (asset_id, format, url, width, height) VALUES (?, ?, ?, ?, ?)",
  )
  .run(
    mediaAssetRow.id,
    "desktop",
    "/media/uploads/verify/hero-1920.jpg",
    1920,
    1440,
  );
const mediaVideoRow = mediaFixtureDb
  .query(
    "INSERT INTO media_assets (filename, media_type, mime_type, width, height, file_size, storage_key) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
  )
  .get(
    "verify-media-film.mp4",
    "video",
    "video/mp4",
    1920,
    1080,
    900000,
    "verify/media-film.mp4",
  );
mediaFixtureDb.close();

const mediaList = await call("/api/admin/media", { token: ADMIN_TOKEN });
const listedAsset = mediaList.body?.data?.find(
  (row) => row.id === mediaAssetRow.id,
);
record(
  "media library: assets list with preview and variant counts",
  mediaList.status === 200 &&
    listedAsset?.previewUrl === "/media/uploads/verify/hero-960.jpg" &&
    listedAsset?.variantCount === 2,
  `preview=${listedAsset?.previewUrl}`,
);

const videoList = await call("/api/admin/media?type=video", {
  token: ADMIN_TOKEN,
});
record(
  "media library: type filters narrow the list",
  videoList.status === 200 &&
    videoList.body?.data?.some((row) => row.id === mediaVideoRow.id) &&
    !videoList.body?.data?.some((row) => row.id === mediaAssetRow.id),
);

const searchList = await call("/api/admin/media?search=verify-media-film", {
  token: ADMIN_TOKEN,
});
record(
  "media library: search matches filenames",
  searchList.status === 200 &&
    searchList.body?.data?.length === 1 &&
    searchList.body.data[0].id === mediaVideoRow.id,
  `rows=${searchList.body?.data?.length}`,
);

const badMediaPatch = await call(`/api/admin/media/${mediaAssetRow.id}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { usageState: "archived" },
});
record(
  "media library: metadata validation rejects unknown states",
  badMediaPatch.status === 400,
  `status=${badMediaPatch.status}`,
);

const patchedMedia = await call(`/api/admin/media/${mediaAssetRow.id}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { altText: "Verified hero image", credit: "Ocassio.Project" },
});
record(
  "media library: metadata saves",
  patchedMedia.status === 200 &&
    patchedMedia.body?.data?.altText === "Verified hero image" &&
    patchedMedia.body?.data?.credit === "Ocassio.Project",
);

const mediaGuardDb = new Database("data/ocassio.db");
mediaGuardDb
  .query(
    "INSERT INTO services (name, slug, service_type, short_description, supporting_media_id, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
  )
  .run(
    "Verify Media Service",
    "verify-media-service",
    "Photography",
    "Usage guard fixture.",
    mediaAssetRow.id,
    98,
  );
mediaGuardDb.close();

const guardedMediaDelete = await call(`/api/admin/media/${mediaAssetRow.id}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "media library: deletion is blocked while referenced and explains where",
  guardedMediaDelete.status === 409 &&
    JSON.stringify(guardedMediaDelete.body?.issues ?? "").includes(
      "verify-media-service",
    ),
  JSON.stringify(guardedMediaDelete.body?.issues),
);

const usageDetail = await call(`/api/admin/media/${mediaAssetRow.id}`, {
  token: ADMIN_TOKEN,
});
record(
  "media library: the detail lists used-in labels",
  usageDetail.status === 200 &&
    Array.isArray(usageDetail.body?.data?.usage) &&
    usageDetail.body.data.usage.some((label) =>
      label.includes("verify-media-service"),
    ),
);

const mediaFreedDb = new Database("data/ocassio.db");
mediaFreedDb
  .query("DELETE FROM services WHERE slug = 'verify-media-service'")
  .run();
mediaFreedDb.close();

const freedMediaDelete = await call(`/api/admin/media/${mediaAssetRow.id}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
const deletedVideoAsset = await call(
  `/api/admin/media/${mediaVideoRow.id}`,
  { method: "DELETE", token: ADMIN_TOKEN },
);
record(
  "media library: unreferenced assets delete cleanly",
  freedMediaDelete.status === 200 && deletedVideoAsset.status === 200,
  `image=${freedMediaDelete.status} video=${deletedVideoAsset.status}`,
);

const mediaCleanupDb = new Database("data/ocassio.db");
mediaCleanupDb
  .query("DELETE FROM services WHERE slug = 'verify-media-service'")
  .run();
mediaCleanupDb
  .query("DELETE FROM media_assets WHERE filename LIKE 'verify-media-%'")
  .run();
mediaCleanupDb.close();
record("media library: fixtures clean up", true);

/* Homepage sections (§10.1): order, visibility, required guard */
const homepagePreClean = new Database("data/ocassio.db");
homepagePreClean.query("DELETE FROM homepage_sections").run();
homepagePreClean.close();

const homepageNoAuth = await get("/api/admin/homepage-sections");
record(
  "homepage sections: the config requires a token",
  homepageNoAuth.status === 401,
  `status=${homepageNoAuth.status}`,
);

const homepageDefaults = await call("/api/admin/homepage-sections", {
  token: ADMIN_TOKEN,
});
const defaultKeys = homepageDefaults.body?.data?.map((row) => row.key) ?? [];
record(
  "homepage sections: the documented registry arrives in default order",
  homepageDefaults.status === 200 &&
    defaultKeys.length === 11 &&
    defaultKeys[0] === "hero" &&
    defaultKeys[10] === "final_cta" &&
    homepageDefaults.body?.data?.[0]?.required === true,
  defaultKeys.join(","),
);

const homepageHide = await call("/api/admin/homepage-sections", {
  method: "PUT",
  token: ADMIN_TOKEN,
  body: {
    order: defaultKeys,
    sections: defaultKeys.map((key) => ({
      key,
      visible: key !== "journal",
    })),
  },
});
const homepageAfterHide = await call("/api/admin/homepage-sections", {
  token: ADMIN_TOKEN,
});
record(
  "homepage sections: hiding persists and the public list drops the section",
  homepageHide.status === 200 &&
    homepageAfterHide.body?.data?.find((row) => row.key === "journal")
      ?.visible === false,
);

const homepagePublicAfterHide = await get("/api/homepage-sections");
record(
  "homepage sections: only visible sections reach the public endpoint",
  homepagePublicAfterHide.status === 200 &&
    !homepagePublicAfterHide.body?.data?.some((row) => row.key === "journal"),
  JSON.stringify(homepagePublicAfterHide.body?.data?.map((row) => row.key)),
);

const homepageHideRequired = await call("/api/admin/homepage-sections", {
  method: "PUT",
  token: ADMIN_TOKEN,
  body: {
    order: defaultKeys,
    sections: defaultKeys.map((key) => ({
      key,
      visible: key !== "hero",
    })),
  },
});
record(
  "homepage sections: the hero cannot be hidden",
  homepageHideRequired.status === 400 &&
    JSON.stringify(homepageHideRequired.body?.issues ?? "").includes("required"),
  JSON.stringify(homepageHideRequired.body?.issues),
);

const reorderedKeys = ["hero", "showreel", ...defaultKeys.filter((key) => key !== "hero" && key !== "showreel")];
const homepageReorder = await call("/api/admin/homepage-sections", {
  method: "PUT",
  token: ADMIN_TOKEN,
  body: {
    order: reorderedKeys,
    sections: reorderedKeys.map((key) => ({ key, visible: true })),
  },
});
record(
  "homepage sections: the order persists",
  homepageReorder.status === 200 &&
    homepageReorder.body?.data?.[1]?.key === "showreel",
  JSON.stringify(homepageReorder.body?.data?.map((row) => row.key)?.slice(0, 4)),
);

const homepageCleanup = new Database("data/ocassio.db");
homepageCleanup.query("DELETE FROM homepage_sections").run();
homepageCleanup.close();
const homepageRestored = await call("/api/admin/homepage-sections", {
  token: ADMIN_TOKEN,
});
record(
  "homepage sections: fixtures clean up to the default registry",
  homepageRestored.body?.data?.[0]?.key === "hero" &&
    homepageRestored.body?.data?.length === 11,
);

/* Activity log (§9): admin changes are recorded */
const activityNoAuth = await get("/api/admin/activity");
record(
  "activity log: the feed requires a token",
  activityNoAuth.status === 401,
  `status=${activityNoAuth.status}`,
);

const activityList = await call("/api/admin/activity?limit=50", {
  token: ADMIN_TOKEN,
});
record(
  "activity log: changes from this run are recorded",
  activityList.status === 200 &&
    Array.isArray(activityList.body?.data) &&
    activityList.body.data.some((entry) => entry.entityType === "settings") &&
    activityList.body.data.some((entry) => entry.entityType === "navigation") &&
    activityList.body.data.some((entry) => entry.entityType === "homepage"),
  `rows=${activityList.body?.data?.length}`,
);

/* Publishing queues (§8): drafts / scheduled / published aggregate */
const publishingNoAuth = await get("/api/admin/publishing?queue=drafts");
record(
  "publishing queues: the feed requires a token",
  publishingNoAuth.status === 401,
  `status=${publishingNoAuth.status}`,
);

const badQueue = await call("/api/admin/publishing?queue=everything", {
  token: ADMIN_TOKEN,
});
record(
  "publishing queues: unknown queues are rejected",
  badQueue.status === 400,
  `status=${badQueue.status}`,
);

const draftsQueue = await call("/api/admin/publishing?queue=drafts", {
  token: ADMIN_TOKEN,
});
const publishedQueue = await call("/api/admin/publishing?queue=published", {
  token: ADMIN_TOKEN,
});
record(
  "publishing queues: drafts and published list their real content",
  draftsQueue.status === 200 &&
    publishedQueue.status === 200 &&
    Array.isArray(draftsQueue.body?.data) &&
    Array.isArray(publishedQueue.body?.data) &&
    (publishedQueue.body?.meta?.counts?.published ?? 0) > 0 &&
    publishedQueue.body.data.every((entry) => entry.status === "published"),
  `drafts=${draftsQueue.body?.data?.length} published=${publishedQueue.body?.data?.length}`,
);

/* SEO surface (§8): sitemap and robots are served for crawlers */
const sitemapResponse = await fetch(`${BASE}/sitemap.xml`);
const sitemapText = await sitemapResponse.text();
record(
  "seo: the sitemap lists routes and real published content",
  sitemapResponse.status === 200 &&
    sitemapText.includes("/work") &&
    sitemapText.includes("dean-and-deb") &&
    sitemapText.includes("/journal/life-untolds-in-monochrome"),
  `status=${sitemapResponse.status}`,
);

const robotsResponse = await fetch(`${BASE}/robots.txt`);
const robotsText = await robotsResponse.text();
record(
  "seo: robots keeps crawlers out of the admin and points at the sitemap",
  robotsResponse.status === 200 &&
    robotsText.includes("Disallow: /admin") &&
    robotsText.includes("sitemap.xml"),
  `status=${robotsResponse.status}`,
);

/* Publish workflow endpoints (§24, §38): draft → validate → publish */
const workflowPreClean = new Database("data/ocassio.db");
workflowPreClean.query("DELETE FROM services WHERE slug LIKE 'wf-%'").run();
workflowPreClean.query("DELETE FROM faq WHERE question LIKE 'WF %'").run();
workflowPreClean.query("DELETE FROM team_members WHERE name LIKE 'WF %'").run();
workflowPreClean.query("DELETE FROM clients WHERE name LIKE 'WF %'").run();
workflowPreClean
  .query("DELETE FROM recognition WHERE title LIKE 'WF %'")
  .run();
workflowPreClean.close();

const workflowNoAuth = await call("/api/admin/faq/1/actions", {
  method: "POST",
  body: { action: "publish" },
});
record(
  "workflow: actions require a token",
  workflowNoAuth.status === 401,
  `status=${workflowNoAuth.status}`,
);

const workflowFaq = await call("/api/admin/faq", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { question: "WF question?", answer: "WF answer." },
});
const workflowFaqId = workflowFaq.body?.data?.id;
record(
  "workflow: a new FAQ entry starts as a draft",
  workflowFaq.status === 201 && workflowFaq.body?.data?.status === "draft",
);

const scheduleBlocked = await call(`/api/admin/faq/${workflowFaqId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "schedule", publishAt: "2999-01-01T00:00:00.000Z" },
});
record(
  "workflow: types without publish_at reject scheduling",
  scheduleBlocked.status === 400 &&
    JSON.stringify(scheduleBlocked.body?.issues ?? "").includes("save_draft"),
  JSON.stringify(scheduleBlocked.body?.issues),
);

const publishFaq = await call(`/api/admin/faq/${workflowFaqId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
record(
  "workflow: publishing a valid entry works",
  publishFaq.status === 200 && publishFaq.body?.data?.status === "published",
  `status=${publishFaq.status}`,
);
const publicFaqAfterPublish = await get("/api/faq");
record(
  "workflow: the published entry appears publicly",
  publicFaqAfterPublish.body?.data?.some(
    (entry) => entry.question === "WF question?",
  ),
);
const unpublishFaq = await call(`/api/admin/faq/${workflowFaqId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "unpublish" },
});
const publicFaqAfterUnpublish = await get("/api/faq");
record(
  "workflow: unpublishing hides it again",
  unpublishFaq.status === 200 &&
    unpublishFaq.body?.data?.status === "draft" &&
    !publicFaqAfterUnpublish.body?.data?.some(
      (entry) => entry.question === "WF question?",
    ),
);

const blockedDelete = await call(`/api/admin/faq/${workflowFaqId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "delete flow: permanent delete is blocked until the entry is archived",
  blockedDelete.status === 409 &&
    JSON.stringify(blockedDelete.body?.issues ?? "").includes(
      "Archive it first",
    ),
  JSON.stringify(blockedDelete.body?.issues),
);
const archiveFaq = await call(`/api/admin/faq/${workflowFaqId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "archive" },
});
record(
  "delete flow: archiving parks the entry for permanent delete",
  archiveFaq.status === 200 && archiveFaq.body?.data?.status === "archived",
  `status=${archiveFaq.status}`,
);

const missingActionTarget = await call("/api/admin/faq/999999/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
record(
  "workflow: actions on a missing entry are a 404",
  missingActionTarget.status === 404,
  `status=${missingActionTarget.status}`,
);

const workflowService = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "WF Service",
    slug: "wf-service",
    serviceType: "Photography",
    shortDescription: "Workflow.",
  },
});
const workflowServiceId = workflowService.body?.data?.id;

const adminDraftRead = await call(`/api/admin/services/${workflowServiceId}`, {
  token: ADMIN_TOKEN,
});
const publicDraftHidden = await get("/api/services");
record(
  "workflow: admins can preview the draft while the public API hides it",
  adminDraftRead.status === 200 &&
    adminDraftRead.body?.data?.slug === "wf-service" &&
    !publicDraftHidden.body?.data?.some(
      (service) => service.slug === "wf-service",
    ),
);

const tamperDb = new Database("data/ocassio.db");
tamperDb
  .query("UPDATE services SET short_description = '' WHERE id = ?")
  .run(workflowServiceId);
tamperDb.close();
const gateBlocked = await call(
  `/api/admin/services/${workflowServiceId}/actions`,
  {
    method: "POST",
    token: ADMIN_TOKEN,
    body: { action: "publish" },
  },
);
record(
  "workflow: the publish gate blocks incomplete content with specific issues",
  gateBlocked.status === 422 &&
    JSON.stringify(gateBlocked.body?.issues ?? "").includes(
      "Short description is required.",
    ),
  JSON.stringify(gateBlocked.body?.issues),
);
const restoreService = await call(`/api/admin/services/${workflowServiceId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { shortDescription: "Workflow." },
});
const publishService = await call(
  `/api/admin/services/${workflowServiceId}/actions`,
  {
    method: "POST",
    token: ADMIN_TOKEN,
    body: { action: "publish" },
  },
);
const publicServices = await get("/api/services");
record(
  "workflow: fixing the issue allows publishing",
  restoreService.status === 200 &&
    publishService.status === 200 &&
    publishService.body?.data?.status === "published" &&
    publicServices.body?.data?.some(
      (service) => service.slug === "wf-service",
    ),
);

const workflowMember = await call("/api/admin/studio/team", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { name: "WF Member", roleTitle: "Editor" },
});
const publishMember = await call(
  `/api/admin/studio/team/${workflowMember.body?.data?.id}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "publish" } },
);
record(
  "workflow: team members publish through the same action",
  publishMember.status === 200 &&
    publishMember.body?.data?.status === "published",
  `status=${publishMember.status}`,
);

const workflowClient = await call("/api/admin/studio/clients", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { name: "WF Client" },
});
const publishClient = await call(
  `/api/admin/studio/clients/${workflowClient.body?.data?.id}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "publish" } },
);
record(
  "workflow: clients publish through the same action",
  publishClient.status === 200 &&
    publishClient.body?.data?.status === "published",
  `status=${publishClient.status}`,
);

const workflowRecognition = await call("/api/admin/studio/recognition", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { title: "WF Award", year: 2024, recognitionType: "award" },
});
const publishRecognition = await call(
  `/api/admin/studio/recognition/${workflowRecognition.body?.data?.id}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "publish" } },
);
record(
  "workflow: recognition publishes through the same action",
  publishRecognition.status === 200 &&
    publishRecognition.body?.data?.status === "published",
  `status=${publishRecognition.status}`,
);

const workflowPricing = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId: workflowServiceId,
    packageName: "WF Package",
    priceType: "custom_quote",
  },
});
const publishPricing = await call(
  `/api/admin/pricing/${workflowPricing.body?.data?.id}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "publish" } },
);
record(
  "workflow: pricing publishes through the same action",
  publishPricing.status === 200 &&
    publishPricing.body?.data?.status === "published",
  `status=${publishPricing.status}`,
);

await archiveThenDelete(`/api/admin/services/${workflowServiceId}`);
await archiveThenDelete(`/api/admin/faq/${workflowFaqId}`);
await archiveThenDelete(`/api/admin/studio/team/${workflowMember.body?.data?.id}`);
await archiveThenDelete(`/api/admin/studio/clients/${workflowClient.body?.data?.id}`);
await archiveThenDelete(
  `/api/admin/studio/recognition/${workflowRecognition.body?.data?.id}`,
);
const workflowAfterCleanup = await get("/api/services");
record(
  "workflow: fixtures clean up",
  !workflowAfterCleanup.body?.data?.some(
    (service) => service.slug === "wf-service",
  ),
);

/* Version history (§25): View, Compare, Restore */
const versionPreClean = new Database("data/ocassio.db");
versionPreClean.query("DELETE FROM services WHERE slug LIKE 'vh-%'").run();
versionPreClean.query("DELETE FROM pricing WHERE package_name LIKE 'VH %'").run();
versionPreClean
  .query(
    `DELETE FROM version_history WHERE
       (entity_type = 'service' AND entity_id NOT IN (SELECT id FROM services))
       OR (entity_type = 'pricing' AND entity_id NOT IN (SELECT id FROM pricing))
       OR (entity_type = 'studio_about' AND entity_id NOT IN (SELECT id FROM studio_about))`,
  )
  .run();
const vhAboutOriginal = versionPreClean
  .query(
    "SELECT id, heading, body, supporting_media_id FROM studio_about ORDER BY id LIMIT 1",
  )
  .get();
const vhAboutMaxVersion = vhAboutOriginal
  ? versionPreClean
      .query(
        "SELECT COALESCE(MAX(version_no), 0) AS max FROM version_history WHERE entity_type = 'studio_about' AND entity_id = ?",
      )
      .get(vhAboutOriginal.id).max
  : 0;
versionPreClean.close();

const versionsNoAuth = await get(
  "/api/admin/versions?entityType=service&entityId=1",
);
record(
  "version history: requires a token",
  versionsNoAuth.status === 401,
  `status=${versionsNoAuth.status}`,
);

const versionsBadType = await call(
  "/api/admin/versions?entityType=homepage&entityId=1",
  { token: ADMIN_TOKEN },
);
record(
  "version history: unknown entity types list the supported set",
  versionsBadType.status === 400 &&
    String(versionsBadType.body?.error).includes("service"),
  `status=${versionsBadType.status}`,
);

const vhService = await call("/api/admin/services", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    name: "VH Service",
    slug: "vh-service",
    serviceType: "Photography",
    shortDescription: "First version.",
  },
});
const vhServiceId = vhService.body?.data?.id;
const vhAfterCreate = await call(
  `/api/admin/versions?entityType=service&entityId=${vhServiceId}`,
  { token: ADMIN_TOKEN },
);
record(
  "version history: creating content records version 1",
  vhAfterCreate.status === 200 &&
    vhAfterCreate.body?.data?.length === 1 &&
    vhAfterCreate.body.data[0].versionNo === 1,
  JSON.stringify(vhAfterCreate.body?.meta),
);

const vhPatch = await call(`/api/admin/services/${vhServiceId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { shortDescription: "Second version." },
});
const vhAfterPatch = await call(
  `/api/admin/versions?entityType=service&entityId=${vhServiceId}`,
  { token: ADMIN_TOKEN },
);
const vhFirstVersionId = vhAfterPatch.body?.data?.find(
  (version) => version.versionNo === 1,
)?.id;
const vhSecondVersionId = vhAfterPatch.body?.data?.find(
  (version) => version.versionNo === 2,
)?.id;
record(
  "version history: edits append a new version",
  vhPatch.status === 200 &&
    vhAfterPatch.body?.data?.length === 2 &&
    vhAfterPatch.body.data[0].versionNo === 2,
);

const vhView = await call(`/api/admin/versions/${vhFirstVersionId}`, {
  token: ADMIN_TOKEN,
});
record(
  "version history: a version can be viewed with its snapshot",
  vhView.status === 200 &&
    vhView.body?.data?.snapshot?.service?.shortDescription ===
      "First version.",
  JSON.stringify(vhView.body?.data?.snapshot?.service?.shortDescription),
);

const vhPricing = await call("/api/admin/pricing", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    serviceId: vhServiceId,
    packageName: "VH Package",
    priceType: "custom_quote",
  },
});
const vhPricingId = vhPricing.body?.data?.id;
const vhPricingVersions = await call(
  `/api/admin/versions?entityType=pricing&entityId=${vhPricingId}`,
  { token: ADMIN_TOKEN },
);
record(
  "version history: pricing changes are versioned too",
  vhPricingVersions.body?.data?.length === 1,
  `versions=${vhPricingVersions.body?.data?.length}`,
);
const vhCompareMismatch = await call(
  `/api/admin/versions/${vhFirstVersionId}/compare?with=${vhPricingVersions.body?.data?.[0]?.id}`,
  { token: ADMIN_TOKEN },
);
record(
  "version history: comparing different entities is a 400",
  vhCompareMismatch.status === 400,
  `status=${vhCompareMismatch.status}`,
);

const vhCompare = await call(
  `/api/admin/versions/${vhSecondVersionId}/compare?with=${vhFirstVersionId}`,
  { token: ADMIN_TOKEN },
);
record(
  "version history: compare returns both snapshots of one entity",
  vhCompare.status === 200 &&
    vhCompare.body?.data?.from?.snapshot?.service?.shortDescription ===
      "Second version." &&
    vhCompare.body?.data?.to?.snapshot?.service?.shortDescription ===
      "First version.",
);

const vhRestore = await call(
  `/api/admin/versions/${vhFirstVersionId}/restore`,
  { method: "POST", token: ADMIN_TOKEN },
);
const vhAfterRestore = await call(`/api/admin/services/${vhServiceId}`, {
  token: ADMIN_TOKEN,
});
const vhListAfterRestore = await call(
  `/api/admin/versions?entityType=service&entityId=${vhServiceId}`,
  { token: ADMIN_TOKEN },
);
record(
  "version history: restoring writes the old content back",
  vhRestore.status === 200 &&
    vhAfterRestore.body?.data?.shortDescription === "First version.",
);
record(
  "version history: restore appends a new version",
  vhListAfterRestore.body?.data?.length === 3 &&
    vhListAfterRestore.body.data[0].versionNo === 3,
  `versions=${vhListAfterRestore.body?.data?.length}`,
);

const vhMissingRestore = await call("/api/admin/versions/999999/restore", {
  method: "POST",
  token: ADMIN_TOKEN,
});
record(
  "version history: restoring a missing version is a 404",
  vhMissingRestore.status === 404,
  `status=${vhMissingRestore.status}`,
);

const vhAboutPatch = await call("/api/admin/studio/about", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    heading: "VH heading",
    body: { paragraphs: ["VH paragraph."], philosophy: [] },
  },
});
const vhAboutId = vhAboutPatch.body?.data?.id;
const vhAboutVersions = await call(
  `/api/admin/versions?entityType=studio_about&entityId=${vhAboutId}`,
  { token: ADMIN_TOKEN },
);
record(
  "version history: the About singleton records versions",
  vhAboutPatch.status === 200 &&
    (vhAboutVersions.body?.data?.length ?? 0) >= 1,
  `versions=${vhAboutVersions.body?.data?.length}`,
);

/* Cleanup: remove fixtures and their versions, restore the About baseline. */
const vhCleanup = new Database("data/ocassio.db");
const vhAboutCleanup = new Database("data/ocassio.db");
if (vhAboutOriginal) {
  vhAboutCleanup
    .query(
      "UPDATE studio_about SET heading = ?, body = ?, supporting_media_id = ? WHERE id = ?",
    )
    .run(
      vhAboutOriginal.heading,
      vhAboutOriginal.body,
      vhAboutOriginal.supporting_media_id,
      vhAboutOriginal.id,
    );
  vhAboutCleanup
    .query(
      "DELETE FROM version_history WHERE entity_type = 'studio_about' AND entity_id = ? AND version_no > ?",
    )
    .run(vhAboutOriginal.id, vhAboutMaxVersion);
} else {
  vhAboutCleanup.query("DELETE FROM studio_about").run();
  vhAboutCleanup
    .query("DELETE FROM version_history WHERE entity_type = 'studio_about'")
    .run();
}
vhAboutCleanup.close();

const vhDeleted = await archiveThenDelete(`/api/admin/services/${vhServiceId}`);
vhCleanup
  .query("DELETE FROM version_history WHERE entity_type = 'service' AND entity_id = ?")
  .run(vhServiceId);
vhCleanup
  .query("DELETE FROM version_history WHERE entity_type = 'pricing' AND entity_id = ?")
  .run(vhPricingId);
vhCleanup.close();
const vhAfterCleanup = await get("/api/services");
record(
  "version history: fixtures clean up",
  vhDeleted.status === 200 &&
    !vhAfterCleanup.body?.data?.some(
      (service) => service.slug === "vh-service",
    ),
);

/* Journal admin (§17): articles CRUD, publish gate, versions, restore */
const articlePreClean = new Database("data/ocassio.db");
articlePreClean
  .query("DELETE FROM articles WHERE slug LIKE 'verify-%'")
  .run();
articlePreClean
  .query(
    "DELETE FROM version_history WHERE entity_type = 'article' AND entity_id NOT IN (SELECT id FROM articles)",
  )
  .run();
articlePreClean.close();

const articlesNoAuth = await get("/api/admin/articles");
record(
  "journal admin: the list requires a token",
  articlesNoAuth.status === 401,
  `status=${articlesNoAuth.status}`,
);

const articlesList = await call("/api/admin/articles", { token: ADMIN_TOKEN });
const seededArticleSlugs =
  articlesList.body?.data?.map((row) => row.slug) ?? [];
record(
  "journal admin: the list carries every article state with category options",
  articlesList.status === 200 &&
    seededArticleSlugs.includes("life-untolds-in-monochrome") &&
    Array.isArray(articlesList.body?.meta?.categories) &&
    (articlesList.body?.meta?.categories?.length ?? 0) >= 5,
  `rows=${articlesList.body?.data?.length}`,
);

const badArticle = await call("/api/admin/articles", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "",
    slug: "Bad Slug!",
    excerpt: "",
    publishDate: "not-a-date",
    categorySlug: "",
  },
});
record(
  "journal admin: invalid payloads explain every issue",
  badArticle.status === 400 &&
    JSON.stringify(badArticle.body?.issues ?? "").includes("title") &&
    JSON.stringify(badArticle.body?.issues ?? "").includes("slug") &&
    JSON.stringify(badArticle.body?.issues ?? "").includes("categorySlug") &&
    JSON.stringify(badArticle.body?.issues ?? "").includes("publishDate"),
  JSON.stringify(badArticle.body?.issues),
);

const createdArticle = await call("/api/admin/articles", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Verify Field Notes",
    slug: "verify-field-notes",
    categorySlug: "studio-notes",
    excerpt: "A verification article about studio craft.",
    publishDate: "2026-02-01",
  },
});
const articleId = createdArticle.body?.data?.article?.id;
record(
  "journal admin: a draft article is created",
  createdArticle.status === 201 &&
    createdArticle.body?.data?.article?.status === "draft",
  `status=${createdArticle.status}`,
);
const draftArticlePublic = await get("/api/articles/verify-field-notes");
record(
  "api single: draft articles are a 404",
  draftArticlePublic.status === 404,
  `status=${draftArticlePublic.status}`,
);

const duplicateArticle = await call("/api/admin/articles", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Duplicate",
    slug: "verify-field-notes",
    categorySlug: "studio-notes",
    excerpt: "Duplicate excerpt.",
    publishDate: "2026-02-01",
  },
});
record(
  "journal admin: slugs are unique",
  duplicateArticle.status === 409,
  `status=${duplicateArticle.status}`,
);

const unknownCategoryArticle = await call("/api/admin/articles", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Unknown category",
    slug: "verify-unknown-category",
    categorySlug: "not-a-category",
    excerpt: "Unknown category excerpt.",
    publishDate: "2026-02-01",
  },
});
record(
  "journal admin: unknown categories are rejected",
  unknownCategoryArticle.status === 422,
  `status=${unknownCategoryArticle.status}`,
);

const privateCandidate = await call("/api/admin/articles", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Verify Private Note",
    slug: "verify-private-note",
    categorySlug: "studio-notes",
    excerpt: "A private verification note.",
    publishDate: "2026-02-02",
    visibility: "private",
  },
});
const privateCandidateId = privateCandidate.body?.data?.article?.id;
await call(`/api/admin/articles/${privateCandidateId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    blocks: [{ type: "paragraph", text: "Private verification body." }],
  },
});
await call(`/api/admin/articles/${privateCandidateId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
const privateArticlePublic = await get("/api/articles/verify-private-note");
record(
  "api single: private articles never expose publicly",
  privateCandidate.status === 201 && privateArticlePublic.status === 404,
  `status=${privateArticlePublic.status}`,
);

const publishWithoutBlocks = await call(
  `/api/admin/articles/${articleId}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "publish" } },
);
record(
  "journal admin: publishing requires at least one content block",
  publishWithoutBlocks.status === 422 &&
    JSON.stringify(publishWithoutBlocks.body?.issues ?? "").includes("block"),
  `status=${publishWithoutBlocks.status}`,
);

const patchedArticle = await call(`/api/admin/articles/${articleId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    author: "Ocassio.Studio",
    excerpt: "An updated verification article.",
    blocks: [
      { type: "paragraph", text: "First verification paragraph." },
      { type: "heading", text: "A verified heading" },
      { type: "quote", text: "Quoted verification line." },
      { type: "image", mediaId: null },
    ],
  },
});
record(
  "journal admin: the block composer persists the documented blocks",
  patchedArticle.status === 200 &&
    patchedArticle.body?.data?.blocks?.length === 4 &&
    patchedArticle.body.data.blocks[1].blockType === "heading" &&
    patchedArticle.body.data.article.author === "Ocassio.Studio",
  `blocks=${patchedArticle.body?.data?.blocks?.length}`,
);

const articleVersions = await call(
  `/api/admin/versions?entityType=article&entityId=${articleId}`,
  { token: ADMIN_TOKEN },
);
record(
  "journal admin: every save records a version",
  articleVersions.status === 200 && articleVersions.body?.data?.length === 2,
  `versions=${articleVersions.body?.data?.length}`,
);

const publishedArticle = await call(
  `/api/admin/articles/${articleId}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "publish" } },
);
const publicArticle = await get("/api/articles/verify-field-notes");
record(
  "journal admin: publishing exposes the article publicly",
  publishedArticle.status === 200 &&
    publishedArticle.body?.data?.status === "published" &&
    publicArticle.status === 200 &&
    publicArticle.body?.data?.title === "Verify Field Notes",
  `publish=${publishedArticle.status} public=${publicArticle.status}`,
);

const unpublishArticle = await call(
  `/api/admin/articles/${articleId}/actions`,
  { method: "POST", token: ADMIN_TOKEN, body: { action: "unpublish" } },
);
const publicArticleHidden = await get("/api/articles/verify-field-notes");
record(
  "journal admin: unpublishing hides it from the public",
  unpublishArticle.status === 200 && publicArticleHidden.status === 404,
  `unpublish=${unpublishArticle.status} public=${publicArticleHidden.status}`,
);

const pastSchedule = await call(
  `/api/admin/articles/${articleId}/actions`,
  {
    method: "POST",
    token: ADMIN_TOKEN,
    body: { action: "schedule", publishAt: "2020-01-01T00:00:00.000Z" },
  },
);
record(
  "journal admin: scheduling rejects past timestamps",
  pastSchedule.status === 400,
  `status=${pastSchedule.status}`,
);

const futureSchedule = await call(
  `/api/admin/articles/${articleId}/actions`,
  {
    method: "POST",
    token: ADMIN_TOKEN,
    body: { action: "schedule", publishAt: "2999-01-01T00:00:00.000Z" },
  },
);
record(
  "journal admin: scheduling accepts future timestamps",
  futureSchedule.status === 200 &&
    futureSchedule.body?.data?.status === "scheduled",
  `status=${futureSchedule.status}`,
);
const scheduledArticlePublic = await get("/api/articles/verify-field-notes");
record(
  "api single: scheduled articles are a 404",
  scheduledArticlePublic.status === 404,
  `status=${scheduledArticlePublic.status}`,
);

const firstArticleVersionId =
  articleVersions.body?.data?.[articleVersions.body.data.length - 1]?.id;
const restoredArticle = await call(
  `/api/admin/versions/${firstArticleVersionId}/restore`,
  { method: "POST", token: ADMIN_TOKEN },
);
const articleAfterRestore = await call(`/api/admin/articles/${articleId}`, {
  token: ADMIN_TOKEN,
});
const articleVersionsAfterRestore = await call(
  `/api/admin/versions?entityType=article&entityId=${articleId}`,
  { token: ADMIN_TOKEN },
);
record(
  "journal admin: restoring a version writes the old content back and appends",
  restoredArticle.status === 200 &&
    articleAfterRestore.body?.data?.article?.excerpt ===
      "A verification article about studio craft." &&
    articleVersionsAfterRestore.body?.data?.length === 3,
  `restore=${restoredArticle.status} versions=${articleVersionsAfterRestore.body?.data?.length}`,
);

const directArticleDelete = await call(`/api/admin/articles/${articleId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "journal admin: delete is blocked until archived",
  directArticleDelete.status === 409,
  `status=${directArticleDelete.status}`,
);

await call(`/api/admin/articles/${articleId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "archive" },
});
const deletedArticle = await call(`/api/admin/articles/${articleId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "journal admin: archived articles delete cleanly",
  deletedArticle.status === 200,
  `status=${deletedArticle.status}`,
);

const articleCleanup = new Database("data/ocassio.db");
articleCleanup
  .query("DELETE FROM articles WHERE slug LIKE 'verify-%'")
  .run();
articleCleanup
  .query(
    "DELETE FROM version_history WHERE entity_type = 'article' AND entity_id NOT IN (SELECT id FROM articles)",
  )
  .run();
articleCleanup.close();
record("journal admin: fixtures clean up", true);

const articleActivity = await call("/api/admin/activity?limit=50", {
  token: ADMIN_TOKEN,
});
record(
  "activity log: article changes are recorded too",
  articleActivity.status === 200 &&
    articleActivity.body?.data?.some((entry) => entry.entityType === "article"),
  `rows=${articleActivity.body?.data?.length}`,
);

/* Portfolio admin (§11, §12): project CRUD, publish, versions, guard */
const projectPreClean = new Database("data/ocassio.db");
projectPreClean.query("DELETE FROM projects WHERE slug LIKE 'verify-%'").run();
projectPreClean
  .query(
    "DELETE FROM version_history WHERE entity_type = 'project' AND entity_id NOT IN (SELECT id FROM projects)",
  )
  .run();
projectPreClean.close();

const projectsNoAuth = await get("/api/admin/projects");
record(
  "portfolio admin: the list requires a token",
  projectsNoAuth.status === 401,
  `status=${projectsNoAuth.status}`,
);

const projectsList = await call("/api/admin/projects", { token: ADMIN_TOKEN });
const projectSlugs = projectsList.body?.data?.map((row) => row.slug) ?? [];
record(
  "portfolio admin: the seeded projects list with category options",
  projectsList.status === 200 &&
    projectSlugs.includes("dean-and-deb") &&
    projectSlugs.includes("tere-and-chris") &&
    (projectsList.body?.meta?.categories?.length ?? 0) === 7,
  `rows=${projectsList.body?.data?.length}`,
);

const badProject = await call("/api/admin/projects", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { title: "", slug: "Bad Slug!", category: "Nope", year: 1200, projectDate: "x" },
});
record(
  "portfolio admin: invalid payloads explain every issue",
  badProject.status === 400 &&
    JSON.stringify(badProject.body?.issues ?? "").includes("slug") &&
    JSON.stringify(badProject.body?.issues ?? "").includes("category") &&
    JSON.stringify(badProject.body?.issues ?? "").includes("year"),
  JSON.stringify(badProject.body?.issues),
);

const createdProject = await call("/api/admin/projects", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Verify Project",
    slug: "verify-project",
    projectType: "Photography",
    category: "Photography",
    year: 2026,
    projectDate: "2026-03-01",
    shortDescription: "A verification project for the portfolio admin.",
    relatedSlugs: ["dean-and-deb"],
    credits: [{ role: "Photography", name: "Ocassio.Project" }],
  },
});
const projectId = createdProject.body?.data?.project?.id;
record(
  "portfolio admin: a draft project is created",
  createdProject.status === 201 &&
    createdProject.body?.data?.project?.status === "draft",
  `status=${createdProject.status}`,
);

const duplicateProject = await call("/api/admin/projects", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: {
    title: "Duplicate",
    slug: "verify-project",
    projectType: "Photography",
    category: "Photography",
    year: 2026,
    projectDate: "2026-03-01",
    shortDescription: "Duplicate project.",
  },
});
record(
  "portfolio admin: slugs are unique",
  duplicateProject.status === 409,
  `status=${duplicateProject.status}`,
);

const publishedProject = await call(`/api/admin/projects/${projectId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
const publicProject = await get("/api/projects/verify-project");
record(
  "portfolio admin: publishing exposes the project publicly",
  publishedProject.status === 200 &&
    publishedProject.body?.data?.status === "published" &&
    publicProject.status === 200 &&
    publicProject.body?.data?.title === "Verify Project",
  `publish=${publishedProject.status} public=${publicProject.status}`,
);

const updatedProject = await call(`/api/admin/projects/${projectId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    shortDescription: "Updated verification description.",
    relatedSlugs: ["tere-and-chris"],
  },
});
record(
  "portfolio admin: updates persist editorial fields",
  updatedProject.status === 200 &&
    updatedProject.body?.data?.project?.shortDescription ===
      "Updated verification description." &&
    JSON.stringify(updatedProject.body?.data?.project?.relatedSlugs) ===
      JSON.stringify(["tere-and-chris"]),
);

const projectVersions = await call(
  `/api/admin/versions?entityType=project&entityId=${projectId}`,
  { token: ADMIN_TOKEN },
);
record(
  "portfolio admin: every save records a version",
  projectVersions.status === 200 && projectVersions.body?.data?.length === 2,
  `versions=${projectVersions.body?.data?.length}`,
);

const firstProjectVersionId =
  projectVersions.body?.data?.[projectVersions.body.data.length - 1]?.id;
const restoredProject = await call(
  `/api/admin/versions/${firstProjectVersionId}/restore`,
  { method: "POST", token: ADMIN_TOKEN },
);
const projectAfterRestore = await call(`/api/admin/projects/${projectId}`, {
  token: ADMIN_TOKEN,
});
record(
  "portfolio admin: restoring a version writes the old content back",
  restoredProject.status === 200 &&
    projectAfterRestore.body?.data?.project?.shortDescription ===
      "A verification project for the portfolio admin.",
  `restore=${restoredProject.status}`,
);

const unpublishProject = await call(`/api/admin/projects/${projectId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "unpublish" },
});
const hiddenProject = await get("/api/projects/verify-project");
record(
  "portfolio admin: unpublishing hides it from the public",
  unpublishProject.status === 200 && hiddenProject.status === 404,
  `unpublish=${unpublishProject.status} public=${hiddenProject.status}`,
);

const directProjectDelete = await call(`/api/admin/projects/${projectId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "portfolio admin: delete is blocked until archived",
  directProjectDelete.status === 409,
  `status=${directProjectDelete.status}`,
);

await call(`/api/admin/projects/${projectId}/actions`, {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "archive" },
});
const deletedProject = await call(`/api/admin/projects/${projectId}`, {
  method: "DELETE",
  token: ADMIN_TOKEN,
});
record(
  "portfolio admin: archived projects delete cleanly",
  deletedProject.status === 200,
  `status=${deletedProject.status}`,
);

const projectCleanup = new Database("data/ocassio.db");
projectCleanup.query("DELETE FROM projects WHERE slug LIKE 'verify-%'").run();
projectCleanup
  .query(
    "DELETE FROM version_history WHERE entity_type = 'project' AND entity_id NOT IN (SELECT id FROM projects)",
  )
  .run();
projectCleanup.close();
record("portfolio admin: fixtures clean up", true);

/* Scheduled publishing (§24): due schedules publish on the first public read */
const schedulingPreClean = new Database("data/ocassio.db");
schedulingPreClean
  .query("DELETE FROM articles WHERE slug LIKE 'verify-scheduled-%'")
  .run();
schedulingPreClean.close();

const schedulingDb = new Database("data/ocassio.db");
const dueArticle = schedulingDb
  .query(
    `INSERT INTO articles (title, slug, excerpt, publish_date, status, visibility, publish_at)
     VALUES ('Verify Scheduled Due', 'verify-scheduled-due', 'Due soon.', '2026-02-01', 'scheduled', 'public', '2020-01-01T00:00:00.000Z') RETURNING id`,
  )
  .get();
schedulingDb
  .query(
    `INSERT INTO articles (title, slug, excerpt, publish_date, status, visibility, publish_at)
     VALUES ('Verify Scheduled Future', 'verify-scheduled-future', 'Later.', '2026-02-02', 'scheduled', 'public', '2999-01-01T00:00:00.000Z')`,
  )
  .run();
schedulingDb
  .query(
    `INSERT INTO article_blocks (article_id, block_type, sort_order, text_content)
     VALUES (?, 'paragraph', 1, 'Scheduled body.')`,
  )
  .run(dueArticle.id);
schedulingDb.close();

const scheduledList = await get("/api/articles?limit=50");
const scheduledSlugs = (scheduledList.body?.data ?? []).map(
  (article) => article.slug,
);
record(
  "scheduling: a due article auto-publishes on the first public read",
  scheduledSlugs.includes("verify-scheduled-due"),
  scheduledSlugs.join(","),
);
record(
  "scheduling: a future-scheduled article stays hidden",
  !scheduledSlugs.includes("verify-scheduled-future"),
);
const persistedDb = new Database("data/ocassio.db");
const persistedStatus = persistedDb
  .query("SELECT status FROM articles WHERE slug = 'verify-scheduled-due'")
  .get().status;
persistedDb.close();
record(
  "scheduling: the auto-published status is persisted",
  persistedStatus === "published",
  `status=${persistedStatus}`,
);
const dueScheduledDetail = await get("/api/articles/verify-scheduled-due");
record(
  "scheduling: the auto-published article opens publicly",
  dueScheduledDetail.status === 200 &&
    dueScheduledDetail.body?.data?.slug === "verify-scheduled-due",
  `status=${dueScheduledDetail.status}`,
);
const futureScheduledDetail = await get("/api/articles/verify-scheduled-future");
record(
  "scheduling: the future article is still a 404",
  futureScheduledDetail.status === 404,
  `status=${futureScheduledDetail.status}`,
);

const schedulingCleanup = new Database("data/ocassio.db");
schedulingCleanup
  .query(
    "DELETE FROM article_blocks WHERE article_id IN (SELECT id FROM articles WHERE slug LIKE 'verify-scheduled-%')",
  )
  .run();
schedulingCleanup
  .query("DELETE FROM articles WHERE slug LIKE 'verify-scheduled-%'")
  .run();
schedulingCleanup.close();
const journalAfterScheduling = await get("/api/articles?limit=50");
record(
  "scheduling: fixtures clean up",
  !(journalAfterScheduling.body?.data ?? []).some((article) =>
    article.slug.startsWith("verify-scheduled-"),
  ),
);

/* Likes (studio request): persisted, one per visitor */
const likesPreClean = new Database("data/ocassio.db");
likesPreClean
  .query(
    "DELETE FROM likes WHERE entity_slug IN ('dean-and-deb', 'life-untolds-in-monochrome')",
  )
  .run();
likesPreClean.close();

const likeBaseline = await get(
  "/api/likes?entity=project&slug=dean-and-deb",
);
record(
  "api likes: the endpoint reports the current state",
  likeBaseline.status === 200 &&
    likeBaseline.body?.data?.count === 0 &&
    likeBaseline.body?.data?.liked === false,
  JSON.stringify(likeBaseline.body?.data),
);
const badLikeEntity = await get("/api/likes?entity=team&slug=dean-and-deb");
record(
  "api likes: unknown entities are rejected",
  badLikeEntity.status === 400 &&
    String(badLikeEntity.body?.error).includes("project"),
);
const missingLikeSlug = await get(
  "/api/likes?entity=project&slug=does-not-exist",
);
record(
  "api likes: an unknown project slug is a 404",
  missingLikeSlug.status === 404,
);

const likeVisitorA = "verify-visitor-aaaa-0001";
const likeVisitorB = "verify-visitor-bbbb-0002";
const likedOnce = await call("/api/likes", {
  method: "POST",
  body: { entity: "project", slug: "dean-and-deb", visitor: likeVisitorA },
});
record(
  "api likes: liking persists immediately",
  likedOnce.status === 200 &&
    likedOnce.body?.data?.liked === true &&
    likedOnce.body?.data?.count === 1,
  JSON.stringify(likedOnce.body?.data),
);
const likedStateRead = await get(
  `/api/likes?entity=project&slug=dean-and-deb&visitor=${likeVisitorA}`,
);
record(
  "api likes: the visitor sees their own like",
  likedStateRead.body?.data?.liked === true &&
    likedStateRead.body?.data?.count === 1,
);
const likedByB = await call("/api/likes", {
  method: "POST",
  body: { entity: "project", slug: "dean-and-deb", visitor: likeVisitorB },
});
record(
  "api likes: a second visitor adds to the count",
  likedByB.body?.data?.count === 2,
);
const unlikedA = await call("/api/likes", {
  method: "POST",
  body: { entity: "project", slug: "dean-and-deb", visitor: likeVisitorA },
});
record(
  "api likes: toggling removes the like",
  unlikedA.body?.data?.liked === false && unlikedA.body?.data?.count === 1,
);
const badLikeVisitor = await call("/api/likes", {
  method: "POST",
  body: { entity: "project", slug: "dean-and-deb", visitor: "x" },
});
record(
  "api likes: visitor ids are validated",
  badLikeVisitor.status === 400,
  `status=${badLikeVisitor.status}`,
);
const articleLike = await call("/api/likes", {
  method: "POST",
  body: {
    entity: "article",
    slug: "life-untolds-in-monochrome",
    visitor: likeVisitorA,
  },
});
record(
  "api likes: articles accept likes too",
  articleLike.status === 200 && articleLike.body?.data?.liked === true,
  `status=${articleLike.status}`,
);
const unknownArticleLike = await call("/api/likes", {
  method: "POST",
  body: { entity: "article", slug: "does-not-exist", visitor: likeVisitorA },
});
record(
  "api likes: an unknown article slug is a 404",
  unknownArticleLike.status === 404,
);

const likesCleanup = new Database("data/ocassio.db");
likesCleanup
  .query("DELETE FROM likes WHERE visitor_id LIKE 'verify-%'")
  .run();
likesCleanup.close();
const likeAfterCleanup = await get(
  "/api/likes?entity=project&slug=dean-and-deb",
);
record(
  "api likes: fixtures clean up",
  likeAfterCleanup.body?.data?.count === 0,
);

/* Admin auth (§27): sessions, roles, Users & Roles */
const authPreClean = new Database("data/ocassio.db");
authPreClean
  .query(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'verify-%@example.com')",
  )
  .run();
authPreClean
  .query("DELETE FROM users WHERE email LIKE 'verify-%@example.com'")
  .run();
authPreClean.close();

const signInUnknown = await call("/api/auth/sign-in", {
  method: "POST",
  body: { email: "nobody@example.com", password: "whatever-long" },
});
record(
  "auth: unknown emails are rejected",
  signInUnknown.status === 401,
  `status=${signInUnknown.status}`,
);
const signInMissing = await call("/api/auth/sign-in", {
  method: "POST",
  body: {},
});
record(
  "auth: missing credentials ask for both fields",
  signInMissing.status === 400 &&
    String(signInMissing.body?.error).includes("email and password"),
  `status=${signInMissing.status}`,
);

const authDb = new Database("data/ocassio.db");
const insertUser = async (name, email, password, role, status) => {
  const passwordHash = await Bun.password.hash(password);
  authDb
    .query(
      "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
    )
    .run(name, email, passwordHash, role, status);
};
await insertUser("Verify Owner", "verify-owner@example.com", "verify-owner-pass-1", "owner", "active");
await insertUser("Verify Editor", "verify-editor@example.com", "verify-editor-pass-1", "editor", "active");
await insertUser("Verify Sales", "verify-sales@example.com", "verify-sales-pass-1", "sales", "active");
await insertUser("Verify Media", "verify-media@example.com", "verify-media-pass-1", "media_manager", "active");
await insertUser("Verify Disabled", "verify-disabled@example.com", "verify-disabled-pass-1", "editor", "disabled");
authDb.close();

const signInWrongPassword = await call("/api/auth/sign-in", {
  method: "POST",
  body: { email: "verify-owner@example.com", password: "not-the-password" },
});
record(
  "auth: wrong passwords are rejected",
  signInWrongPassword.status === 401,
  `status=${signInWrongPassword.status}`,
);

const signInAs = async (email, password) => {
  const result = await call("/api/auth/sign-in", {
    method: "POST",
    body: { email, password },
  });
  const cookie =
    (result.setCookie ?? [])
      .find((value) => value.startsWith("ocassio_admin_session="))
      ?.split(";")[0] ?? "";
  return { ...result, cookie };
};

const ownerSignIn = await signInAs("verify-owner@example.com", "verify-owner-pass-1");
const ownerCookie = ownerSignIn.cookie;
record(
  "auth: signing in returns the user and sets the session cookie",
  ownerSignIn.status === 200 &&
    ownerSignIn.body?.data?.user?.role === "owner" &&
    ownerCookie.length > 0 &&
    !JSON.stringify(ownerSignIn.body).includes("password"),
  `cookie=${ownerCookie.slice(0, 28)}...`,
);
const sessionRead = await call("/api/auth/session", { cookie: ownerCookie });
record(
  "auth: the session endpoint reads the cookie",
  sessionRead.status === 200 &&
    sessionRead.body?.data?.user?.email === "verify-owner@example.com",
);
const anonymousSession = await call("/api/auth/session");
record(
  "auth: anonymous visitors have no session",
  anonymousSession.body?.data?.user === null,
);

/* Self-service password (§27): rotate with the session, revoke others */
const passwordNoSession = await call("/api/admin/account/password", {
  method: "POST",
  body: { currentPassword: "whatever", newPassword: "verify-owner-pass-2" },
});
record(
  "account: password changes need a real session",
  passwordNoSession.status === 401,
  `status=${passwordNoSession.status}`,
);

const wrongCurrentPassword = await call("/api/admin/account/password", {
  method: "POST",
  cookie: ownerCookie,
  body: { currentPassword: "wrong-password", newPassword: "verify-owner-pass-2" },
});
record(
  "account: the current password is verified",
  wrongCurrentPassword.status === 400 &&
    JSON.stringify(wrongCurrentPassword.body?.issues ?? "").includes(
      "Current password",
    ),
  `status=${wrongCurrentPassword.status}`,
);

const changedPassword = await call("/api/admin/account/password", {
  method: "POST",
  cookie: ownerCookie,
  body: { currentPassword: "verify-owner-pass-1", newPassword: "verify-owner-pass-2" },
});
const oldPasswordSignIn = await signInAs("verify-owner@example.com", "verify-owner-pass-1");
const newPasswordSignIn = await signInAs("verify-owner@example.com", "verify-owner-pass-2");
record(
  "account: the old password stops working and the new one signs in",
  changedPassword.status === 200 &&
    oldPasswordSignIn.status === 401 &&
    newPasswordSignIn.status === 200,
  `change=${changedPassword.status} old=${oldPasswordSignIn.status} new=${newPasswordSignIn.status}`,
);

const restoredPassword = await call("/api/admin/account/password", {
  method: "POST",
  cookie: ownerCookie,
  body: { currentPassword: "verify-owner-pass-2", newPassword: "verify-owner-pass-1" },
});
record(
  "account: the password restores for later fixtures",
  restoredPassword.status === 200,
  `status=${restoredPassword.status}`,
);

const disabledSignIn = await signInAs(
  "verify-disabled@example.com",
  "verify-disabled-pass-1",
);
record(
  "auth: disabled accounts are refused with a specific message",
  disabledSignIn.status === 403 &&
    String(disabledSignIn.body?.error).includes("disabled"),
  `status=${disabledSignIn.status}`,
);

/* Role matrix (§27): the backend enforces every module. */
const editorSignIn = await signInAs("verify-editor@example.com", "verify-editor-pass-1");
const salesSignIn = await signInAs("verify-sales@example.com", "verify-sales-pass-1");
const mediaSignIn = await signInAs("verify-media@example.com", "verify-media-pass-1");

const anonymousAdmin = await call("/api/admin/services");
record(
  "roles: anonymous admin calls are 401",
  anonymousAdmin.status === 401,
  `status=${anonymousAdmin.status}`,
);
const editorServices = await call("/api/admin/services", {
  cookie: editorSignIn.cookie,
});
record(
  "roles: editors manage content modules",
  editorServices.status === 200,
  `status=${editorServices.status}`,
);
const editorUsers = await call("/api/admin/users", {
  cookie: editorSignIn.cookie,
});
record(
  "roles: editors cannot manage users",
  editorUsers.status === 403 &&
    String(editorUsers.body?.error).includes("owner"),
  `status=${editorUsers.status}`,
);
const editorInquiries = await call("/api/admin/inquiries", {
  cookie: editorSignIn.cookie,
});
record(
  "roles: editors cannot read the sales queue",
  editorInquiries.status === 403,
  `status=${editorInquiries.status}`,
);
const salesInquiries = await call("/api/admin/inquiries", {
  cookie: salesSignIn.cookie,
});
record(
  "roles: sales manage the inquiry queue",
  salesInquiries.status === 200,
  `status=${salesInquiries.status}`,
);
const salesServices = await call("/api/admin/services", {
  cookie: salesSignIn.cookie,
});
record(
  "roles: sales cannot manage content modules",
  salesServices.status === 403,
  `status=${salesServices.status}`,
);
const mediaServices = await call("/api/admin/services", {
  cookie: mediaSignIn.cookie,
});
record(
  "roles: media managers stay out of content modules",
  mediaServices.status === 403,
  `status=${mediaServices.status}`,
);

/* Users & Roles CRUD (owner only). */
const usersList = await call("/api/admin/users", { cookie: ownerCookie });
record(
  "users api: owners list the team without hashes",
  usersList.status === 200 &&
    usersList.body?.data?.some(
      (user) => user.email === "verify-owner@example.com",
    ) &&
    !JSON.stringify(usersList.body).includes("password"),
  `total=${usersList.body?.meta?.total}`,
);
const weakUser = await call("/api/admin/users", {
  method: "POST",
  cookie: ownerCookie,
  body: {
    name: "Weak User",
    email: "verify-weak@example.com",
    password: "short",
    role: "editor",
  },
});
record(
  "users api: weak passwords are rejected with the rule",
  weakUser.status === 400 &&
    JSON.stringify(weakUser.body?.issues ?? "").includes("10 characters"),
  JSON.stringify(weakUser.body?.issues),
);
const duplicateUser = await call("/api/admin/users", {
  method: "POST",
  cookie: ownerCookie,
  body: {
    name: "Duplicate",
    email: "verify-owner@example.com",
    password: "long-enough-pass-1",
    role: "editor",
  },
});
record(
  "users api: duplicate emails are rejected",
  duplicateUser.status === 400 &&
    JSON.stringify(duplicateUser.body?.issues ?? "").includes("already in use"),
  JSON.stringify(duplicateUser.body?.issues),
);
const createdUser = await call("/api/admin/users", {
  method: "POST",
  cookie: ownerCookie,
  body: {
    name: "Verify Created",
    email: "verify-created@example.com",
    password: "verify-created-pass-1",
    role: "sales",
  },
});
const createdUserId = createdUser.body?.data?.id;
record(
  "users api: owners create users",
  createdUser.status === 201 && createdUser.body?.data?.role === "sales",
  `status=${createdUser.status}`,
);
const updateCreatedRole = await call(`/api/admin/users/${createdUserId}`, {
  method: "PATCH",
  cookie: ownerCookie,
  body: { role: "editor" },
});
record(
  "users api: role changes apply",
  updateCreatedRole.status === 200 &&
    updateCreatedRole.body?.data?.role === "editor",
  `status=${updateCreatedRole.status}`,
);
const disableCreatedUser = await call(`/api/admin/users/${createdUserId}`, {
  method: "PATCH",
  cookie: ownerCookie,
  body: { status: "disabled" },
});
record(
  "users api: disabling applies immediately",
  disableCreatedUser.status === 200 &&
    disableCreatedUser.body?.data?.status === "disabled",
);
const disabledCreatedSignIn = await signInAs(
  "verify-created@example.com",
  "verify-created-pass-1",
);
record(
  "auth: a disabled account cannot sign in",
  disabledCreatedSignIn.status === 403,
  `status=${disabledCreatedSignIn.status}`,
);

/* Sign out invalidates the session. */
const signOutResult = await call("/api/auth/sign-out", {
  method: "POST",
  cookie: ownerCookie,
});
record(
  "auth: sign-out clears the session",
  signOutResult.status === 200 &&
    signOutResult.body?.data?.signedOut === true,
  `status=${signOutResult.status}`,
);
const sessionAfterSignOut = await call("/api/auth/session", {
  cookie: ownerCookie,
});
const adminAfterSignOut = await call("/api/admin/services", {
  cookie: ownerCookie,
});
record(
  "auth: the old cookie no longer works",
  sessionAfterSignOut.body?.data?.user === null &&
    adminAfterSignOut.status === 401,
  `session=${JSON.stringify(sessionAfterSignOut.body?.data?.user)} admin=${adminAfterSignOut.status}`,
);

/* Cleanup the verification accounts (sessions first). */
const authCleanup = new Database("data/ocassio.db");
authCleanup
  .query(
    "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'verify-%@example.com')",
  )
  .run();
authCleanup
  .query("DELETE FROM users WHERE email LIKE 'verify-%@example.com'")
  .run();
authCleanup.close();
const usersAfterCleanup = await call("/api/admin/users", {
  token: ADMIN_TOKEN,
});
record(
  "auth: fixtures clean up",
  !(usersAfterCleanup.body?.data ?? []).some((user) =>
    user.email.startsWith("verify-"),
  ),
);

/* Public project brief submission (§6.13) */
const { readdirSync } = await import("node:fs");
const attachmentDir = "data/uploads/inquiries";
const { rmSync } = await import("node:fs");

/* Pre-clean leftovers from any earlier interrupted run so the baseline
   is deterministic (runs BEFORE this suite creates its own rows). */
const preCleanDb = new Database("data/ocassio.db");
const staleRows = preCleanDb
  .query(
    "SELECT id, attachments FROM inquiries WHERE email LIKE 'verify-%@example.com'",
  )
  .all();
for (const row of staleRows) {
  const list = row.attachments ? JSON.parse(row.attachments) : [];
  for (const attachment of list) {
    rmSync(attachment.storageKey, { force: true });
  }
}
preCleanDb
  .query("DELETE FROM inquiries WHERE email LIKE 'verify-%@example.com'")
  .run();
preCleanDb.close();

const countAttachments = () => {
  try {
    return readdirSync(attachmentDir).length;
  } catch {
    return 0;
  }
};
const attachmentsBefore = countAttachments();

const briefPayload = {
  fullName: "Verify Client",
  email: "verify-submit@example.com",
  service: "Photography",
  projectType: "Photography",
  description: "A verification brief for the photography service, end to end.",
  desiredDate: "2027-02-01",
  location: "Jakarta",
  budgetRange: "To be discussed",
  referenceUrl: "https://example.com/moodboard",
};

const submitted = await call("/api/inquiries", {
  method: "POST",
  body: briefPayload,
});
record(
  "inquiries: a valid brief is accepted with stage NEW",
  submitted.status === 201 &&
    submitted.body?.data?.status === "new" &&
    submitted.body?.data?.id > 0 &&
    String(submitted.body?.data?.message).includes("brief has been received"),
  `status=${submitted.status}`,
);

const invalidBrief = await call("/api/inquiries", {
  method: "POST",
  body: { email: "nope" },
});
record(
  "inquiries: missing fields are reported field by field",
  invalidBrief.status === 400 &&
    Array.isArray(invalidBrief.body?.issues) &&
    invalidBrief.body.issues.some((issue) => issue.includes("full name")) &&
    invalidBrief.body.issues.some((issue) => issue.includes("valid email")) &&
    invalidBrief.body.issues.some((issue) => issue.includes("Describe")),
  JSON.stringify(invalidBrief.body?.issues),
);

const badService = await call("/api/inquiries", {
  method: "POST",
  body: { ...briefPayload, service: "Skydiving" },
});
record(
  "inquiries: unknown service names are rejected",
  badService.status === 400 &&
    JSON.stringify(badService.body?.issues ?? "").includes("Photography"),
  JSON.stringify(badService.body?.issues),
);

const badReference = await call("/api/inquiries", {
  method: "POST",
  body: { ...briefPayload, referenceUrl: "example.com" },
});
record(
  "inquiries: reference URLs must be full URLs",
  badReference.status === 400 &&
    JSON.stringify(badReference.body?.issues ?? "").includes("https://"),
  JSON.stringify(badReference.body?.issues),
);

const shortBrief = await call("/api/inquiries", {
  method: "POST",
  body: { ...briefPayload, description: "Too short" },
});
record(
  "inquiries: short descriptions are rejected with the fix",
  shortBrief.status === 400 &&
    JSON.stringify(shortBrief.body?.issues ?? "").includes("20 characters"),
  JSON.stringify(shortBrief.body?.issues),
);

const multipartForm = new FormData();
for (const [key, value] of Object.entries(briefPayload)) {
  multipartForm.append(key, value);
}
multipartForm.append(
  "attachment",
  new Blob([pixelPng], { type: "image/png" }),
  "moodboard.png",
);
const multipartSubmit = await upload("/api/inquiries", {
  token: undefined,
  form: multipartForm,
});
record(
  "inquiries: multipart submissions with attachments are accepted",
  multipartSubmit.status === 201 && multipartSubmit.body?.data?.id > 0,
  `status=${multipartSubmit.status}`,
);
record(
  "inquiries: the attachment reaches storage-only storage",
  countAttachments() === attachmentsBefore + 1,
  `before=${attachmentsBefore} after=${countAttachments()}`,
);

const oversizeForm = new FormData();
for (const [key, value] of Object.entries(briefPayload)) {
  oversizeForm.append(key, value);
}
oversizeForm.append(
  "attachment",
  new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)], { type: "application/pdf" }),
  "huge.pdf",
);
const oversizeSubmit = await upload("/api/inquiries", {
  token: undefined,
  form: oversizeForm,
});
record(
  "inquiries: attachments over 10 MB are rejected",
  oversizeSubmit.status === 400 &&
    String(oversizeSubmit.body?.error).includes("10 MB"),
  `status=${oversizeSubmit.status}`,
);
record(
  "inquiries: rejected uploads leave no files behind",
  countAttachments() === attachmentsBefore + 1,
);

const twoFilesForm = new FormData();
for (const [key, value] of Object.entries(briefPayload)) {
  twoFilesForm.append(key, value);
}
twoFilesForm.append(
  "attachment",
  new Blob([pixelPng], { type: "image/png" }),
  "one.png",
);
twoFilesForm.append(
  "attachment",
  new Blob([pixelPng], { type: "image/png" }),
  "two.png",
);
const twoFilesSubmit = await upload("/api/inquiries", {
  token: undefined,
  form: twoFilesForm,
});
record(
  "inquiries: more than one attachment is rejected",
  twoFilesSubmit.status === 400 &&
    String(twoFilesSubmit.body?.error).includes("one attachment"),
  `status=${twoFilesSubmit.status}`,
);

const spoofedForm = new FormData();
for (const [key, value] of Object.entries(briefPayload)) {
  spoofedForm.append(key, value);
}
spoofedForm.append(
  "attachment",
  new Blob([Buffer.from("not really a png")], { type: "image/png" }),
  "spoof.png",
);
const spoofedSubmit = await upload("/api/inquiries", {
  token: undefined,
  form: spoofedForm,
});
record(
  "inquiries: spoofed attachment types are rejected server-side",
  spoofedSubmit.status === 400 &&
    String(spoofedSubmit.body?.error).includes("does not match"),
  `status=${spoofedSubmit.status}`,
);
record(
  "inquiries: spoofed uploads leave no files behind",
  countAttachments() === attachmentsBefore + 1,
);

/* Admin business queue (§17) */
const queueNoAuth = await call("/api/admin/inquiries");
record(
  "admin queue: requires a token",
  queueNoAuth.status === 401,
  `status=${queueNoAuth.status}`,
);
const queueList = await call("/api/admin/inquiries", { token: ADMIN_TOKEN });
record(
  "admin queue: lists the submitted briefs newest first",
  queueList.status === 200 &&
    queueList.body?.data?.length >= 2 &&
    queueList.body.data[0].email === "verify-submit@example.com" &&
    queueList.body.data[0].status === "new",
  `total=${queueList.body?.meta?.total}`,
);
record(
  "admin queue: attachments expose metadata but never storage paths",
  queueList.body?.data?.[0]?.attachments?.length === 1 &&
    queueList.body.data[0].attachments[0].filename.includes("moodboard") &&
    queueList.body.data[0].attachments[0].storageKey === undefined,
  JSON.stringify(queueList.body?.data?.[0]?.attachments),
);

const queueNew = await call("/api/admin/inquiries?status=new", {
  token: ADMIN_TOKEN,
});
record(
  "admin queue: stage filter narrows the list",
  queueNew.status === 200 &&
    queueNew.body?.data?.length >= 2 &&
    queueNew.body.data.every((item) => item.status === "new"),
  `count=${queueNew.body?.data?.length}`,
);
const queueBooked = await call("/api/admin/inquiries?status=booked", {
  token: ADMIN_TOKEN,
});
record(
  "admin queue: empty stages return an empty list",
  queueBooked.status === 200 && queueBooked.body?.data?.length === 0,
);
const queueBadStatus = await call("/api/admin/inquiries?status=ghosted", {
  token: ADMIN_TOKEN,
});
record(
  "admin queue: unknown stages are a specific 400",
  queueBadStatus.status === 400 &&
    String(queueBadStatus.body?.error).includes("ghosted"),
  `status=${queueBadStatus.status}`,
);

const firstInquiryId = queueList.body?.data?.[0]?.id;
const stageUpdate = await call(`/api/admin/inquiries/${firstInquiryId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "reviewed" },
});
record(
  "admin queue: stage updates move the brief through the pipeline",
  stageUpdate.status === 200 &&
    stageUpdate.body?.data?.status === "reviewed",
  `status=${stageUpdate.status}`,
);
const badStage = await call(`/api/admin/inquiries/${firstInquiryId}`, {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "ghosted" },
});
record(
  "admin queue: invalid stages list the allowed values",
  badStage.status === 400 &&
    String(badStage.body?.error).includes("proposal_sent"),
  `status=${badStage.status}`,
);
const missingInquiry = await call("/api/admin/inquiries/999999", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "reviewed" },
});
record(
  "admin queue: updating a missing brief is a 404",
  missingInquiry.status === 404,
  `status=${missingInquiry.status}`,
);
const queueAfterUpdate = await call("/api/admin/inquiries?status=reviewed", {
  token: ADMIN_TOKEN,
});
record(
  "admin queue: the updated brief appears under its new stage",
  queueAfterUpdate.status === 200 &&
    queueAfterUpdate.body?.data?.some(
      (item) => item.id === firstInquiryId,
    ),
);

/* Public legal content */
const resetLegalDb = new Database("data/ocassio.db");
resetLegalDb
  .query(
    "UPDATE legal_pages SET status = 'published', publish_at = NULL WHERE slug IN ('privacy','terms')",
  )
  .run();
resetLegalDb.close();

const privacyApi = await get("/api/legal/privacy");
record(
  "api legal: privacy returns published content with blocks",
  privacyApi.status === 200 &&
    privacyApi.body?.data?.title === "Privacy Policy" &&
    privacyApi.body?.data?.blocks?.length >= 10 &&
    privacyApi.body.data.blocks[0].type === "paragraph" &&
    privacyApi.body.data.blocks[1].type === "heading",
  `blocks=${privacyApi.body?.data?.blocks?.length}`,
);
const termsApi = await get("/api/legal/terms");
record(
  "api legal: terms returns published content",
  termsApi.status === 200 && termsApi.body?.data?.title === "Terms of Use",
  `status=${termsApi.status}`,
);
const unknownLegal = await get("/api/legal/cookies");
record(
  "api legal: unknown slugs are a specific 404",
  unknownLegal.status === 404 &&
    String(unknownLegal.body?.error).includes("cookies"),
  `status=${unknownLegal.status}`,
);

/* Admin legal CRUD */
const adminLegalNoAuth = await call("/api/admin/legal");
record(
  "admin legal: requires a token",
  adminLegalNoAuth.status === 401,
  `status=${adminLegalNoAuth.status}`,
);
const adminLegalList = await call("/api/admin/legal", { token: ADMIN_TOKEN });
record(
  "admin legal: lists both pages with their blocks",
  adminLegalList.status === 200 &&
    adminLegalList.body?.data?.length === 2 &&
    Array.isArray(adminLegalList.body.data[0].body),
  `total=${adminLegalList.body?.meta?.total}`,
);

const privacyOriginal = adminLegalList.body.data.find(
  (page) => page.slug === "privacy",
);

const publishDraft = await call("/api/admin/legal/privacy", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { status: "draft" },
});
record(
  "admin legal: status updates apply",
  publishDraft.status === 200 &&
    publishDraft.body?.data?.status === "draft",
  `status=${publishDraft.status}`,
);
const publicWhileDraft = await get("/api/legal/privacy");
record(
  "admin legal: drafts disappear from the public API immediately",
  publicWhileDraft.status === 404,
  `status=${publicWhileDraft.status}`,
);

const badBlock = await call("/api/admin/legal/privacy", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { body: [{ type: "sparkle", text: "nope" }] },
});
record(
  "admin legal: unknown block types are rejected",
  badBlock.status === 400 &&
    JSON.stringify(badBlock.body?.issues ?? "").includes("heading"),
  JSON.stringify(badBlock.body?.issues),
);
const emptyPatch = await call("/api/admin/legal/privacy", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {},
});
record(
  "admin legal: empty updates are rejected",
  emptyPatch.status === 400 &&
    JSON.stringify(emptyPatch.body?.issues ?? "").includes("at least one"),
  JSON.stringify(emptyPatch.body?.issues),
);
const missingLegal = await call("/api/admin/legal/cookies", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { title: "Cookie Policy" },
});
record(
  "admin legal: unknown slugs are a 404",
  missingLegal.status === 404,
  `status=${missingLegal.status}`,
);

const restored = await call("/api/admin/legal/privacy", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    title: privacyOriginal.title,
    body: privacyOriginal.body,
    updatedDate: privacyOriginal.updatedDate,
    status: privacyOriginal.status,
  },
});
record(
  "admin legal: the verification edit is restored",
  restored.status === 200 && restored.body?.data?.status === "published",
  `status=${restored.status}`,
);
const publicRestored = await get("/api/legal/privacy");
record(
  "admin legal: the public API serves the restored page again",
  publicRestored.status === 200 &&
    publicRestored.body?.data?.title === "Privacy Policy",
  `status=${publicRestored.status}`,
);

/* Legal publish workflow */
const badAction = await call("/api/admin/legal/privacy/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "explode" },
});
record(
  "legal workflow: unknown actions are rejected with the list",
  badAction.status === 400 &&
    JSON.stringify(badAction.body?.issues ?? "").includes("publish"),
  JSON.stringify(badAction.body?.issues),
);
const schedulePast = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "schedule", publishAt: "2020-01-01T00:00:00.000Z" },
});
record(
  "legal workflow: scheduling in the past is rejected",
  schedulePast.status === 400 &&
    JSON.stringify(schedulePast.body?.issues ?? "").includes("future"),
  JSON.stringify(schedulePast.body?.issues),
);
const gateFailure = await call("/api/admin/legal/terms", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: { body: [{ type: "heading", text: "Only a heading" }] },
});
const gatePublish = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
record(
  "legal workflow: the publish gate demands a paragraph block",
  gateFailure.status === 200 &&
    gatePublish.status === 422 &&
    JSON.stringify(gatePublish.body?.issues ?? "").includes(
      "paragraph block is required",
    ),
  `status=${gatePublish.status}`,
);

const termsOriginal = adminLegalList.body.data.find(
  (page) => page.slug === "terms",
);
await call("/api/admin/legal/terms", {
  method: "PATCH",
  token: ADMIN_TOKEN,
  body: {
    title: termsOriginal.title,
    body: termsOriginal.body,
    updatedDate: termsOriginal.updatedDate,
  },
});

const unpublish = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "unpublish" },
});
record(
  "legal workflow: unpublish returns the page to draft",
  unpublish.status === 200 && unpublish.body?.data?.status === "draft",
  `status=${unpublish.body?.data?.status}`,
);
const publicWhileUnpublished = await get("/api/legal/terms");
record(
  "legal workflow: unpublished pages disappear publicly",
  publicWhileUnpublished.status === 404,
);
const republish = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
record(
  "legal workflow: publish restores the public page",
  republish.status === 200 &&
    republish.body?.data?.status === "published" &&
    (await get("/api/legal/terms")).status === 200,
  `status=${republish.body?.data?.status}`,
);

const scheduleFuture = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "schedule", publishAt: "2999-01-01T00:00:00.000Z" },
});
record(
  "legal workflow: scheduling stores the future timestamp",
  scheduleFuture.status === 200 &&
    scheduleFuture.body?.data?.status === "scheduled" &&
    scheduleFuture.body.data.publishAt.startsWith("2999"),
  `status=${scheduleFuture.body?.data?.status}`,
);
const publicWhileScheduled = await get("/api/legal/terms");
record(
  "legal workflow: future-scheduled pages stay hidden",
  publicWhileScheduled.status === 404,
);

/* Force the schedule due, then confirm the lazy auto-publish. */
const flipDb = new Database("data/ocassio.db");
flipDb
  .query(
    "UPDATE legal_pages SET publish_at = ? WHERE slug = 'terms'",
  )
  .run("2020-01-01T00:00:00.000Z");
flipDb.close();
const autoPublished = await get("/api/legal/terms");
record(
  "legal workflow: due schedules auto-publish on first read",
  autoPublished.status === 200 &&
    autoPublished.body?.data?.title === "Terms of Use",
  `status=${autoPublished.status}`,
);
const statusAfterAuto = await call("/api/admin/legal", { token: ADMIN_TOKEN });
const termsRow = statusAfterAuto.body?.data?.find(
  (page) => page.slug === "terms",
);
record(
  "legal workflow: the auto-published status is persisted",
  termsRow?.status === "published",
  `status=${termsRow?.status}`,
);

const archivedTerms = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "archive" },
});
const termsAfterArchive = await get("/api/legal/terms");
const republishedTerms = await call("/api/admin/legal/terms/actions", {
  method: "POST",
  token: ADMIN_TOKEN,
  body: { action: "publish" },
});
record(
  "delete flow: archiving parks a legal page, publishing restores it",
  archivedTerms.status === 200 &&
    archivedTerms.body?.data?.status === "archived" &&
    termsAfterArchive.status === 404 &&
    republishedTerms.status === 200 &&
    republishedTerms.body?.data?.status === "published",
  `status=${archivedTerms.status}`,
);

/* Cleanup verification inquiries so the dev database stays clean. */
const cleanupDb = new Database("data/ocassio.db");
const verifyRows = cleanupDb
  .query(
    "SELECT id, attachments FROM inquiries WHERE email LIKE 'verify-%@example.com'",
  )
  .all();
for (const row of verifyRows) {
  const list = row.attachments ? JSON.parse(row.attachments) : [];
  for (const attachment of list) {
    rmSync(attachment.storageKey, { force: true });
  }
}
cleanupDb
  .query("DELETE FROM inquiries WHERE email LIKE 'verify-%@example.com'")
  .run();
cleanupDb.close();
record(
  "cleanup: verification inquiries and attachments removed",
  verifyRows.length >= 2 && countAttachments() === attachmentsBefore,
  `rows=${verifyRows.length} files=${countAttachments()}`,
);

const failed = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    { passed: results.length - failed.length, failed: failed.length, results },
    null,
    2,
  ),
);
if (failed.length > 0) process.exit(1);
