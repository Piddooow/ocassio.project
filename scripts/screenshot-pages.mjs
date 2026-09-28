/**
 * Design-QA screenshots for local review.
 * Usage: bun scripts/screenshot-pages.mjs [route] [outDir]
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const route = process.argv[2] ?? "/work";
const outDir = process.argv[3] ?? "/tmp/ocassio-shots";

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

const desktop = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await desktop.newPage();
await page.goto(`${BASE}${route}`, { waitUntil: "load" });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${outDir}/desktop-hero.png` });

await page.evaluate(() => window.scrollTo(0, 760));
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outDir}/desktop-grid.png` });

const firstCard = page.locator("[data-work-card]").first();
if ((await firstCard.count()) > 0) {
  await firstCard.hover();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${outDir}/desktop-hover.png` });
}

const gallery = page.locator('[data-section="gallery"] [data-masonry]').first();
if ((await gallery.count()) > 0) {
  await gallery.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${outDir}/desktop-gallery-masonry.png` });
  const firstTile = page
    .locator('[data-section="gallery"] [data-gallery-item]')
    .first();
  if ((await firstTile.count()) > 0) {
    await firstTile.hover();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${outDir}/desktop-gallery-reveal.png` });
    await firstTile.click();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${outDir}/desktop-viewer.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  }
}

await page.evaluate(() =>
  window.scrollTo(0, document.body.scrollHeight - 1600),
);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outDir}/desktop-cta-footer.png` });
await desktop.close();

const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const mpage = await mobile.newPage();
await mpage.goto(`${BASE}${route}`, { waitUntil: "load" });
await mpage.waitForTimeout(1600);
await mpage.screenshot({ path: `${outDir}/mobile-hero.png` });
await mpage.evaluate(() => window.scrollTo(0, 700));
await mpage.waitForTimeout(1000);
await mpage.screenshot({ path: `${outDir}/mobile-grid.png` });
await mpage.getByRole("button", { name: "Menu" }).click();
await mpage.waitForTimeout(800);
await mpage.screenshot({ path: `${outDir}/mobile-menu.png` });
await mobile.close();

await browser.close();
console.log(`Screenshots written to ${outDir}`);
