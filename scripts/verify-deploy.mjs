/**
 * Production verification against a deployed URL:
 *  1. public pages respond and media loads from the Blob store
 *  2. a temporary owner can sign in (session path)
 *  3. realtime: an admin edit shows on the public page immediately
 *  4. everything is reverted and the temporary owner is removed
 *
 * Usage:
 *   BASE_URL=https://ocassio-project.vercel.app bun scripts/verify-deploy.mjs
 * (TURSO env comes from .env.local for the direct database setup/cleanup.)
 */
import { createClient } from "@libsql/client";
import { hash as argonHash } from "@node-rs/argon2";
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "https://ocassio-project.vercel.app";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const EMAIL = "deploy-verify@example.com";
const PASSWORD = "deploy-verify-password-1";
const SECTION = "showreel";
const SECTION_MARKER = `data-section="${SECTION}"`;

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const results = [];
const record = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(ok ? "PASS" : "FAIL", "|", name, detail ? `| ${detail}` : "");
};

// ---------------------------------------------------------------- setup
await db.execute({
  sql: "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
  args: [EMAIL],
});
await db.execute({ sql: "DELETE FROM users WHERE email = ?", args: [EMAIL] });
const passwordHash = await argonHash(PASSWORD);
await db.execute({
  sql: "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'owner', 'active')",
  args: ["Deploy Verify", EMAIL, passwordHash],
});

// ---------------------------------------------------------------- public checks
const home = await fetch(`${BASE}/`);
const homeHtml = await home.text();
record("deploy: home responds 200", home.status === 200, `status=${home.status}`);
record(
  "deploy: homepage renders real content",
  homeHtml.includes("Digital creative studio for photography and film"),
  `bytes=${homeHtml.length}`,
);
const blobHost = homeHtml.match(
  /https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com/,
)?.[0];
record("deploy: media is served from the Blob store", Boolean(blobHost), blobHost ?? "no blob URL");

const workHtml = await fetch(`${BASE}/work`).then((r) => r.text());
record(
  "deploy: /work lists the real projects",
  workHtml.includes("Dean &amp; Deb") && workHtml.includes("Sunday School"),
);

const detail = await fetch(`${BASE}/work/dean-and-deb`);
const detailHtml = await detail.text();
record(
  "deploy: project detail responds 200 with its gallery",
  detail.status === 200 && detailHtml.includes('data-gallery-item'),
  `status=${detail.status}`,
);

const sitemap = await fetch(`${BASE}/sitemap.xml`);
const sitemapText = await sitemap.text();
record(
  "deploy: sitemap lists project pages",
  sitemap.status === 200 && sitemapText.includes("/work/dean-and-deb"),
  `status=${sitemap.status}`,
);

// ------------------------------------------------- browser: sign-in + realtime
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await page.goto(`${BASE}/admin/sign-in`, { waitUntil: "load" });
await page.fill("#sign-in-email", EMAIL);
await page.fill("#sign-in-password", PASSWORD);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForTimeout(3500);
record(
  "deploy: admin sign-in works on the deployed site",
  page.url().includes("/admin") && !page.url().includes("sign-in"),
  page.url(),
);

const cookie = (await page.context().cookies()).find(
  (entry) => entry.name === "ocassio_admin_session",
);
const authHeaders = {
  "Content-Type": "application/json",
  Cookie: `ocassio_admin_session=${cookie?.value ?? ""}`,
};
const adminSections = await fetch(`${BASE}/api/admin/homepage-sections`, {
  headers: authHeaders,
}).then((r) => r.json());
const original = adminSections.data ?? [];
const order = original.map((entry) => entry.key);
const target = original.find((entry) => entry.key === SECTION);
record(
  "deploy: the admin API lists homepage sections",
  Array.isArray(original) && order.length > 5 && Boolean(target),
  `sections=${order.length}`,
);

const publicBefore = await fetch(`${BASE}/`).then((r) => r.text());
const beforeShown = publicBefore.includes(SECTION_MARKER);

const toSections = (visible) =>
  original.map((entry) => ({
    key: entry.key,
    visible: entry.key === SECTION ? visible : entry.visible,
  }));

const flip = await fetch(`${BASE}/api/admin/homepage-sections`, {
  method: "PUT",
  headers: authHeaders,
  body: JSON.stringify({ order, sections: toSections(!target.visible) }),
});
record(
  "deploy: admin can change a section visibility",
  flip.status === 200,
  `status=${flip.status}`,
);

await new Promise((resolve) => setTimeout(resolve, 300));
const publicAfter = await fetch(`${BASE}/`).then((r) => r.text());
const afterShown = publicAfter.includes(SECTION_MARKER);
record(
  "realtime: the public homepage reflects the admin change immediately",
  afterShown !== beforeShown,
  `before=${beforeShown} after=${afterShown}`,
);

const restore = await fetch(`${BASE}/api/admin/homepage-sections`, {
  method: "PUT",
  headers: authHeaders,
  body: JSON.stringify({ order, sections: toSections(target.visible) }),
});
await new Promise((resolve) => setTimeout(resolve, 300));
const publicRestored = await fetch(`${BASE}/`).then((r) => r.text());
record(
  "realtime: restoring the section restores the homepage",
  restore.status === 200 && publicRestored.includes(SECTION_MARKER) === beforeShown,
  `status=${restore.status}`,
);

await browser.close();

// ---------------------------------------------------------------- cleanup
await db.execute({
  sql: "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = ?)",
  args: [EMAIL],
});
await db.execute({ sql: "DELETE FROM users WHERE email = ?", args: [EMAIL] });
const leftover = await db.execute({
  sql: "SELECT COUNT(*) AS n FROM users WHERE email = ?",
  args: [EMAIL],
});
record(
  "cleanup: the temporary owner is removed",
  Number(leftover.rows[0]?.n ?? 1) === 0,
);

db.close();

const failed = results.filter((r) => !r.ok);
console.log(`\nsummary: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length > 0 ? 1 : 0);
