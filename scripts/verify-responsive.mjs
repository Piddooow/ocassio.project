/**
 * Responsive sweep across devices (studio request): every public route
 * is loaded at phone (390, 414), tablet (768, 834), laptop (1024,
 * 1280), and desktop (1440, 1920) widths and checked for a 200
 * response, no horizontal overflow, a rendered heading, the global
 * extras (theme toggle, floating backdrop), the new interactive
 * components, and console/page errors.
 *
 * Usage: bun scripts/verify-responsive.mjs  (or: bun run verify:responsive)
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const VIEWPORTS = [
  { name: "phone-390", width: 390, height: 844 },
  { name: "phone-414", width: 414, height: 896 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-834", width: 834, height: 1112 },
  { name: "laptop-1024", width: 1024, height: 768 },
  { name: "laptop-1280", width: 1280, height: 800 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1920", width: 1920, height: 1080 },
];

const ROUTES = [
  "/",
  "/work",
  "/work/dean-and-deb",
  "/work/tere-and-chris",
  "/services",
  "/services/photography",
  "/pricing",
  "/process",
  "/about",
  "/journal",
  "/journal/life-untolds-in-monochrome",
  "/now",
  "/contact",
  "/start-project",
  "/privacy",
  "/terms",
];

const EXTRA_CHECKS = {
  "/services": async (page) =>
    (await page.locator("[data-category-item]").count()) === 7,
  "/": async (page) =>
    (await page
      .locator('[data-section="reviews"] [data-review-card]')
      .count()) === 4,
  "/work/dean-and-deb": async (page) =>
    (await page.locator("[data-like-button]").count()) === 1 &&
    (await page.locator("[data-review-card]").count()) >= 1,
};

const results = [];
const errors = [];
const record = (name, ok, detail = "") =>
  results.push({ name, ok: Boolean(ok), detail });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.width < 768,
    hasTouch: viewport.width < 768,
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`[console:${viewport.name}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror:${viewport.name}] ${err.message}`);
  });

  const startedAt = Date.now();
  for (const route of ROUTES) {
    const response = await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(350);
    const status = response?.status() ?? 0;
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    // Headings below the fold stay behind the GSAP reveal until scrolled
    // (by design), so the sweep checks presence rather than visibility.
    const headingCount = await page.locator("main :is(h1, h2)").count();
    const toggle = await page.locator("[data-theme-toggle]").count();
    const backdrop = await page.locator("[data-floating-paths]").count();
    record(
      `${viewport.name} ${route}: 200, no overflow, heading, toggle, backdrop`,
      status === 200 &&
        !overflow &&
        headingCount >= 1 &&
        toggle >= 1 &&
        backdrop === 1,
      `status=${status} overflow=${overflow} headings=${headingCount} toggle=${toggle} backdrop=${backdrop}`,
    );

    const extra = EXTRA_CHECKS[route];
    if (extra) {
      record(
        `${viewport.name} ${route}: interactive components intact`,
        await extra(page),
      );
    }
  }
  await context.close();
  console.log(
    `swept ${viewport.name} in ${Math.round((Date.now() - startedAt) / 1000)}s`,
  );
}

await browser.close();

const failed = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    {
      passed: results.length - failed.length,
      failed: failed.length,
      errors,
      results,
    },
    null,
    2,
  ),
);

if (failed.length > 0 || errors.length > 0) {
  process.exit(1);
}
