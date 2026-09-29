/**
 * Full frontend verification against the real content (no backend).
 * Drives the local dev server with system Chrome via playwright-core.
 *
 * Coverage:
 *  - Home: section order + theme map, real hero media
 *  - Work: filters, empty category state, keyboard, deep links, masonry
 *  - Project detail: masonry gallery + viewer, film list + theater, per-project
 *    media completeness audit against media-manifest.json
 *  - Journal: feed, paging, categories, empty category, article page, 404s
 *  - Now: honest empty state
 *  - Services / Pricing / Process / About / Contact: structure + no dead links
 *  - Start a Project: validation, attachment, success + resubmit guard
 *  - Legal: privacy/terms + footer, Admin: homepage panel + legal editor
 *  - Seam: a CMS About save reaches the public page, then the baseline is restored
 *  - Transitions: the 1.4s navigation loader with the theme-correct brand
 *    lockup that clears only after the new page commits, the theme-toggle
 *    trigger, the kinetic menu on every breakpoint, and the media
 *    skeletons while photos load
 *  - Brand logo variants, reduced motion, mobile, console/page errors
 *
 * Usage: bun scripts/verify-frontend.mjs
 */
import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";
import { CONTACT_CHANNELS, GLOBAL_SETTINGS } from "../src/lib/site.ts";
import { SERVICES } from "../src/lib/content/services.ts";
import {
  PRICE_TYPE_LABEL,
  PRICING,
  validatePricingEntry,
} from "../src/lib/content/pricing.ts";
import { PROCESS_STEPS } from "../src/lib/content/process.ts";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const manifest = JSON.parse(
  readFileSync("src/lib/content/media-manifest.json", "utf8"),
);
const mediaBySlug = new Map(
  manifest.projects.map((project) => [project.slug, project]),
);

const results = [];
const errors = [];

/** URLs whose 4xx/5xx responses are intentionally simulated by tests. */
const expectedFailureUrls = new Set();

const EXPECTED_404_ROUTES = [
  "/nope",
  "/work/unknown-project",
  "/services/does-not-exist",
  "/journal/does-not-exist",
];

function isExpected404(url) {
  return EXPECTED_404_ROUTES.some((route) => url.endsWith(route));
}

function record(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

function wire(page, tag) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const url = msg.location()?.url ?? "";
      if (isExpected404(url) || expectedFailureUrls.has(url)) return;
      errors.push(`[console${tag}] ${msg.text()} @ ${url}`);
    }
  });
  page.on("pageerror", (err) => {
    errors.push(`[pageerror${tag}] ${err.message}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !isExpected404(url) && !expectedFailureUrls.has(url)) {
      errors.push(`[http${tag}] ${status} ${url}`);
    }
  });
}

/* ================= Desktop ================= */
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  wire(page, "");

  /* ---------------- Home ---------------- */
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForTimeout(2000);
  record("home: heading rendered", await page.locator("h1").first().isVisible());
  record(
    "settings: default SEO title comes from Global Settings",
    (await page.title()) === GLOBAL_SETTINGS.defaultSeo.title,
    await page.title(),
  );
  record(
    "settings: footer tagline comes from Global Settings",
    await page
      .locator("footer")
      .getByText(GLOBAL_SETTINGS.tagline, { exact: true })
      .isVisible(),
  );

  const sections = await page
    .locator("[data-section]")
    .evaluateAll((elements) =>
      elements.map((element) => ({
        key: element.getAttribute("data-section"),
        theme:
          element.getAttribute("data-theme") ??
          element.closest("[data-theme]")?.getAttribute("data-theme") ??
          null,
      })),
    );
  const expectedOrder = [
    "hero",
    "selected-work",
    "introduction",
    "featured-project",
    "services",
    "showreel",
    "process",
    "journal",
    "reviews",
    "cta",
  ];
  record(
    "home: sections in documented order (clients/currently omitted, no data)",
    JSON.stringify(sections.map((section) => section.key)) ===
      JSON.stringify(expectedOrder),
    sections.map((section) => section.key).join(","),
  );
  const globalThemes = sections.map((section) => section.theme);
  record(
    "home: every section inherits the global dark theme (no per-section forcing)",
    globalThemes.every((theme) => theme === "dark"),
    globalThemes.join(","),
  );
  record(
    "home: selected work renders as a masonry grid",
    (await page
      .locator('[data-section="selected-work"] [data-masonry-item]')
      .count()) === 4 &&
      (await page.locator('[data-section="selected-work"] [data-work-card]').count()) ===
        4,
  );

  let heroPhotoLoaded = false;
  try {
    const heroImage = page.locator('[data-section="hero"] img').first();
    await heroImage.waitFor({ state: "attached", timeout: 20000 });
    heroPhotoLoaded = await heroImage.evaluate(
      (img) => img.complete && img.naturalWidth > 0,
    );
  } catch {
    heroPhotoLoaded = false;
  }
  record("home: hero shows a real photograph", heroPhotoLoaded);
  record(
    "home: the hero uses the studio hero photograph",
    (((await page
      .locator('[data-section="hero"] img')
      .first()
      .getAttribute("src")) ?? "").includes("/media/studio/hero-1@")),
  );
  record(
    "media: the hero photograph carries the bottom-up theme fade",
    (await page.locator('[data-section="hero"] [data-media-fade]').count()) >=
      1,
  );
  record(
    "home: hero media rests monochrome and is never a control",
    (await page
      .locator("[data-hero-media] img")
      .first()
      .evaluate((img) => getComputedStyle(img).filter)) === "grayscale(1)" &&
      (await page.locator("[data-hero-media] a, [data-hero-media] button").count()) ===
        0,
  );
  await page.locator("[data-hero-media] .media-guard").first().hover();
  await page.waitForTimeout(700);
  record(
    "home: hovering the hero hands the photograph its color back",
    (await page
      .locator("[data-hero-media] img")
      .first()
      .evaluate((img) => getComputedStyle(img).filter)) === "grayscale(0)",
  );
  await page.mouse.move(10, 10);
  await page.locator('[data-section="featured-project"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const featuredLayout = await page.evaluate(() => {
    const label = [...document.querySelectorAll("p")].find(
      (entry) => entry.textContent?.trim() === "Featured Project",
    );
    const frame = document.querySelector(
      '[data-section="featured-project"] .media-guard',
    );
    const fade = frame?.querySelector("[data-media-fade]");
    return {
      labelWidth: label ? Math.round(label.getBoundingClientRect().width) : 0,
      mediaWidth: frame ? Math.round(frame.getBoundingClientRect().width) : 0,
      viewport: window.innerWidth,
      fadeRatio:
        fade && frame
          ? Math.round(
              (fade.getBoundingClientRect().height /
                frame.getBoundingClientRect().height) *
                100,
            ) / 100
          : 0,
    };
  });
  record(
    "home: featured media sits at the content width, not the viewport",
    featuredLayout.mediaWidth > 0 &&
      featuredLayout.mediaWidth === featuredLayout.labelWidth &&
      featuredLayout.mediaWidth < featuredLayout.viewport,
    JSON.stringify(featuredLayout),
  );
  record(
    "media: the gradient reaches 72% of the frame",
    featuredLayout.fadeRatio === 0.72,
    `ratio=${featuredLayout.fadeRatio}`,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  record(
    "background: the floating paths render fixed behind the site at 66% opacity",
    (await page.locator("[data-floating-paths]").count()) === 1 &&
      (await page
        .locator("[data-floating-paths]")
        .evaluate((node) => getComputedStyle(node).opacity)) === "0.66" &&
      (await page
        .locator("[data-floating-paths]")
        .evaluate((node) => getComputedStyle(node).pointerEvents)) === "none",
  );

  const homeLinksText = (await page.locator("main").textContent()) ?? "";
  record(
    "home: no fabricated client or recognition content",
    !homeLinksText.includes("Nara Foundation") &&
      !homeLinksText.includes("Kanva") &&
      !homeLinksText.includes("SeaFilm"),
  );
  record(
    "home: the reviews section carries four client notes",
    (await page
      .locator('[data-section="reviews"] [data-review-card]')
      .count()) === 4,
  );
  {
    const confetti = page
      .locator('[data-section="cta"] [data-confetti-button]')
      .first();
    await confetti.scrollIntoViewIfNeeded();
    await confetti.locator("button").click();
    await page.waitForTimeout(200);
    const confettiLabel =
      (await page
        .locator('[data-section="cta"] [data-confetti-button] button')
        .textContent()) ?? "";
    record(
      "home: the closing CTA fires confetti and flips to Celebrated",
      (await page.locator("[data-confetti-canvas]").count()) === 1 &&
        confettiLabel.includes("Celebrated"),
      confettiLabel,
    );
    await page.waitForTimeout(3600);
    record(
      "home: the confetti canvas cleans itself up",
      (await page.locator("[data-confetti-canvas]").count()) === 0,
    );
  }

  record(
    "nav: Now stays out of the primary navigation",
    (await page.locator('nav[aria-label="Primary"] a[href="/now"]').count()) ===
      0,
  );
  record(
    "home: footer carries the Now link",
    (await page.locator('footer a[href="/now"]').count()) === 1,
  );

  /* Work dropdown (studio request): sitemap children under the Work item. */
  await page.locator("[data-nav-dropdown]").hover();
  await page.waitForTimeout(450);
  record(
    "nav: hovering Work opens the sitemap dropdown",
    (await page.locator("[data-nav-dropdown-panel]").isVisible()) &&
      (await page.locator("[data-nav-dropdown-item]").count()) === 3 &&
      (await page
        .locator('[data-nav-dropdown-item][href="/work?filter=Photography"]')
        .count()) === 1 &&
      (await page
        .locator('[data-nav-dropdown-item][href="/work?filter=Film"]')
        .count()) === 1,
    `items=${await page.locator("[data-nav-dropdown-item]").count()}`,
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  record(
    "nav: Escape closes the Work dropdown",
    (await page.locator("[data-nav-dropdown-panel]").count()) === 0,
  );

  /* Footer (studio request): rotating avatars, contact copy, theme toggle. */
  await page.locator("footer").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  const footerAvatars = page.locator("footer [data-avatar-stack]");
  const avatarLeadBefore = await footerAvatars.getAttribute("data-lead-id");
  await page.waitForTimeout(3200);
  const avatarLeadAfter = await footerAvatars.getAttribute("data-lead-id");
  record(
    "footer: the avatar strip rotates through its photos",
    (await footerAvatars.count()) === 1 &&
      avatarLeadBefore !== avatarLeadAfter,
    `${avatarLeadBefore} -> ${avatarLeadAfter}`,
  );
  // The exit card stays in the DOM for ~0.6s after each rotation beat.
  // Hovering pauses the rotation, so the strip settles at exactly four.
  const avatarSpread = () =>
    page.evaluate(() => {
      const values = [
        ...document.querySelectorAll("footer [data-avatar-stack] > div"),
      ].map((slot) => {
        const match = /translateX\((-?[\d.]+)px\)/.exec(slot.style.transform);
        return match ? Math.abs(Number(match[1])) : 0;
      });
      return Math.max(0, ...values);
    });
  await page.mouse.move(10, 10);
  await page.waitForTimeout(400);
  const avatarClosedSpread = await avatarSpread();
  const avatarStackBox = await footerAvatars.boundingBox();
  await page.mouse.move(
    avatarStackBox.x + 10,
    avatarStackBox.y + avatarStackBox.height / 2,
  );
  const avatarLeadPaused = await footerAvatars.getAttribute("data-lead-id");
  // Count portraits that are actually on screen: a card mid-exit keeps a
  // fading node in the DOM for a moment.
  const avatarVisibleCount = () =>
    page.evaluate(
      () =>
        [...document.querySelectorAll("footer [data-avatar-stack] > div")]
          .filter((slot) => Number(slot.style.opacity || "1") > 0.01).length,
    );
  let avatarSettled = 0;
  for (let attempt = 0; attempt < 14; attempt++) {
    await page.waitForTimeout(250);
    avatarSettled = await avatarVisibleCount();
    if (avatarSettled === 4 && attempt >= 3) break;
  }
  const avatarFannedSpread = await avatarSpread();
  const avatarLeadStill = await footerAvatars.getAttribute("data-lead-id");
  record(
    "footer: the strip shows four anonymous portraits",
    avatarSettled === 4 &&
      ((await page
        .locator("footer [data-avatar-tooltip]")
        .first()
        .textContent()) ?? "").trim() === "Anonim",
    `items=${avatarSettled}`,
  );
  record(
    "footer: hovering fans the strip and pauses the rotation",
    avatarClosedSpread === 45 &&
      avatarFannedSpread === 75 &&
      avatarLeadPaused === avatarLeadStill,
    `${avatarClosedSpread} -> ${avatarFannedSpread}, lead ${avatarLeadPaused} -> ${avatarLeadStill}`,
  );
  await page.mouse.move(10, 10);
  record(
    "footer: the contact copy and theme controls render",
    (await page.locator("footer [data-copy-email]").count()) === 1 &&
      (await page.locator("footer [data-theme-toggle]").count()) === 1,
  );

  /* Kinetic menu on desktop: right drawer over a scrim (reference style). */
  await page.locator("[data-menu-trigger]").click();
  await page.waitForTimeout(1100);
  record(
    "nav: the kinetic menu opens on desktop with every primary link",
    (await page.locator("#mobile-menu [data-menu-link]").count()) === 6 &&
      (await page
        .locator("[data-menu-trigger]")
        .getAttribute("aria-expanded")) === "true",
  );
  record(
    "nav: the drawer carries the Work children as a quiet sub-list",
    (await page.locator("#mobile-menu [data-menu-sublink]").count()) === 3 &&
      (await page
        .locator('#mobile-menu [data-menu-sublink][href="/work?filter=Film"]')
        .count()) === 1,
  );
  const triggerRoller = await page.evaluate(() => {
    const wrapper = document.querySelector(
      "[data-menu-trigger] > span[aria-hidden]",
    );
    const windowRect = wrapper?.getBoundingClientRect();
    const lines = [...(wrapper?.firstElementChild?.children ?? [])].map(
      (line) => {
        const rect = line.getBoundingClientRect();
        return { text: line.textContent, top: rect.top, bottom: rect.bottom };
      },
    );
    const inside = (text) => {
      const line = lines.find((entry) => entry.text === text);
      return Boolean(
        line &&
          windowRect &&
          line.top >= windowRect.top - 1 &&
          line.bottom <= windowRect.bottom + 1,
      );
    };
    return { closeInside: inside("Close"), menuInside: inside("Menu") };
  });
  record(
    "nav: the trigger rolls to a visible Close label while open",
    triggerRoller.closeInside === true && triggerRoller.menuInside === false,
    JSON.stringify(triggerRoller),
  );
  const drawer = await page.evaluate(() => {
    const panel = document.querySelector("#mobile-menu");
    const rect = panel?.getBoundingClientRect();
    const scroll = document.querySelector("[data-menu-scroll]");
    return {
      width: rect ? Math.round(rect.width) : null,
      viewport: window.innerWidth,
      scrim: document.querySelectorAll("[data-menu-scrim]").length,
      indexes: [...document.querySelectorAll("[data-menu-index]")].map((el) =>
        el.textContent.trim(),
      ),
      scrollable: scroll ? getComputedStyle(scroll).overflowY : null,
    };
  });
  record(
    "nav: the menu is a right drawer with numbered links over a scrim",
    drawer.width !== null &&
      drawer.width < drawer.viewport &&
      drawer.scrim === 1 &&
      JSON.stringify(drawer.indexes) ===
        JSON.stringify(["01", "02", "03", "04", "05", "06"]) &&
      drawer.scrollable === "auto",
    JSON.stringify(drawer),
  );
  const drawerNavbar = await page.evaluate(() => {
    const trigger = document.querySelector("[data-menu-trigger]");
    const rect = trigger.getBoundingClientRect();
    const hit = document.elementFromPoint(
      rect.x + rect.width / 2,
      rect.y + rect.height / 2,
    );
    const header = document.querySelector("header");
    const overlay = document.querySelector("#mobile-menu").parentElement;
    return {
      hitIsTrigger: hit === trigger || trigger.contains(hit),
      headerZ: getComputedStyle(header).zIndex,
      overlayTop: getComputedStyle(overlay).top,
    };
  });
  record(
    "nav: the navbar stays crisp above the open drawer",
    drawerNavbar.hitIsTrigger &&
      drawerNavbar.headerZ === "50" &&
      drawerNavbar.overlayTop === "64px",
    JSON.stringify(drawerNavbar),
  );
  const underlineBefore = await page.evaluate(
    () =>
      getComputedStyle(
        document.querySelector('a[href="/services"] [data-menu-underline]'),
      ).transform,
  );
  const servicesBox = await page
    .locator('#mobile-menu a[href="/services"]')
    .boundingBox();
  await page.mouse.move(
    servicesBox.x + servicesBox.width / 2,
    servicesBox.y + servicesBox.height / 2,
  );
  await page.waitForTimeout(700);
  const underlineAfter = await page.evaluate(() => {
    const underline = document.querySelector(
      'a[href="/services"] [data-menu-underline]',
    );
    const label = document.querySelector('a[href="/services"] [data-menu-link]');
    return {
      underline: getComputedStyle(underline).transform,
      label: getComputedStyle(label).transform,
    };
  });
  record(
    "nav: GSAP hover draws the underline and leans the label",
    underlineBefore.startsWith("matrix(0") &&
      underlineAfter.underline.startsWith("matrix(1") &&
      /matrix\(1, 0, 0, 1, [56]/.test(underlineAfter.label),
    `before=${underlineBefore} after=${underlineAfter.underline} label=${underlineAfter.label}`,
  );
  await page.mouse.click(120, 500);
  await page.waitForTimeout(1700);
  record(
    "nav: clicking the scrim closes the drawer",
    (await page.locator("#mobile-menu").count()) === 0,
  );
  await page.locator("[data-menu-trigger]").click();
  await page.waitForTimeout(1100);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1700);
  record(
    "nav: Escape closes the menu and restores the trigger",
    (await page.locator("#mobile-menu").count()) === 0 &&
      (await page.evaluate(
        () =>
          document.activeElement?.getAttribute("data-menu-trigger") !== null,
      )),
  );
  await page.locator("[data-menu-trigger]").click();
  await page.waitForTimeout(1100);
  await page.locator("[data-menu-trigger]").click();
  await page.waitForTimeout(1700);
  record(
    "nav: the same Menu button closes the drawer again",
    (await page.locator("#mobile-menu").count()) === 0,
  );

  /* ---------------- Brand logo ---------------- */
  record(
    "brand: favicon link present",
    (await page.locator('link[rel="icon"]').count()) >= 1,
  );
  const homeDarkMark = await page
    .locator("header img.brand-on-dark")
    .first()
    .evaluate((img) => getComputedStyle(img).display);
  record(
    "brand: the default dark theme shows the white mark",
    homeDarkMark === "block",
    `display=${homeDarkMark}`,
  );
  record(
    "brand: the navigation uses the new SVG logo",
    (await page
      .locator('header img[src$="/brand/logo-white.svg"]')
      .count()) === 1 &&
      (await page
        .locator('header img[src$="/brand/logo-black.svg"]')
        .count()) === 1,
  );

  const ssrHome = await (await fetch(`${BASE}/`)).text();
  record(
    'theme: the server renders data-theme="dark" for the first paint',
    ssrHome.includes('data-theme="dark"'),
  );

  const themeToggle = page.locator("[data-theme-toggle]").first();
  record(
    "theme: the toggle is available in the navigation",
    (await themeToggle.count()) === 1,
  );
  await themeToggle.click();
  await page.waitForTimeout(700);
  const lightTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  const lightMark = await page
    .locator("header img.brand-on-light")
    .first()
    .evaluate((img) => getComputedStyle(img).display);
  record(
    "theme: toggling switches every surface to light (black mark)",
    lightTheme === "light" && lightMark === "block",
    `theme=${lightTheme} display=${lightMark}`,
  );
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(900);
  const persistedTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  record(
    "theme: the visitor choice persists across reloads",
    persistedTheme === "light",
    `theme=${persistedTheme}`,
  );
  await page.locator("[data-theme-toggle]").first().click();
  await page.waitForTimeout(700);
  const restoredTheme = await page.evaluate(() =>
    document.documentElement.getAttribute("data-theme"),
  );
  record(
    "theme: toggling back restores the dark default",
    restoredTheme === "dark",
    `theme=${restoredTheme}`,
  );

  /* ---------------- Work ---------------- */
  await page.goto(`${BASE}/work`, { waitUntil: "load" });
  await page.waitForTimeout(1500);

  const cards = page.locator("[data-work-card]");
  record(
    "work: 5 project cards",
    (await cards.count()) === 5,
    `count=${await cards.count()}`,
  );
  record(
    "media: every work card carries the bottom-up theme fade",
    (await page.locator("[data-work-card] [data-media-fade]").count()) === 5,
    `fades=${await page.locator("[data-work-card] [data-media-fade]").count()}`,
  );
  const darkLogo = await page
    .locator("header img.brand-on-dark")
    .first()
    .evaluate((img) => getComputedStyle(img).display);
  record("brand: dark shell shows the white mark", darkLogo === "block");

  await page.getByRole("button", { name: /Film/ }).click();
  await page.waitForTimeout(900);
  record("work: Film filter shows 2 films", (await cards.count()) === 2);

  await page.getByRole("button", { name: /Commercial/ }).click();
  await page.waitForTimeout(900);
  record(
    "work: empty category shows the empty state",
    (await cards.count()) === 0 &&
      (await page.getByText("No projects yet in this category.").isVisible()),
  );
  await page.getByRole("button", { name: "View all work" }).click();
  await page.waitForTimeout(900);
  record("work: empty state offers a way back", (await cards.count()) === 5);

  /* Photograph entrance (studio request): every filter click replays the
     same reveal for the resulting set, and scrolling the archive never
     leaves a photograph hidden or replays one that already played. */
  await page.evaluate(() => {
    const root = document.querySelector("[data-masonry]");
    window.__revealMutations = 0;
    window.__revealObserver?.disconnect();
    window.__revealObserver = new MutationObserver((records) => {
      for (const record of records) {
        if (record.target?.hasAttribute?.("data-masonry-item")) {
          window.__revealMutations += 1;
        }
      }
    });
    window.__revealObserver.observe(root, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  });
  await page.getByRole("button", { name: /Film/ }).click();
  await page.waitForTimeout(1000);
  const filterReveal = await page.evaluate(() => {
    window.__revealObserver?.disconnect();
    const items = [...document.querySelectorAll("[data-masonry-item]")];
    return {
      mutations: window.__revealMutations,
      items: items.length,
      hidden: items.filter((el) => {
        const styles = getComputedStyle(el);
        return styles.visibility === "hidden" || Number(styles.opacity) < 0.99;
      }).length,
    };
  });
  record(
    "work: clicking a filter replays the photograph entrance for the new set",
    filterReveal.mutations > 0 &&
      filterReveal.items === 2 &&
      filterReveal.hidden === 0,
    JSON.stringify(filterReveal),
  );

  await page.getByRole("button", { name: /^All/ }).click();
  await page.waitForTimeout(900);
  for (let step = 0; step < 4; step++) {
    await page.mouse.wheel(0, 900);
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(1100);
  const workHiddenAfterScroll = await page.evaluate(
    () =>
      [...document.querySelectorAll("[data-masonry-item]")].filter((el) => {
        const styles = getComputedStyle(el);
        return styles.visibility === "hidden" || Number(styles.opacity) < 0.99;
      }).length,
  );
  record(
    "work: scrolling the archive leaves no photograph hidden",
    workHiddenAfterScroll === 0,
    `hidden=${workHiddenAfterScroll}`,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);

  await page.getByRole("button", { name: /^All/ }).click();
  await page.waitForTimeout(300);
  await page.keyboard.press("ArrowRight");
  const focusedWorkFilter = await page.evaluate(
    () => document.activeElement?.textContent ?? "",
  );
  record(
    "work: arrow keys move between filter tabs",
    focusedWorkFilter.trim().startsWith("Photography"),
    focusedWorkFilter.trim(),
  );
  record(
    "work: the grid is packed as masonry with monochrome media",
    (await page
      .locator("[data-masonry] [data-masonry-item] [data-work-card]")
      .count()) === 5 &&
      (await page
        .locator("[data-masonry-item] img")
        .first()
        .evaluate((img) => getComputedStyle(img).filter)) === "grayscale(1)",
  );
  const workFirstImg = page.locator("[data-masonry-item] img").first();
  await workFirstImg.hover();
  await page.waitForTimeout(700);
  record(
    "work: hovering a card hands the photograph its color back",
    (await workFirstImg.evaluate((img) => getComputedStyle(img).filter)) ===
      "grayscale(0)",
  );
  await page.mouse.move(10, 10);
  await page.goto(`${BASE}/work?filter=Photography`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  record(
    "work: the dropdown deep link opens pre-filtered",
    (await page.getByRole("button", { name: /^Photography/ }).getAttribute("aria-pressed")) ===
      "true" &&
      ((await page.locator('[aria-live="polite"]').first().textContent()) ?? "").startsWith(
        "Photography,",
      ),
    `summary=${((await page.locator('[aria-live="polite"]').first().textContent()) ?? "").trim()}`,
  );
  await page.goto(`${BASE}/work?filter=Nope`, { waitUntil: "load" });
  await page.waitForTimeout(1300);
  record(
    "work: unknown filters fall back to All",
    (await page.locator("[data-work-card]").count()) === 5 &&
      (await page
        .getByRole("button", { name: /^All/ })
        .getAttribute("aria-pressed")) === "true",
  );

  /* ---------------- Media completeness audit ---------------- */
  for (const project of manifest.projects) {
    await page.goto(`${BASE}/work/${project.slug}`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    if (project.photos.length > 0) {
      // The lead frame carries the hero, so the wall starts at the second
      // photograph: hero + wall cover every photograph exactly once.
      const expected = Math.max(project.photos.length - 1, 0);
      const rendered = await page
        .locator('[data-section="gallery"] [data-gallery-item]')
        .count();
      record(
        `detail ${project.slug}: hero plus ${expected} wall photographs cover every frame once`,
        rendered === expected,
        `rendered=${rendered}`,
      );
    }
    if (project.videos.length > 0) {
      const rendered = await page
        .locator('[data-section="films"] [data-film-item]')
        .count();
      record(
        `detail ${project.slug}: all ${project.videos.length} films render`,
        rendered === project.videos.length,
        `rendered=${rendered}`,
      );
      record(
        `detail ${project.slug}: film posters carry the hover preview`,
        (await page.locator('[data-section="films"] [data-media-preview]').count()) ===
          project.videos.length,
      );
    }
  }

  /* ---------------- Photo detail + viewer ---------------- */
  await page.goto(`${BASE}/work/dean-and-deb`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  const photoSections = await page
    .locator("[data-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-section")),
    );
  record(
    "detail: photo project section order",
    JSON.stringify(photoSections) ===
      JSON.stringify([
        "hero",
        "information",
        "content",
        "like",
        "reviews",
        "gallery",
        "credits",
        "related",
        "next",
      ]),
    photoSections.join(","),
  );
  const detailHeroLayout = await page.evaluate(() => {
    const frame = document.querySelector('[data-section="hero"] .media-guard');
    const container = frame?.parentElement;
    return {
      mediaWidth: frame ? Math.round(frame.getBoundingClientRect().width) : 0,
      containerWidth: container
        ? Math.round(container.getBoundingClientRect().width)
        : 0,
      viewport: window.innerWidth,
    };
  });
  record(
    "detail: the project hero is bounded to the content column",
    detailHeroLayout.mediaWidth > 0 &&
      detailHeroLayout.mediaWidth < detailHeroLayout.viewport &&
      detailHeroLayout.mediaWidth <= detailHeroLayout.containerWidth,
    JSON.stringify(detailHeroLayout),
  );
  record(
    "trail: the detail page drops the old back button and hero link",
    (await page.locator("[data-page-trail-back]").count()) === 0 &&
      (await page.locator('nav[aria-label="Page trail"]').count()) === 1 &&
      (await page.locator('main a[href="/work"]').count()) === 0,
  );
  await page
    .locator('[data-section="information"]')
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  record(
    "detail: media summary counts photographs",
    await page.getByText("51 photographs").first().isVisible(),
  );
  record(
    "detail: inline highlights render as directional links",
    (await page
      .locator('a[data-inline-link][href="/services/photography"]')
      .count()) === 1,
  );

  await page.locator('[data-section="reviews"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  record(
    "detail: client notes render with initials avatars",
    (await page
      .locator('[data-section="reviews"] [data-review-card]')
      .count()) >= 2 &&
      (await page
        .locator('[data-section="reviews"]')
        .getByText("Dean & Deb")
        .first()
        .isVisible()),
  );

  /* Likes: persisted, one per visitor, with cleanup. */
  {
    const { Database } = await import("bun:sqlite");
    const likePreClean = new Database("data/ocassio.db");
    likePreClean
      .query(
        "DELETE FROM likes WHERE entity_type = 'project' AND entity_slug = 'dean-and-deb'",
      )
      .run();
    likePreClean.close();
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1300);

    const likeButton = page.locator("[data-like-button]");
    // Reload restores the old scroll; start from the top and approach the
    // button downward so the reveal trigger fires like a visitor's scroll.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await likeButton.scrollIntoViewIfNeeded();
    await likeButton.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(400);
    record(
      "likes: the button loads its persisted count",
      (await likeButton.count()) === 1 &&
        ((await likeButton.textContent()) ?? "").trim() === "0",
      `text=${((await likeButton.textContent()) ?? "").trim()}`,
    );
    await likeButton.click();
    await page.waitForTimeout(800);
    record(
      "likes: clicking persists instantly (optimistic)",
      (await likeButton.getAttribute("aria-pressed")) === "true" &&
        ((await likeButton.textContent()) ?? "").trim() === "1",
    );
    await page.reload({ waitUntil: "load" });
    await page.waitForTimeout(1300);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.locator("[data-like-button]").scrollIntoViewIfNeeded();
    await page
      .locator("[data-like-button]")
      .waitFor({ state: "visible", timeout: 15000 });
    await page.waitForTimeout(400);
    record(
      "likes: the count and state survive a reload",
      (await page
        .locator("[data-like-button]")
        .getAttribute("aria-pressed")) === "true" &&
        ((await page.locator("[data-like-button]").textContent()) ?? "").trim() ===
          "1",
    );
    await page.locator("[data-like-button]").click();
    await page.waitForTimeout(800);
    record(
      "likes: toggling again removes the like",
      (await page
        .locator("[data-like-button]")
        .getAttribute("aria-pressed")) === "false" &&
        ((await page.locator("[data-like-button]").textContent()) ?? "").trim() ===
          "0",
    );

    const visitor = await page.evaluate(() =>
      window.localStorage.getItem("ocassio-visitor"),
    );
    if (visitor) {
      const likeCleanup = new Database("data/ocassio.db");
      likeCleanup
        .query("DELETE FROM likes WHERE visitor_id = ?")
        .run(visitor);
      likeCleanup.close();
    }
  }

  await page
    .locator('[data-section="gallery"] [data-masonry]')
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(1400);
  const galleryTiles = page.locator(
    '[data-section="gallery"] [data-gallery-item]',
  );
  record(
    "gallery: masonry packs every wall photograph",
    (await galleryTiles.count()) === 50 &&
      (await page
        .locator('[data-section="gallery"] [data-masonry-item]')
        .count()) === 50,
    `tiles=${await galleryTiles.count()}`,
  );
  const firstTile = galleryTiles.first();
  await firstTile.hover();
  await page.waitForTimeout(700);
  const tileFilter = await firstTile
    .locator("img")
    .evaluate((img) => getComputedStyle(img).filter);
  record(
    "gallery: photographs rest monochrome and reveal color on hover",
    tileFilter === "grayscale(0)",
    `filter=${tileFilter}`,
  );
  await page.mouse.move(10, 10);
  await page.waitForTimeout(600);
  record(
    "protection: media tiles shield right-click, drag and copy",
    await firstTile.evaluate((tile) => {
      const frame = tile.querySelector(".media-guard");
      const image = tile.querySelector("img");
      if (!frame) return false;
      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
      });
      const allowed = frame.dispatchEvent(event);
      return (
        allowed === false &&
        image?.draggable === false &&
        frame.querySelector("[data-media-shield]") !== null
      );
    }),
  );
  await firstTile.click();
  await page.waitForTimeout(900);
  const galleryCounter = (
    (await page.locator("[data-viewer-counter]").textContent()) ?? ""
  ).trim();
  const galleryViewerSrc =
    (await page.locator("[data-viewer-frame] img").getAttribute("src")) ?? "";
  record(
    "gallery: a photograph opens the viewer at the largest variant",
    /^01 \/ 50$/.test(galleryCounter) && galleryViewerSrc.includes("@1920"),
    `counter=${galleryCounter} src=…${galleryViewerSrc.slice(-18)}`,
  );
  record(
    "protection: the viewer frame blocks drag and copy",
    (await page
      .locator("[data-viewer-frame] img")
      .evaluate((img) => img.draggable)) === false &&
      (await page.locator("[data-viewer-frame] [data-media-shield]").count()) === 1,
  );
  record(
    "viewer: the frame scrolls inside while the page stays locked",
    await page.evaluate(() => {
      const scroller = document.querySelector("[data-viewer-scroll]");
      const dialog = document.querySelector("[data-photo-viewer]");
      const html = getComputedStyle(document.documentElement);
      return (
        scroller !== null &&
        dialog?.parentElement === document.body &&
        getComputedStyle(scroller).overflowY === "auto" &&
        getComputedStyle(scroller).overscrollBehavior === "contain" &&
        html.overflow === "hidden" &&
        html.overscrollBehavior === "none"
      );
    }),
  );
  await page.mouse.click(1380, 130);
  await page.waitForTimeout(400);
  record(
    "viewer: clicking the dark area does not close it",
    (await page.locator("[data-photo-viewer]").count()) === 1,
  );
  const counterBefore = Number(galleryCounter.slice(0, 2));
  const prevControl = page.locator(
    '[data-photo-viewer] button[aria-label="Previous photograph"]',
  );
  const nextControl = page.locator(
    '[data-photo-viewer] button[aria-label="Next photograph"]',
  );
  record(
    "viewer: the first photograph hides the previous control",
    counterBefore === 1 &&
      (await prevControl.isDisabled()) &&
      !(await prevControl.isVisible()) &&
      (await nextControl.isEnabled()) &&
      (await nextControl.isVisible()),
    `counter=${counterBefore}`,
  );
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(250);
  const counterAtStart = Number(
    ((await page.locator("[data-viewer-counter]").textContent()) ?? "00").slice(0, 2),
  );
  record(
    "viewer: ArrowLeft at the first photograph stays put",
    counterAtStart === 1,
    `-> ${counterAtStart}`,
  );
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const counterAfter = Number(
    ((await page.locator("[data-viewer-counter]").textContent()) ?? "00").slice(0, 2),
  );
  record(
    "viewer: arrow keys step forward without wrapping",
    counterAfter === counterBefore + 1,
    `${counterBefore} -> ${counterAfter}`,
  );
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(800);
  record(
    "viewer: the Close button closes and releases the page lock",
    (await page.locator("[data-photo-viewer]").count()) === 0 &&
      (await page.evaluate(
        () => getComputedStyle(document.documentElement).overflow !== "hidden",
      )),
  );
  await firstTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await firstTile.click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  record(
    "viewer: Escape closes and focus returns to the gallery item",
    (await page.locator("[data-photo-viewer]").count()) === 0 &&
      (await page.evaluate(
        () => document.activeElement?.closest("[data-gallery-item]") !== null,
      )),
  );

  /* The last photograph offers no next control and never wraps. */
  const lastTile = page
    .locator('[data-section="gallery"] [data-gallery-item]')
    .last();
  await lastTile.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await lastTile.click();
  await page.waitForTimeout(900);
  const lastCounter = (
    (await page.locator("[data-viewer-counter]").textContent()) ?? ""
  ).trim();
  const lastPrev = page.locator(
    '[data-photo-viewer] button[aria-label="Previous photograph"]',
  );
  const lastNext = page.locator(
    '[data-photo-viewer] button[aria-label="Next photograph"]',
  );
  record(
    "viewer: the last photograph hides the next control",
    /^50 \/ 50$/.test(lastCounter) &&
      (await lastNext.isDisabled()) &&
      !(await lastNext.isVisible()) &&
      (await lastPrev.isEnabled()) &&
      (await lastPrev.isVisible()),
    lastCounter,
  );
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(250);
  const lastAfter = (
    (await page.locator("[data-viewer-counter]").textContent()) ?? ""
  ).trim();
  record(
    "viewer: ArrowRight at the last photograph stays put",
    lastAfter === lastCounter,
    `${lastCounter} -> ${lastAfter}`,
  );
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(700);

  /* ---------------- Film detail + theater ---------------- */
  await page.goto(`${BASE}/work/tere-and-chris`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  const filmSections = await page
    .locator("[data-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-section")),
    );
  record(
    "detail: film project section order",
    JSON.stringify(filmSections) ===
      JSON.stringify([
        "hero",
        "information",
        "content",
        "like",
        "reviews",
        "films",
        "credits",
        "related",
        "next",
      ]),
    filmSections.join(","),
  );
  record(
    "detail: wedding films carry the sub-brand mark",
    (await page
      .locator('[data-section="films"] img[src="/brand/the-wedding-of.png"]')
      .count()) >= 1,
  );
  await page
    .locator('[data-section="information"]')
    .scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  record(
    "detail: media summary counts films",
    await page.getByText("5 films").first().isVisible(),
  );

  await page.locator("[data-film-item]").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /^Play / }).first().click();
  await page.waitForTimeout(900);
  record(
    "theater: full-screen player opens",
    await page.locator("[data-film-theater]").isVisible(),
  );
  record(
    "protection: the theater video blocks downloads",
    (await page.locator("[data-film-video]").getAttribute("controlslist")) ===
      "nodownload",
  );
  record(
    "theater: the stage scrolls inside while the page stays locked",
    await page.evaluate(() => {
      const scroller = document.querySelector("[data-theater-scroll]");
      const html = getComputedStyle(document.documentElement);
      return (
        scroller !== null &&
        getComputedStyle(scroller).overflowY === "auto" &&
        getComputedStyle(scroller).overscrollBehavior === "contain" &&
        html.overflow === "hidden"
      );
    }),
  );
  await page.mouse.click(20, 320);
  await page.waitForTimeout(400);
  record(
    "theater: clicking the dark area does not close it",
    (await page.locator("[data-film-theater]").count()) === 1,
  );
  const playback = await page
    .locator("[data-film-video]")
    .evaluate(async (video) => {
      if (video.readyState < 2) {
        await new Promise((resolve) =>
          video.addEventListener("canplay", resolve, { once: true }),
        );
      }
      return {
        readyState: video.readyState,
        paused: video.paused,
        file: video.currentSrc.split("/").pop(),
      };
    })
    .catch((error) => ({ error: error.message }));
  record(
    "theater: video streams and plays",
    playback.readyState >= 2 && playback.paused === false,
    JSON.stringify(playback),
  );
  await page.getByRole("button", { name: "Close" }).click();
  await page.waitForTimeout(700);
  record(
    "theater: the Close button closes the player",
    (await page.locator("[data-film-theater]").count()) === 0,
  );
  await page.getByRole("button", { name: /^Play / }).first().click();
  await page.waitForTimeout(900);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  record(
    "theater: Escape closes the player",
    (await page.locator("[data-film-theater]").count()) === 0,
  );

  /* Theatre stepping: no wrap, the ends disable their control. */
  await page
    .locator("[data-film-item]")
    .first()
    .getByRole("button", { name: /^Play / })
    .click();
  await page.waitForTimeout(900);
  const filmPrev = page.locator("[data-film-theater] button", {
    hasText: "Previous film",
  });
  const filmNext = page.locator("[data-film-theater] button", {
    hasText: "Next film",
  });
  record(
    "theater: the first cut hides the previous control",
    (await filmPrev.isDisabled()) &&
      !(await filmPrev.isVisible()) &&
      (await filmNext.isVisible()),
  );
  for (let step = 0; step < 4; step += 1) {
    await filmNext.click();
    await page.waitForTimeout(400);
  }
  const filmCounter = (
    await page
      .locator("[data-film-theater]")
      .getByText(/^\d+ \/ 5$/)
      .first()
      .textContent()
  )?.trim();
  record(
    "theater: the last cut hides the next control (no wrap)",
    filmCounter === "5 / 5" &&
      (await filmNext.isDisabled()) &&
      !(await filmNext.isVisible()) &&
      (await filmPrev.isVisible()),
    filmCounter ?? "no counter",
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  /* Hero-opened theater must anchor to the viewport, not the hero wrapper. */
  await page.getByRole("button", { name: /^Play / }).first().click();
  await page.waitForTimeout(1000);
  const heroTheater = await page.evaluate(() => {
    const dialog = document.querySelector("[data-film-theater]");
    const rect = dialog?.getBoundingClientRect();
    return {
      top: rect ? Math.round(rect.top) : null,
      height: rect ? Math.round(rect.height) : null,
      viewport: window.innerHeight,
      parentIsBody: dialog?.parentElement === document.body,
    };
  });
  record(
    "theater: the hero-opened player anchors to the viewport (portal)",
    heroTheater.parentIsBody === true &&
      Math.abs(heroTheater.top ?? 1) <= 1 &&
      Math.abs((heroTheater.height ?? 0) - heroTheater.viewport) <= 1,
    JSON.stringify(heroTheater),
  );
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  /* ---------------- Journal ---------------- */
  await page.goto(`${BASE}/journal`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  const journalCards = page.locator(".journal-item");
  record(
    "journal: first page shows 4 articles",
    (await journalCards.count()) === 4,
    `count=${await journalCards.count()}`,
  );
  record(
    "journal: paging line reports shown vs total",
    ((await page.locator("[data-journal-summary]").textContent()) ?? "").includes(
      "04 of 04",
    ),
  );
  const journalMain = (await page.locator("main").textContent()) ?? "";
  record(
    "journal: the feed carries the four shipped stories",
    journalMain.includes("Life Untolds, in Monochrome") &&
      journalMain.includes("Laid This Nite, in Print") &&
      journalMain.includes("The Shape of Someone") &&
      journalMain.includes("Before the First Note") &&
      !journalMain.includes("On Finishing"),
  );
  record(
    "journal: covers render the shipped prints",
    (await page.locator('.journal-item img[src*="/media/journal/"]').count()) ===
      4,
    `covers=${await page.locator('.journal-item img[src*="/media/journal/"]').count()}`,
  );
  record(
    "journal: the feed is packed as a masonry grid",
    (await page
      .locator('[data-masonry] [data-masonry-item].journal-item')
      .count()) === 4,
  );
  record(
    "journal: every story fits the first page, so paging stays hidden",
    (await page.getByRole("button", { name: "Load more articles" }).count()) ===
      0,
  );

  await page.getByRole("button", { name: /Studio Notes/ }).click();
  await page.waitForTimeout(900);
  record(
    "journal: category filter narrows the feed",
    (await journalCards.count()) === 1,
    `count=${await journalCards.count()}`,
  );
  await page.getByRole("button", { name: /^Photography/ }).click();
  await page.waitForTimeout(800);
  record(
    "journal: category counts stay exact",
    (await journalCards.count()) === 1,
    `count=${await journalCards.count()}`,
  );
  await page.getByRole("button", { name: /^Film/ }).click();
  await page.waitForTimeout(800);
  record(
    "journal: empty category shows the empty state",
    (await journalCards.count()) === 0 &&
      (await page.getByText("No articles in this category yet.").isVisible()),
  );
  await page.getByRole("button", { name: "Read all articles" }).click();
  await page.waitForTimeout(800);
  record("journal: empty state offers a way back", (await journalCards.count()) === 4);
  {
    // The feed shares the photograph entrance: a filter click replays the
    // reveal and no cover is ever left hidden afterwards.
    await page.getByRole("button", { name: /^Photography/ }).click();
    await page.waitForTimeout(1000);
    const journalHidden = await page.evaluate(
      () =>
        [...document.querySelectorAll("[data-masonry-item]")].filter((el) => {
          const styles = getComputedStyle(el);
          return styles.visibility === "hidden" || Number(styles.opacity) < 0.99;
        }).length,
    );
    record(
      "journal: a category click reveals its covers and leaves none hidden",
      (await journalCards.count()) === 1 && journalHidden === 0,
      `hidden=${journalHidden}`,
    );
    await page.getByRole("button", { name: /^All/ }).click();
    await page.waitForTimeout(900);
  }

  /* ---------------- Article detail + 404s ---------------- */
  const articleResponse = await page.goto(
    `${BASE}/journal/life-untolds-in-monochrome`,
    { waitUntil: "load" },
  );
  await page.waitForTimeout(1200);
  record(
    "article: responds 200",
    articleResponse?.status() === 200,
    `status=${articleResponse?.status()}`,
  );
  record(
    "article: title renders",
    await page
      .getByRole("heading", { level: 1, name: "Life Untolds, in Monochrome" })
      .isVisible(),
  );
  record(
    "article: the cover renders the shipped print",
    (((await page
      .locator('[data-section="cover"] img')
      .getAttribute("src")) ?? "").includes("/media/journal/article-01")),
  );
  const journalCoverLayout = await page.evaluate(() => {
    const frame = document.querySelector('[data-section="cover"] .media-guard');
    const container = frame?.parentElement;
    return {
      mediaWidth: frame ? Math.round(frame.getBoundingClientRect().width) : 0,
      containerWidth: container
        ? Math.round(container.getBoundingClientRect().width)
        : 0,
    };
  });
  record(
    "article: the cover is bounded to the content column",
    journalCoverLayout.mediaWidth > 0 &&
      journalCoverLayout.mediaWidth <= journalCoverLayout.containerWidth &&
      (await page
        .locator('[data-section="article"] a[href="/journal"]')
        .count()) === 0,
    JSON.stringify(journalCoverLayout),
  );
  record(
    "article: reading time is computed from real text",
    ((await page.locator("main").textContent()) ?? "").includes("min read"),
  );
  await page.locator("[data-like-button]").scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  record(
    "article: the like button renders on the byline",
    (await page.locator("[data-like-button]").count()) === 1,
  );
  record(
    "article: related articles show 3 cards",
    (await page
      .locator('[data-section="related-articles"] .journal-item')
      .count()) === 3,
  );
  await page.goto(`${BASE}/journal/the-shape-of-someone`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(1100);
  record(
    "article: inline highlights render as directional links",
    (await page
      .locator('a[data-inline-link][href="/services/portrait"]')
      .count()) === 1,
  );
  const missingArticle = await page.goto(`${BASE}/journal/does-not-exist`, {
    waitUntil: "load",
  });
  record(
    "article: unknown slugs show the unavailable page",
    missingArticle?.status() === 404 &&
      (await page.getByText("This article is unavailable.").isVisible()),
  );

  /* ---------------- Now ---------------- */
  const nowResponse = await page.goto(`${BASE}/now`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "now: responds 200 with the honest empty state",
    nowResponse?.status() === 200 &&
      (await page.getByText("Nothing public right now.").isVisible()),
  );
  record(
    "now: empty state carries next actions",
    (await page.locator('[data-section="cta"] a[href="/start-project"]').count()) ===
      1,
  );

  /* ---------------- Services ---------------- */
  const servicesResponse = await page.goto(`${BASE}/services`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(1200);
  record(
    "services: responds 200 with 7 service cards",
    servicesResponse?.status() === 200 &&
      (await page.locator("[data-service-card]").count()) === 7,
  );
  const serviceOrder = await page
    .locator("[data-service-card]")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-service-card")),
    );
  const expectedServiceOrder = SERVICES.filter(
    (service) => service.status === "published" && service.visibility === "public",
  )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((service) => service.slug);
  record(
    "services: entity order matches the documented taxonomy",
    JSON.stringify(serviceOrder) === JSON.stringify(expectedServiceOrder),
    serviceOrder.join(","),
  );

  const categoryItems = page.locator("[data-category-item]");
  record(
    "services: the category list indexes every published service",
    (await categoryItems.count()) === expectedServiceOrder.length,
    `items=${await categoryItems.count()}`,
  );
  const firstCategoryHref = await categoryItems.first().getAttribute("href");
  record(
    "services: category rows navigate to the service detail",
    firstCategoryHref === `/services/${expectedServiceOrder[0]}`,
    String(firstCategoryHref),
  );
  await categoryItems.first().hover();
  await page.waitForTimeout(600);
  const bracketOpacity = await page
    .locator("[data-category-item]")
    .first()
    .locator("span[aria-hidden]")
    .first()
    .evaluate((node) => getComputedStyle(node).opacity);
  record(
    "services: hovering a category reveals its corner brackets",
    bracketOpacity === "1",
    `opacity=${bracketOpacity}`,
  );
  record(
    "background: the services page shares the floating paths backdrop",
    (await page.locator("[data-floating-paths]").count()) === 1,
  );
  const unknownService = await page.goto(`${BASE}/services/does-not-exist`, {
    waitUntil: "load",
  });
  record(
    "services: unknown slugs are a 404",
    unknownService?.status() === 404,
    `status=${unknownService?.status}`,
  );

  await page.goto(`${BASE}/services/film-and-motion`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const serviceSections = await page
    .locator("[data-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-section")),
    );
  record(
    "service detail: documented section order",
    JSON.stringify(serviceSections) ===
      JSON.stringify([
        "hero",
        "description",
        "audience",
        "deliverables",
        "work",
        "process",
        "pricing",
        "cta",
      ]),
    serviceSections.join(","),
  );
  record(
    "service detail: pricing preview quotes on request",
    ((await page.locator("main").textContent()) ?? "").includes(
      "Quote on request",
    ),
  );
  const filmPricingRows = await page
    .locator('[data-section="pricing"] [data-pricing-entry]')
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-pricing-entry")),
    );
  record(
    "service detail: pricing preview is filtered to this service",
    JSON.stringify(filmPricingRows) === JSON.stringify(["film-commission"]),
    filmPricingRows.join(","),
  );
  record(
    "service detail: FAQ stays out while no real questions exist",
    (await page.locator('[data-section="faq"]').count()) === 0,
  );
  record(
    "service detail: the closing CTA names the service",
    ((await page.locator('[data-section="cta"]').textContent()) ?? "").includes(
      "Start a Film & Motion project",
    ),
  );
  await page.goto(`${BASE}/services/photography`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "service detail: inline highlights render as directional links",
    (await page.locator('a[data-inline-link][href="/process"]').count()) === 1,
  );

  await page.goto(`${BASE}/services/commercial-campaign`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(900);
  const coverlessSections = await page
    .locator("[data-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-section")),
    );
  record(
    "service detail: services without real covers still render fully",
    JSON.stringify(coverlessSections) ===
      JSON.stringify([
        "hero",
        "description",
        "audience",
        "deliverables",
        "work",
        "process",
        "cta",
      ]),
    coverlessSections.join(","),
  );
  record(
    "service detail: related work falls back to the archive link",
    ((await page.locator("main").textContent()) ?? "").includes(
      "Work for this service is being prepared",
    ) && (await page.locator('[data-section="work"] a[href="/work"]').count()) >= 1,
  );

  /* ---------------- Pricing / Process / About / Contact ---------------- */
  await page.goto(`${BASE}/pricing`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "pricing: editorial rows render",
    (await page.locator("[data-pricing-entry]").count()) === 4,
    `count=${await page.locator("[data-pricing-entry]").count()}`,
  );
  const pricingOrder = await page
    .locator("[data-pricing-entry]")
    .evaluateAll((rows) =>
      rows.map((row) => row.getAttribute("data-pricing-entry")),
    );
  const expectedPricingOrder = PRICING.filter(
    (entry) => entry.status === "published",
  )
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entry) => entry.id);
  record(
    "pricing: page order matches the entity order",
    JSON.stringify(pricingOrder) === JSON.stringify(expectedPricingOrder),
    pricingOrder.join(","),
  );
  record(
    "pricing entity: price type rules hold for every entry",
    PRICING.every((entry) => validatePricingEntry(entry).length === 0) &&
      Object.keys(PRICE_TYPE_LABEL).length === 3,
    JSON.stringify(
      PRICING.flatMap((entry) =>
        validatePricingEntry(entry).map((issue) => `${entry.id}: ${issue}`),
      ),
    ),
  );
  record(
    "pricing: no invented numbers, all quote on request",
    ((await page.locator("main").textContent()) ?? "").includes(
      "Quote on request",
    ) && !((await page.locator("main").textContent()) ?? "").includes("Rp "),
  );
  record(
    "pricing: editorial index numerals, not SaaS tiers",
    ((await page
      .locator('[data-pricing-entry="photography-commission"]')
      .textContent()) ?? "").includes("(01)"),
  );
  record(
    "pricing: documented quote factors render",
    ((await page.locator("main").textContent()) ?? "").includes(
      "What shapes a quote:",
    ) &&
      ((await page.locator("main").textContent()) ?? "").includes(
        "Usage Rights",
      ) &&
      ((await page.locator("main").textContent()) ?? "").includes("Crew"),
  );
  record(
    "pricing: each row links to its service detail",
    (await page
      .locator(
        '[data-pricing-entry="photography-commission"] a[href="/services/photography"]',
      )
      .count()) === 1,
  );
  const firstPricingRow = await page
    .locator('[data-pricing-entry="photography-commission"]')
    .boundingBox();
  record(
    "pricing: rows span the editorial container, not columns",
    Boolean(firstPricingRow && firstPricingRow.width > 900),
    `width=${Math.round(firstPricingRow?.width ?? 0)}`,
  );
  const pricingText = (await page.locator("main").textContent()) ?? "";
  const servicesText = await page
    .goto(`${BASE}/services`, { waitUntil: "load" })
    .then(async () => {
      await page.waitForTimeout(800);
      return (await page.locator("main").textContent()) ?? "";
    });
  const saasClichés = [
    "Most Popular",
    "Recommended",
    "per month",
    "/mo",
    "Free trial",
    "Save 20%",
    "Starter plan",
    "Pro plan",
  ];
  record(
    "editorial: no SaaS clichés on pricing or services",
    saasClichés.every(
      (cliché) => !pricingText.includes(cliché) && !servicesText.includes(cliché),
    ),
    saasClichés
      .filter(
        (cliché) =>
          pricingText.includes(cliché) || servicesText.includes(cliché),
      )
      .join(","),
  );
  record(
    "services: cards carry editorial index numerals",
    ((await page.locator('[data-service-card="photography"]').textContent()) ??
      "").includes("01"),
  );
  record(
    "services: cards surface their related real work",
    ((await page.locator('[data-service-card="photography"]').textContent()) ??
      "").includes("Related work: Dean & Deb"),
  );
  const serviceCoverSrc = await page
    .locator('[data-service-card="photography"] img')
    .first()
    .getAttribute("src");
  record(
    "services: covers come from real commission media",
    Boolean(serviceCoverSrc && serviceCoverSrc.startsWith("/media/photos/")),
    String(serviceCoverSrc),
  );

  await page.goto(`${BASE}/process`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "process: 9 steps render",
    (await page.locator(".process-step").count()) === 9,
    `count=${await page.locator(".process-step").count()}`,
  );
  const visibleSteps = PROCESS_STEPS.filter(
    (step) => step.status === "visible",
  );
  record(
    "process entity: steps carry only number, title, explanation",
    visibleSteps.length === 9 &&
      Object.keys(visibleSteps[0]).sort().join(",") ===
        "explanation,number,status,title" &&
      visibleSteps.every(
        (step, index) =>
          step.number === String(index + 1).padStart(2, "0"),
      ),
    visibleSteps.map((step) => step.number).join(","),
  );
  const renderedSteps = await page
    .locator(".process-step h2")
    .evaluateAll((headings) => headings.map((heading) => heading.textContent));
  record(
    "process: rendered order matches the entity order",
    JSON.stringify(renderedSteps) ===
      JSON.stringify(visibleSteps.map((step) => step.title)),
    renderedSteps.join(","),
  );
  record(
    "process: contextual next actions included",
    (await page
      .locator('[data-section="next-actions"] a[href="/services"]')
      .count()) === 1 &&
      (await page
        .locator('[data-section="next-actions"] a[href="/work"]')
        .count()) === 1,
  );
  record(
    "info layout: process uses the shared info page layout",
    (await page.locator('[data-info-layout="process"]').count()) === 1 &&
      (await page.locator('[data-section="cta"]').count()) === 1,
  );

  await page.goto(`${BASE}/about`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  const aboutSections = await page
    .locator("[data-section]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-section")),
    );
  record(
    "about: full documented section order",
    JSON.stringify(aboutSections) ===
      JSON.stringify([
        "header",
        "image",
        "about",
        "philosophy",
        "founder",
        "team",
        "clients",
        "recognition",
        "next-actions",
        "cta",
      ]),
    aboutSections.join(","),
  );
  const aboutText = (await page.locator("main").textContent()) ?? "";
  record(
    "about: the founder carries the studio-supplied portrait and role",
    aboutText.includes("Yehuda Alfa") &&
      aboutText.includes("Head Director") &&
      !aboutText.includes("founder introduction is being prepared") &&
      (await page.locator('[data-section="founder"] figure img').count()) === 1 &&
      (((await page
        .locator('[data-section="founder"] figure img')
        .getAttribute("src")) ?? "").includes("/media/studio/yehuda-alfa")),
  );
  record(
    "about: the hero image is the studio exhibition photograph",
    (((await page
      .locator('[data-section="image"] img')
      .getAttribute("src")) ?? "").includes("/media/studio/about-hero-1")),
  );
  record(
    "about: the roster renders and the remaining missing content stays labeled",
    (await page
      .locator('[data-section="team"] [data-team-member]')
      .count()) >= 1 &&
      !aboutText.includes("Team and collaborator details are being prepared") &&
      aboutText.includes("client list is being prepared") &&
      aboutText.includes("Recognition and publication") &&
      !aboutText.includes("Nara Foundation") &&
      !aboutText.includes("Kanvas") &&
      !aboutText.includes("SeaFilm"),
  );
  record(
    "about: inline highlights render as directional links",
    (await page
      .locator('[data-section="about"] a[data-inline-link][href="/services"]')
      .count()) === 1,
  );
  {
    const teamSection = page.locator('[data-section="team"]');
    await teamSection.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1100);
    const firstMember = page
      .locator('[data-section="team"] [data-hover-card-trigger]')
      .first();
    const firstMemberName = (
      (await firstMember.locator("span.truncate").first().textContent()) ?? ""
    ).trim();
    await firstMember.hover();
    await page.waitForTimeout(300);
    const memberCard = page
      .locator('[data-section="team"] [data-hover-card]')
      .first();
    const cardText = (await memberCard.textContent()) ?? "";
    record(
      "about: hovering a team member opens the bio card",
      (await firstMember.count()) === 1 &&
        firstMemberName.length > 0 &&
        (await memberCard.isVisible()) &&
        cardText.includes(firstMemberName) &&
        cardText.length > firstMemberName.length + 20,
      cardText.slice(0, 60),
    );
    await page.mouse.move(0, 0);
    await page.waitForTimeout(250);
  }
  record(
    "info layout: about uses the shared info page layout",
    (await page.locator('[data-info-layout="about"]').count()) === 1 &&
      (await page.locator('[data-section="philosophy"]').count()) === 1 &&
      (await page.locator('[data-section="cta"]').count()) === 1,
  );
  record(
    "about: contextual next actions included",
    (await page
      .locator('[data-section="next-actions"] a[href="/work"]')
      .count()) === 1 &&
      (await page
        .locator('[data-section="next-actions"] a[href="/services"]')
        .count()) === 1,
  );

  await page.goto(`${BASE}/contact`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "contact: channel list is derived from Global Settings",
    (await page.locator("[data-contact-channel]").count()) ===
      CONTACT_CHANNELS.length,
    `channels=${await page.locator("[data-contact-channel]").count()} settings=${CONTACT_CHANNELS.length}`,
  );
  record(
    "contact: eight documented channels, none dead",
    (await page.locator("[data-contact-channel]").count()) === 8 &&
      (await page.getByText("Coming soon").count()) === 4,
    `channels=${await page.locator("[data-contact-channel]").count()} soon=${await page.getByText("Coming soon").count()}`,
  );
  record(
    "contact: the studio email renders as the copy control",
    (await page
      .locator('[data-contact-channel="General email"] [data-copy-email]')
      .count()) === 1 &&
      (await page
        .locator(
          '[data-contact-channel="General email"] a[href="mailto:ocassio.project@gmail.com"]',
        )
        .count()) === 1,
  );
  record(
    "contact: project requests are a live routed channel",
    (await page
      .locator('[data-contact-channel="New projects"] a[href="/start-project"]')
      .count()) === 1,
  );
  record(
    "contact: location and availability are informational rows",
    await page
      .locator('[data-contact-channel="Location"]')
      .getByText("shares its location")
      .isVisible() &&
      (await page
        .locator('[data-contact-channel="Availability"]')
        .getByText("Confirmed per project")
        .isVisible()),
  );
  record(
    "contact: project requests route to Start a Project",
    (await page.locator('main a[href="/start-project"]').count()) >= 1,
  );
  record(
    "contact: no enquiry form on the contact page (§6.12 re-scope)",
    (await page.locator("[data-start-project-form]").count()) === 0 &&
      (await page.locator("main form").count()) === 0,
  );

  /* Contact details come from Global Settings (§10.3, §6.12). */
  {
    const { Database } = await import("bun:sqlite");
    const settingsDb = new Database("data/ocassio.db");
    const originalSettings = settingsDb
      .query(
        "SELECT id, contact_email, contact_phone, address, social_links FROM site_settings ORDER BY id LIMIT 1",
      )
      .get();
    const testValues = [
      "hello@ocassio.example",
      "+62 812 3456 7890",
      "Jakarta, Indonesia",
      JSON.stringify([
        { platform: "instagram", url: "https://instagram.com/ocassio" },
      ]),
    ];
    if (originalSettings) {
      settingsDb
        .query(
          "UPDATE site_settings SET contact_email = ?, contact_phone = ?, address = ?, social_links = ? WHERE id = ?",
        )
        .run(...testValues, originalSettings.id);
    } else {
      settingsDb
        .query(
          "INSERT INTO site_settings (contact_email, contact_phone, address, social_links) VALUES (?, ?, ?, ?)",
        )
        .run(...testValues);
    }
    settingsDb.close();

    await page.goto(`${BASE}/contact`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    record(
      "contact: channel values are served from Global Settings",
      (await page
        .locator(
          '[data-contact-channel="General email"] [data-copy-email][aria-label="Copy email address hello@ocassio.example"]',
        )
        .count()) === 1 &&
        (await page.getByText("+62 812 3456 7890").count()) === 1 &&
        (await page
          .locator(
            '[data-contact-channel="Instagram"] a[href="https://instagram.com/ocassio"]',
          )
          .count()) === 1 &&
        (await page.getByText("Jakarta, Indonesia").count()) === 1,
      `soon=${await page.getByText("Coming soon").count()}`,
    );
    await page
      .locator('[data-contact-channel="General email"] [data-copy-email]')
      .click();
    await page.waitForTimeout(500);
    record(
      "contact: the email row copies to the clipboard",
      (await page
        .locator('[data-contact-channel="General email"] [data-copy-email]')
        .getAttribute("data-copy-status")) === "copied" &&
        (await page.evaluate(() => navigator.clipboard.readText())) ===
          "hello@ocassio.example",
    );
    record(
      "contact: unconnected channels keep the labeled placeholder",
      (await page.getByText("Coming soon").count()) === 2,
      `soon=${await page.getByText("Coming soon").count()}`,
    );

    const restoreDb = new Database("data/ocassio.db");
    if (originalSettings) {
      restoreDb
        .query(
          "UPDATE site_settings SET contact_email = ?, contact_phone = ?, address = ?, social_links = ? WHERE id = ?",
        )
        .run(
          originalSettings.contact_email,
          originalSettings.contact_phone,
          originalSettings.address,
          originalSettings.social_links,
          originalSettings.id,
        );
    } else {
      restoreDb.query("DELETE FROM site_settings").run();
    }
    restoreDb.close();

    await page.goto(`${BASE}/contact`, { waitUntil: "load" });
    await page.waitForTimeout(800);
    record(
      "contact: the baseline returns after settings cleanup",
      (await page.getByText("Coming soon").count()) === 4,
      `soon=${await page.getByText("Coming soon").count()}`,
    );
  }

  await page.locator('main a[href="/start-project"]').first().click();
  await page.waitForTimeout(900);
  record(
    "routing: the contact CTA lands on the brief form",
    page.url().endsWith("/start-project") &&
      (await page.locator("[data-start-project-form]").count()) === 1,
    page.url(),
  );
  record(
    "routing: the brief page points back to Contact for general questions",
    (await page.locator('main a[href="/contact"]').count()) >= 1,
  );
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  await page.locator('footer a[href="/contact"]').first().click();
  await page.waitForTimeout(900);
  record(
    "routing: the footer Contact link reaches the contact page",
    page.url().endsWith("/contact"),
    page.url(),
  );

  /* ---------------- Start a Project ---------------- */
  const spResponse = await page.goto(`${BASE}/start-project`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(1000);
  record(
    "start-project: responds 200 with four sections",
    spResponse?.status() === 200 &&
      (await page.locator("[data-start-project-form] fieldset").count()) === 4,
  );
  const briefLegends = await page
    .locator("[data-start-project-form] legend")
    .evaluateAll((legends) => legends.map((legend) => legend.textContent.trim()));
  record(
    "start-project: sections carry the documented legends",
    JSON.stringify(briefLegends) ===
      JSON.stringify([
        "01 · Contact",
        "02 · Project",
        "03 · Production",
        "04 · References",
      ]),
    briefLegends.join(","),
  );
  const requiredLabels = await page
    .locator("[data-start-project-form] label")
    .evaluateAll((labels) =>
      labels
        .map((label) => label.textContent.trim())
        .filter((text) => text.endsWith("*")),
    );
  record(
    "start-project: required fields carry the asterisk mark",
    requiredLabels.length === 5 &&
      requiredLabels.some((label) => label.startsWith("Full Name")) &&
      requiredLabels.some((label) => label.startsWith("Project Description")),
    requiredLabels.join(","),
  );
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(400);
  record(
    "start-project: required errors explain how to fix",
    await page
      .getByText("Enter your full name so we know who to reply to.")
      .isVisible(),
  );
  record(
    "start-project: error summary announces the count",
    ((await page.locator("[data-form-error-summary]").textContent()) ?? "").includes(
      "5 highlighted",
    ),
  );
  const focusedFieldId = await page.evaluate(() =>
    document.activeElement?.getAttribute("id"),
  );
  record(
    "start-project: focus moves to the first invalid field",
    focusedFieldId === "sp-full-name",
    `id=${focusedFieldId}`,
  );
  await page.fill("#sp-full-name", "Ayu Larasati");
  await page.waitForTimeout(200);
  record(
    "start-project: editing clears the field error",
    (await page
      .getByText("Enter your full name so we know who to reply to.")
      .count()) === 0,
  );
  record(
    "start-project: budget is a free-text field (no invented ranges)",
    (await page.locator("#sp-budget").getAttribute("type")) === "text",
  );
  await page.fill("#sp-budget", "To be discussed");
  await page.fill("#sp-email", "not-an-email");
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(300);
  record(
    "start-project: email format is explained",
    await page.getByText("Enter a valid email address").isVisible(),
  );

  await page.setInputFiles("#sp-attachment", {
    name: "notes.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4 notes"),
  });
  await page.waitForTimeout(250);
  record(
    "start-project: valid attachment shows a file row",
    await page.locator("[data-attachment-selected]").isVisible(),
  );
  record(
    "start-project: valid file surfaces a ready state",
    await page.getByText("File ready").isVisible(),
  );
  await page.getByRole("button", { name: "Remove" }).click();
  await page.waitForTimeout(250);
  record(
    "start-project: remove clears the attachment",
    (await page.locator("[data-attachment-selected]").count()) === 0,
  );
  await page.setInputFiles("#sp-attachment", {
    name: "brief.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("notes"),
  });
  await page.waitForTimeout(250);
  record(
    "start-project: invalid attachment flags immediately",
    await page
      .getByText("Attachments must be PDF, JPG, JPEG, or PNG.")
      .isVisible(),
  );

  const pixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.setInputFiles("#sp-attachment", {
    name: "mood.png",
    mimeType: "image/png",
    buffer: pixelPng,
  });
  await page.fill("#sp-email", "verify-form@example.com");
  await page.selectOption("#sp-service", { label: "Photography" });
  await page.selectOption("#sp-project-type", { label: "Photography" });
  await page.fill(
    "#sp-description",
    "A photography commission for a family celebration, planned for late 2026.",
  );
  await page.fill("#sp-description", "Too short");
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(300);
  record(
    "start-project: short description explains the fix",
    await page.getByText("at least 20 characters").isVisible(),
  );
  await page.fill(
    "#sp-description",
    "A photography commission for a family celebration, planned for late 2026.",
  );
  await page.fill("#sp-reference-url", "example.com");
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(300);
  record(
    "start-project: reference URL format is explained",
    await page.getByText("Enter a full URL starting with https://").isVisible(),
  );
  await page.fill("#sp-reference-url", "https://example.com/reference");

  /* Server failure path: a clear retry message, form preserved. */
  expectedFailureUrls.add(`${BASE}/api/inquiries`);
  await page.route("**/api/inquiries", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "boom" }),
    });
  });
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(500);
  record(
    "start-project: server failures show a retry message",
    (await page
      .getByText("We could not send your brief right now.")
      .isVisible()) &&
      (await page.locator("[data-start-project-form]").count()) === 1,
  );
  await page.unroute("**/api/inquiries");

  /* Server validation mapping: issues land back on their fields. */
  await page.route("**/api/inquiries", async (route) => {
    await route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Validation failed.",
        issues: ["Choose the service closest to your project."],
      }),
    });
  });
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(500);
  record(
    "start-project: server issues map back onto fields",
    await page
      .locator("#sp-service-error")
      .getByText("Choose the service closest to your project.")
      .isVisible(),
  );
  await page.unroute("**/api/inquiries");
  expectedFailureUrls.delete(`${BASE}/api/inquiries`);

  /* Real submission, slowed so the resubmit guard is observable. */
  await page.route("**/api/inquiries", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    await route.continue();
  });
  await page.getByRole("button", { name: "Submit Project Brief" }).click();
  await page.waitForTimeout(200);
  record(
    "start-project: submit shows a guarded sending state",
    await page.getByRole("button", { name: "Sending…" }).isDisabled(),
  );
  await page.waitForTimeout(2200);
  await page.unroute("**/api/inquiries");
  record(
    "start-project: success state confirms receipt",
    await page
      .getByText("Your project brief has been received.")
      .isVisible(),
  );
  record(
    "start-project: form is replaced after submit",
    (await page.locator("[data-start-project-form]").count()) === 0 &&
      (await page.locator("[data-start-project-success]").count()) === 1,
  );
  await page.getByRole("button", { name: "Send another brief" }).click();
  await page.waitForTimeout(300);
  record(
    "start-project: send another brief resets the form",
    (await page.locator("[data-start-project-form]").count()) === 1 &&
      (await page.locator("#sp-full-name").inputValue()) === "",
  );

  /* Cleanup: remove the verification brief and its stored attachment. */
  const { Database } = await import("bun:sqlite");
  const { rmSync } = await import("node:fs");
  const formCleanupDb = new Database("data/ocassio.db");
  const formRows = formCleanupDb
    .query(
      "SELECT id, attachments FROM inquiries WHERE email = 'verify-form@example.com'",
    )
    .all();
  for (const row of formRows) {
    const list = row.attachments ? JSON.parse(row.attachments) : [];
    for (const attachment of list) {
      rmSync(attachment.storageKey, { force: true });
    }
  }
  formCleanupDb
    .query("DELETE FROM inquiries WHERE email = 'verify-form@example.com'")
    .run();
  formCleanupDb.close();
  record(
    "cleanup: the form verification brief is removed",
    formRows.length === 1,
    `rows=${formRows.length}`,
  );

  /* ---------------- Legal ---------------- */
  const privacyResponse = await page.goto(`${BASE}/privacy`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(1000);
  record(
    "privacy: responds 200 with body sections",
    privacyResponse?.status() === 200 &&
      (await page.locator('[data-section="body"] h2').count()) === 7,
  );
  const termsResponse = await page.goto(`${BASE}/terms`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "terms: responds 200 with body sections",
    termsResponse?.status() === 200 &&
      (await page.locator('[data-section="body"] h2').count()) === 3,
  );
  record(
    "footer: legal group lists both pages",
    (await page.locator('footer nav[aria-label="Footer, legal"] a').count()) ===
      2 ||
      (await page.locator('footer nav[aria-label="Footer, legal"] a').count()) ===
        2,
  );

  /* ---------------- Sitewide CTA + link sweep ---------------- */
  const ctaRoutes = [
    ["/", "home"],
    ["/work", "work"],
    ["/work/dean-and-deb", "project detail"],
    ["/journal", "journal"],
    ["/journal/life-untolds-in-monochrome", "article detail"],
    ["/services", "services"],
    ["/services/photography", "service detail"],
    ["/pricing", "pricing"],
    ["/process", "process"],
    ["/about", "about"],
    ["/contact", "contact"],
    ["/privacy", "privacy"],
    ["/terms", "terms"],
    ["/now", "now"],
  ];
  for (const [route, label] of ctaRoutes) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    const headerCta = await page
      .locator('header a[href="/start-project"]')
      .count();
    const totalCta = await page.locator('a[href="/start-project"]').count();
    record(
      `cta: ${label} carries header + page CTAs`,
      headerCta >= 1 && totalCta >= 2,
      `header=${headerCta} total=${totalCta}`,
    );
    const fakeMailtos = await page
      .locator('main a[href^="mailto:"]')
      .count();
    if (route === "/contact") {
      const mailtoHref = await page
        .locator('main a[href^="mailto:"]')
        .first()
        .getAttribute("href");
      record(
        "cta: contact ships the studio mailto once connected",
        fakeMailtos === 1 &&
          mailtoHref === "mailto:ocassio.project@gmail.com",
        `mailtos=${fakeMailtos} href=${mailtoHref}`,
      );
    } else {
      record(`cta: ${label} ships no placeholder mailto links`, fakeMailtos === 0);
    }
  }

  /* ---------------- Exclusions: newsletter & booking widgets ---------------- */
  const exclusionPhrases = [
    "Newsletter",
    "Subscribe",
    "Book now",
    "Book Now",
    "Check availability",
    "Schedule a call",
    "Request availability",
  ];
  const exclusionHits = [];
  for (const route of ["/", "/contact", "/start-project", "/about", "/now"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    const text = (await page.locator("main").textContent()) ?? "";
    for (const phrase of exclusionPhrases) {
      if (text.includes(phrase)) exclusionHits.push(`${route}: ${phrase}`);
    }
  }
  record(
    "exclusions: no newsletter or booking copy on public pages",
    exclusionHits.length === 0,
    exclusionHits.join(", "),
  );

  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  record(
    "exclusions: the footer ships no form or inputs",
    (await page.locator("footer form, footer input, footer textarea").count()) ===
      0,
  );

  for (const [route, expected] of [
    ["/", 0],
    ["/contact", 0],
    ["/start-project", 1],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(400);
    const dateInputs = await page.locator('input[type="date"]').count();
    record(
      `exclusions: date inputs on ${route} equal ${expected}`,
      dateInputs === expected,
      `count=${dateInputs}`,
    );
  }

  const sweepSources = ["/", "/services", "/about", "/work"];
  const internalLinks = new Set();
  for (const route of sweepSources) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(400);
    const hrefs = await page.$$eval("a[href^='/']", (anchors) =>
      anchors.map((anchor) => anchor.getAttribute("href")),
    );
    for (const href of hrefs) {
      if (href && !href.startsWith("//")) internalLinks.add(href.split("#")[0]);
    }
  }
  const brokenLinks = [];
  for (const href of internalLinks) {
    if (href === "/") continue;
    const response = await context.request.get(`${BASE}${href}`);
    if (response.status() >= 400) brokenLinks.push(`${href} -> ${response.status()}`);
  }
  record(
    "links: no broken internal links across key pages",
    brokenLinks.length === 0,
    brokenLinks.join(", ") || `${internalLinks.size} links checked`,
  );

  /* ---------------- Admin auth: sign in first (§27) ---------------- */
  {
    const authDb = new Database("data/ocassio.db");
    authDb
      .query(
        "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'verify-admin@example.com')",
      )
      .run();
    authDb
      .query("DELETE FROM users WHERE email = 'verify-admin@example.com'")
      .run();
    const passwordHash = await Bun.password.hash("verify-admin-password-1");
    authDb
      .query(
        "INSERT INTO users (name, email, password_hash, role, status) VALUES (?, ?, ?, 'owner', 'active')",
      )
      .run("Verify Admin", "verify-admin@example.com", passwordHash);
    authDb.close();

    await page.goto(`${BASE}/admin/website/legal`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    record(
      "admin auth: signed-out visitors land on the sign-in screen",
      page.url().endsWith("/admin/sign-in") &&
        (await page.locator("[data-sign-in-form]").count()) === 1,
      page.url(),
    );
    await page.fill("#sign-in-email", "verify-admin@example.com");
    await page.fill("#sign-in-password", "verify-admin-password-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForTimeout(1400);
    record(
      "admin auth: signing in opens the CMS",
      page.url().includes("/admin"),
      page.url(),
    );
    record(
      "admin auth: the shell shows the signed-in owner",
      (await page.getByText("Verify Admin · Owner").count()) === 1,
    );
    const adminSurface = await page.evaluate(() => {
      const wrapper = document.querySelector('[data-theme="light"]');
      return wrapper ? getComputedStyle(wrapper).backgroundColor : null;
    });
    record(
      "admin auth: the CMS stays light-first inside the dark site",
      adminSurface === "rgb(250, 250, 250)",
      `bg=${adminSurface}`,
    );
  }

  /* ---------------- Admin: Homepage panel + Legal editor ---------------- */
  await page.goto(`${BASE}/admin`, { waitUntil: "load" });
  await page.waitForTimeout(600);
  record(
    "admin: /admin redirects to homepage panel",
    page.url().endsWith("/admin/website/homepage"),
    page.url(),
  );
  const sectionKeys = await page
    .locator("[data-homepage-sections] [data-section-key]")
    .evaluateAll((elements) =>
      elements.map((element) => element.getAttribute("data-section-key")),
    );
  record(
    "admin: 11 homepage sections listed",
    sectionKeys.length === 11 &&
      sectionKeys[0] === "hero" &&
      sectionKeys[10] === "final_cta",
    sectionKeys.join(","),
  );
  const publishButton = page.getByRole("button", { name: "Publish" });
  record(
    "admin: publish gated until changes exist",
    await publishButton.isDisabled(),
  );
  const selectedWorkRow = page.locator('[data-section-key="selected_work"]');
  await selectedWorkRow.getByRole("button", { name: "Hide" }).click();
  await page.waitForTimeout(300);
  record(
    "admin: hide marks section hidden + dirty",
    (await selectedWorkRow.getByText("Hidden").isVisible()) &&
      (await page.getByText("Unsaved changes").isVisible()),
  );
  await publishButton.click();
  await page.waitForTimeout(400);
  record(
    "admin: publish shows concise toast",
    await page.getByRole("status").getByText("Homepage published.").isVisible(),
  );

  /* Restore the homepage to its default section config after the publish. */
  const homepageCleanupDb = new Database("data/ocassio.db");
  homepageCleanupDb.query("DELETE FROM homepage_sections").run();
  homepageCleanupDb.close();
  record("admin: homepage sections return to their defaults", true);

  /* The public terms page now reads the CMS, so back up its row first. */
  const termsBackupDb = new Database("data/ocassio.db");
  const termsBackup = termsBackupDb
    .query(
      "SELECT title, status, publish_at FROM legal_pages WHERE slug = 'terms'",
    )
    .get();
  termsBackupDb.close();

  await page.goto(`${BASE}/admin/website/legal`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  record(
    "admin legal: editor loads with both documents",
    (await page.getByRole("heading", { name: "Legal" }).isVisible()) &&
      (await page.locator("[data-doc-tab]").count()) === 2,
  );
  await page.locator('[data-doc-tab="terms"]').click();
  await page.waitForTimeout(300);
  await page.fill("#legal-title", "Terms of Use v2");
  await page.waitForTimeout(200);
  record(
    "admin legal: edits mark unsaved changes",
    await page.getByText("Unsaved changes").isVisible(),
  );
  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForTimeout(300);
  record(
    "admin legal: save draft confirms specifically",
    await page
      .getByRole("status")
      .getByText("Terms of Use v2 saved as draft.")
      .isVisible(),
  );

  /* Restore the public terms row the draft edit just changed. */
  const termsRestoreDb = new Database("data/ocassio.db");
  termsRestoreDb
    .query(
      "UPDATE legal_pages SET title = ?, status = ?, publish_at = ? WHERE slug = 'terms'",
    )
    .run(termsBackup.title, termsBackup.status, termsBackup.publish_at);
  termsRestoreDb.close();
  record("admin legal: the public terms page is restored", true);

  /* ---------------- Admin: Users & Roles (owner) ---------------- */
  await page.goto(`${BASE}/admin/users`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin users: the owner opens Users & Roles",
    (await page
      .getByRole("heading", { name: "Users & Roles" })
      .isVisible()) &&
      (await page
        .locator('[data-admin-user="verify-admin@example.com"]')
        .count()) === 1,
  );
  const adminUserRow = page.locator(
    '[data-admin-user="verify-admin@example.com"]',
  );
  record(
    "admin users: the row carries role and status controls",
    (await adminUserRow.locator("[data-user-role]").count()) === 1 &&
      (await adminUserRow.locator("[data-user-status]").count()) === 1 &&
      (await adminUserRow.getByText("Active", { exact: true }).first().isVisible()),
  );
  record(
    "admin users: the create form is available",
    (await page.locator("[data-user-create]").count()) === 1,
  );

  /* ---------------- Admin: Services + Studio panels ---------------- */
  await page.goto(`${BASE}/admin/services`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin services: the CMS lists the seeded services",
    (await page.locator("[data-admin-service]").count()) === 7 &&
      (await page.locator("[data-service-create]").count()) === 1,
    `rows=${await page.locator("[data-admin-service]").count()}`,
  );
  await page.goto(`${BASE}/admin/services/pricing`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin pricing: the CMS lists the seeded entries",
    (await page.locator("[data-admin-pricing]").count()) === 4,
    `rows=${await page.locator("[data-admin-pricing]").count()}`,
  );
  await page.goto(`${BASE}/admin/services/process`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin process: the CMS lists the nine steps",
    (await page.locator("[data-admin-step]").count()) === 9,
    `rows=${await page.locator("[data-admin-step]").count()}`,
  );
  await page.goto(`${BASE}/admin/studio/about`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin studio: the About editor loads the seeded content",
    (await page.locator("[data-about-form]").count()) === 1 &&
      ((await page.locator("#about-heading").inputValue()) ?? "").length > 0,
  );

  /* Seam: a real CMS save must reach the public page, then be restored. */
  const { Database: SeamDatabase } = await import("bun:sqlite");
  const seamDb = new SeamDatabase("data/ocassio.db");
  const seamBaseline = seamDb
    .query(
      "SELECT id, heading, body, supporting_media_id FROM studio_about ORDER BY id LIMIT 1",
    )
    .get();
  const seamBaselineMaxVersion = seamBaseline
    ? seamDb
        .query(
          "SELECT COALESCE(MAX(version_no), 0) AS max FROM version_history WHERE entity_type = 'studio_about' AND entity_id = ?",
        )
        .get(seamBaseline.id).max
    : 0;
  const seamHeading = `Seam check ${Date.now()}`;
  await page.fill("#about-heading", seamHeading);
  await page.getByRole("button", { name: "Save About" }).click();
  await page
    .locator('[data-about-form] [role="status"]')
    .waitFor({ state: "visible", timeout: 10000 });
  await page.goto(`${BASE}/about`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  const seamPublicHeading =
    (await page.locator('[data-section="about"] h2').first().textContent())?.trim() ??
    "";
  record(
    "seam: saving About in the CMS updates the public page",
    seamPublicHeading.includes(seamHeading),
    `h2=${seamPublicHeading.slice(0, 50)}`,
  );
  if (seamBaseline) {
    seamDb
      .query(
        "UPDATE studio_about SET heading = ?, body = ?, supporting_media_id = ? WHERE id = ?",
      )
      .run(
        seamBaseline.heading,
        seamBaseline.body,
        seamBaseline.supporting_media_id,
        seamBaseline.id,
      );
    seamDb
      .query(
        "DELETE FROM version_history WHERE entity_type = 'studio_about' AND entity_id = ? AND version_no > ?",
      )
      .run(seamBaseline.id, seamBaselineMaxVersion);
  } else {
    seamDb.query("DELETE FROM studio_about").run();
    seamDb
      .query("DELETE FROM version_history WHERE entity_type = 'studio_about'")
      .run();
  }
  seamDb.close();
  await page.goto(`${BASE}/about`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  const seamRestoredHeading =
    (await page.locator('[data-section="about"] h2').first().textContent())?.trim() ??
    "";
  record(
    "seam: restoring the About baseline returns the public page",
    seamBaseline
      ? seamRestoredHeading.includes(seamBaseline.heading)
      : seamRestoredHeading.length > 0,
    `h2=${seamRestoredHeading.slice(0, 50)}`,
  );
  await page.goto(`${BASE}/admin/studio/team`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin studio: the Team panel lists the studio roster and the create form",
    (await page.locator("[data-admin-member]").count()) >= 1 &&
      (await page.locator("[data-member-create]").count()) === 1,
  );
  await page.goto(`${BASE}/admin/studio/clients`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin studio: the Clients panel keeps the honest empty state",
    await page.getByText("No clients yet.").isVisible(),
  );
  await page.goto(`${BASE}/admin/studio/recognition`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin studio: the Recognition panel keeps the honest empty state",
    await page.getByText("No entries yet.").isVisible(),
  );

  /* ---------------- Admin: Journal Articles (§17) ---------------- */
  await page.goto(`${BASE}/admin/journal/articles`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  record(
    "admin journal: the Articles panel lists the four stories with the composer",
    (await page.locator("[data-admin-article]").count()) >= 4 &&
      (await page.locator("[data-article-create]").count()) === 1,
    `rows=${await page.locator("[data-admin-article]").count()}`,
  );
  await page
    .locator("[data-admin-article]")
    .first()
    .getByRole("button", { name: "Edit" })
    .click();
  await page.waitForTimeout(1200);
  record(
    "admin journal: the editor carries fields and the block composer",
    (await page.locator("[data-article-editor]").count()) === 1 &&
      ((await page.locator("#article-title").inputValue()) ?? "").length > 0 &&
      ((await page.locator("#article-slug").inputValue()) ?? "").length > 0 &&
      (await page.locator("[data-block-row]").count()) >= 1 &&
      (await page.locator("[data-article-save]").count()) === 1,
  );

  /* ---------------- Admin: Global Settings (§10.3) ---------------- */
  await page.goto(`${BASE}/admin/website/settings`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin settings: the panel carries identity, contact and SEO fields",
    (await page.locator("[data-settings-form]").count()) === 1 &&
      (await page.locator("#settings-studio-name").count()) === 1 &&
      (await page.locator("#settings-tagline").count()) === 1 &&
      (await page.locator("#settings-email").count()) === 1 &&
      (await page.locator("#settings-instagram").count()) === 1 &&
      (await page.locator("#settings-seo-title").count()) === 1,
  );

  /* ---------------- Admin: Navigation (§10.2) ---------------- */
  await page.goto(`${BASE}/admin/website/navigation`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin navigation: the panel offers create fields and the honest empty state",
    (await page.locator("[data-navigation-list]").count()) === 1 &&
      (await page.locator("#nav-new-label").count()) === 1 &&
      (await page.locator("#nav-new-href").count()) === 1 &&
      (await page
        .getByText("The built-in studio menu is in use")
        .isVisible()),
  );

  /* ---------------- Admin: Media Library (§20) ---------------- */
  await page.goto(`${BASE}/admin/media`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin media: the library carries filters and the honest list",
    (await page.locator("[data-media-list]").count()) === 1 &&
      (await page.locator("#media-search").count()) === 1 &&
      (await page.locator("#media-type-filter").count()) === 1,
  );

  /* ---------------- Admin: Publishing queues (§8) ---------------- */
  await page.goto(`${BASE}/admin/publishing`, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  record(
    "admin publishing: the queues offer the three tabs",
    (await page.locator("[data-publishing-tab]").count()) === 3,
  );
  await page.locator('[data-publishing-tab="published"]').click();
  await page.waitForTimeout(1000);
  record(
    "admin publishing: the published queue lists real content",
    (await page.locator("[data-publishing-row]").count()) >= 1,
    `rows=${await page.locator("[data-publishing-row]").count()}`,
  );

  /* ---------------- Admin: Versions (§25) ---------------- */
  await page.goto(`${BASE}/admin/publishing/versions`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin versions: the panel offers entity lookup",
    (await page.locator("#versions-entity-type").count()) === 1 &&
      (await page.locator("#versions-entity-id").count()) === 1 &&
      (await page.getByRole("button", { name: "Load versions" }).count()) === 1,
  );

  /* ---------------- Admin: Activity log + SEO ---------------- */
  await page.goto(`${BASE}/admin/activity`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin activity: the log renders its list",
    (await page.locator("[data-activity-list]").count()) === 1,
  );
  await page.goto(`${BASE}/admin/seo`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin seo: the overview lists articles and services with their metadata state",
    (await page.locator("[data-seo-articles]").count()) === 1 &&
      (await page.locator("[data-seo-services]").count()) === 1,
  );

  /* ---------------- Admin: Portfolio Projects (§11, §12) ---------------- */
  await page.goto(`${BASE}/admin/portfolio/projects`, { waitUntil: "load" });
  await page.waitForTimeout(1400);
  record(
    "admin portfolio: the Projects panel lists the seeded projects",
    (await page.locator("[data-admin-project]").count()) >= 5,
    `rows=${await page.locator("[data-admin-project]").count()}`,
  );
  await page
    .locator("[data-admin-project]")
    .first()
    .getByRole("button", { name: "Edit" })
    .click();
  await page.waitForTimeout(1200);
  record(
    "admin portfolio: the editor carries fields and the save action",
    (await page.locator("[data-project-editor]").count()) === 1 &&
      ((await page.locator("#project-title").inputValue()) ?? "").length > 0 &&
      ((await page.locator("#project-slug").inputValue()) ?? "").length > 0 &&
      (await page.locator("#project-category option").count()) === 7 &&
      (await page.locator("[data-project-save]").count()) === 1,
  );

  /* ---------------- Admin: Account (§27) ---------------- */
  await page.goto(`${BASE}/admin/account`, { waitUntil: "load" });
  await page.waitForTimeout(1000);
  record(
    "admin account: the self-service password form renders",
    (await page.locator("[data-account-form]").count()) === 1 &&
      (await page.locator("#account-current-password").count()) === 1 &&
      (await page.locator("#account-new-password").count()) === 1,
  );

  /* ---------------- Admin: Project Inquiries list ---------------- */
  record(
    "admin inquiries: sidebar links the queue",
    (await page
      .locator('nav[aria-label="Admin"] a[href="/admin/business/inquiries"]')
      .count()) === 1,
  );

  const seedResponse = await context.request.post(`${BASE}/api/inquiries`, {
    data: {
      fullName: "Verify Admin Client",
      company: "Verification Co",
      email: "verify-admin@example.com",
      service: "Photography",
      projectType: "Photography",
      description:
        "A verification brief created for the admin list view, end to end.",
    },
  });
  record(
    "admin inquiries: a brief can be created for verification",
    seedResponse.status() === 201,
    `status=${seedResponse.status()}`,
  );

  await page.goto(`${BASE}/admin/business/inquiries`, { waitUntil: "load" });
  await page.waitForTimeout(800);
  const inquiryRows = page.locator("[data-inquiry-row]");
  // The dev database can already hold real studio inquiries, so the
  // checks anchor on the row this suite created instead of exact counts.
  const verifyRow = page
    .locator("[data-inquiry-row]")
    .filter({ hasText: "Verify Admin Client" });
  record(
    "admin inquiries: the queue lists the new brief",
    (await inquiryRows.count()) >= 1 &&
      (await verifyRow.count()) === 1 &&
      ((await verifyRow.first().textContent()) ?? "").includes("New"),
    `rows=${await inquiryRows.count()}`,
  );
  record(
    "admin inquiries: row shows channel metadata",
    ((await verifyRow.first().textContent()) ?? "").includes(
      "verify-admin@example.com",
    ) &&
      ((await verifyRow.first().textContent()) ?? "").includes(
        "Verification Co",
      ),
  );

  await page.goto(`${BASE}/admin/business/inquiries?status=new`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(600);
  record(
    "admin inquiries: stage filter keeps matching rows",
    (await page.locator("[data-inquiry-row]").count()) >= 1 &&
      (await page
        .locator("[data-inquiry-row]")
        .filter({ hasText: "Verify Admin Client" })
        .count()) === 1,
  );
  await page.goto(`${BASE}/admin/business/inquiries?status=booked`, {
    waitUntil: "load",
  });
  await page.waitForTimeout(600);
  record(
    "admin inquiries: empty stages show the documented empty state",
    (await page.locator("[data-inquiries-empty]").count()) === 1 &&
      (await page.getByText("No inquiries in this stage yet.").isVisible()),
  );

  /* Cleanup the verification inquiry. */
  const adminCleanupDb = new Database("data/ocassio.db");
  adminCleanupDb
    .query("DELETE FROM inquiries WHERE email = 'verify-admin@example.com'")
    .run();
  adminCleanupDb.close();
  record("cleanup: the admin verification brief is removed", true);

  /* Sign out (§27). */
  await page.locator("[data-sign-out]").click();
  await page.waitForTimeout(1200);
  record(
    "admin auth: signing out lands on the sign-in screen",
    page.url().endsWith("/admin/sign-in"),
    page.url(),
  );
  await page.goto(`${BASE}/admin/website/legal`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  record(
    "admin auth: the session is gone after sign-out",
    page.url().endsWith("/admin/sign-in"),
    page.url(),
  );

  /* Cleanup the verification admin account (sessions first). */
  const adminUserCleanupDb = new Database("data/ocassio.db");
  adminUserCleanupDb
    .query(
      "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = 'verify-admin@example.com')",
    )
    .run();
  adminUserCleanupDb
    .query("DELETE FROM users WHERE email = 'verify-admin@example.com'")
    .run();
  adminUserCleanupDb.close();
  record("cleanup: the verification admin account is removed", true);

  await context.close();
}

/* ================= Mobile ================= */
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  wire(page, "-mobile");

  await page.goto(`${BASE}/work`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  await page.locator("[data-menu-trigger]").click();
  await page.waitForTimeout(900);
  const menuVisible = await page.locator("#mobile-menu").isVisible();
  record("mobile: menu opens", menuVisible);
  record(
    "mobile: menu lists all essential nav",
    (await page.locator("#mobile-menu [data-menu-link]").count()) === 6 &&
      (await page
        .locator("#mobile-menu")
        .getByRole("link", { name: "Journal" })
        .isVisible()),
  );
  const activeUnderline = await page.evaluate(() => {
    const active = document.querySelector('#mobile-menu a[aria-current="page"]');
    const underline = active?.querySelector("[data-menu-underline]");
    return {
      href: active?.getAttribute("href"),
      transform: underline ? getComputedStyle(underline).transform : null,
    };
  });
  record(
    "mobile: the current page keeps its accent underline in the menu",
    activeUnderline.href === "/work" &&
      (activeUnderline.transform ?? "").startsWith("matrix(1"),
    JSON.stringify(activeUnderline),
  );
  record(
    "mobile: the menu carries the secondary links, CTA and theme toggle",
    (await page.locator("#mobile-menu [data-menu-secondary] a").count()) === 2 &&
      (await page.locator('#mobile-menu a[href="/start-project"]').count()) ===
        1 &&
      (await page.locator("#mobile-menu [data-theme-toggle]").count()) === 1,
  );

  /* Page transition loader: covers navigation with one bare animation. */
  await page.locator('#mobile-menu a[href="/journal"]').click();
  await page.waitForTimeout(350);
  const loaderShown = (await page.locator("[data-nav-loader]").count()) === 1;
  const loaderBranding = await page.evaluate(() => ({
    marks: document.querySelectorAll("[data-loader-mark]").length,
    brandArt: document.querySelectorAll(
      "[data-nav-loader] img, [data-nav-loader] svg",
    ).length,
    logos: document.querySelectorAll("[data-loader-logo]").length,
  }));
  record(
    "transitions: the loader plays the bare animation with no brand art",
    loaderBranding.marks === 1 &&
      loaderBranding.brandArt === 0 &&
      loaderBranding.logos === 0,
    JSON.stringify(loaderBranding),
  );
  const loaderMetrics = await page.evaluate(() => {
    const grid = document.querySelector("[data-loader-mark]");
    const square = grid?.querySelector("span");
    const rect = grid?.getBoundingClientRect();
    const squareRect = square?.getBoundingClientRect();
    return {
      columns: grid ? getComputedStyle(grid).gridTemplateColumns : "",
      square: squareRect ? Math.round(squareRect.width) : -1,
      centerX: rect ? Math.round(rect.left + rect.width / 2) : -1,
      centerY: rect ? Math.round(rect.top + rect.height / 2) : -1,
      viewportX: Math.round(window.innerWidth / 2),
      viewportY: Math.round(window.innerHeight / 2),
    };
  });
  record(
    "transitions: the loader is a normal-size animation centered on screen",
    loaderMetrics.columns === "12px 12px 12px" &&
      loaderMetrics.square === 12 &&
      Math.abs(loaderMetrics.centerX - loaderMetrics.viewportX) <= 1 &&
      Math.abs(loaderMetrics.centerY - loaderMetrics.viewportY) <= 1,
    JSON.stringify(loaderMetrics),
  );
  await page.waitForTimeout(1900);
  record(
    "transitions: the loader covers internal navigation and clears itself",
    loaderShown &&
      (await page.locator("[data-nav-loader]").count()) === 0 &&
      page.url().endsWith("/journal"),
    `shown=${loaderShown}`,
  );
  record(
    "transitions: the kinetic menu closes on navigation",
    (await page.locator("#mobile-menu").count()) === 0,
  );

  /* Slow navigation: the loader waits for the new page to commit. */
  await page.goto(`${BASE}/work`, { waitUntil: "load" });
  await page.waitForTimeout(900);
  await page.locator("[data-menu-trigger]").click();
  await page.waitForTimeout(900);
  await page.route("**/journal*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2200));
    await route.continue();
  });
  await page.locator('#mobile-menu a[href="/journal"]').click();
  await page.waitForTimeout(1800);
  const slowNav = await page.evaluate(() => ({
    loader: document.querySelectorAll("[data-nav-loader]").length,
    path: window.location.pathname,
  }));
  record(
    "transitions: a slow navigation keeps the loader past its minimum",
    slowNav.loader === 1 && slowNav.path === "/work",
    JSON.stringify(slowNav),
  );
  await page.waitForTimeout(2500);
  record(
    "transitions: the loader clears only after the new page commits",
    (await page.locator("[data-nav-loader]").count()) === 0 &&
      page.url().endsWith("/journal"),
  );
  await page.unroute("**/journal*");

  /* Theme toggle plays the same, logo-free transition. */
  await page.locator("[data-theme-toggle]").first().click();
  await page.waitForTimeout(450);
  const themeMid = await page.evaluate(() => ({
    loader: document.querySelectorAll("[data-nav-loader]").length,
    theme: document.documentElement.getAttribute("data-theme"),
    marks: document.querySelectorAll("[data-nav-loader] [data-loader-mark]").length,
    brandArt: document.querySelectorAll("[data-nav-loader] img").length,
  }));
  record(
    "transitions: the theme toggle plays the same logo-free loader",
    themeMid.loader === 1 &&
      themeMid.theme === "light" &&
      themeMid.marks === 1 &&
      themeMid.brandArt === 0,
    JSON.stringify(themeMid),
  );
  await page.waitForTimeout(2200);
  record(
    "transitions: the theme loader clears itself",
    (await page.locator("[data-nav-loader]").count()) === 0,
  );
  await page.evaluate(() => {
    try {
      localStorage.setItem("ocassio-theme", "dark");
    } catch {}
  });

  /* Media skeleton: placeholders show while media loads, then clear.
     Media requests are held (not merely delayed) so the probe is
     independent of dev hydration latency, then released to prove the
     placeholders clear once the photos arrive. */
  const heldMediaRequests = [];
  await page.route("**/media/photos/**", (route) => {
    heldMediaRequests.push(route);
  });
  await page.goto(`${BASE}/work`, { waitUntil: "domcontentloaded" });
  let skeletonsWhileLoading = 0;
  for (let attempt = 0; attempt < 150; attempt++) {
    skeletonsWhileLoading = await page
      .locator("[data-media-skeleton]")
      .count();
    if (skeletonsWhileLoading > 0) break;
    await page.waitForTimeout(200);
  }
  for (const held of heldMediaRequests) {
    await held.continue().catch(() => {});
  }
  let skeletonsAfterLoad = skeletonsWhileLoading;
  for (let attempt = 0; attempt < 100; attempt++) {
    skeletonsAfterLoad = await page.locator("[data-media-skeleton]").count();
    if (skeletonsAfterLoad === 0) break;
    await page.waitForTimeout(200);
  }
  record(
    "loading: media skeleton shows while photos load, then fades out",
    skeletonsWhileLoading > 0 && skeletonsAfterLoad === 0,
    `during=${skeletonsWhileLoading} after=${skeletonsAfterLoad}`,
  );
  await page.unroute("**/media/photos/**");

  for (const route of ["/work", "/services", "/contact", "/journal"]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    record(`mobile: no horizontal scroll on ${route}`, !overflow);
  }

  for (const route of [
    "/services/film-and-motion",
    "/pricing",
    "/process",
    "/about",
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(700);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    record(`mobile: no horizontal scroll on ${route}`, !overflow);
  }

  /* Info page grids collapse to one column on mobile. */
  await page.goto(`${BASE}/pricing`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  const mobilePricingRow = await page
    .locator("[data-pricing-entry]")
    .first()
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  record(
    "mobile: pricing rows stack to a single column",
    mobilePricingRow.split(" ").length === 1,
    `columns=${mobilePricingRow.split(" ").length}`,
  );
  await page.goto(`${BASE}/services`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  const mobileServicesGrid = await page
    .locator("[data-service-card]")
    .first()
    .evaluate((element) => getComputedStyle(element.parentElement).gridTemplateColumns);
  record(
    "mobile: services grid collapses to one column",
    mobileServicesGrid.split(" ").length === 1,
    `columns=${mobileServicesGrid.split(" ").length}`,
  );

  await context.close();
}

/* ================= Tablet ================= */
{
  const context = await browser.newContext({
    viewport: { width: 768, height: 1024 },
    hasTouch: true,
  });
  const page = await context.newPage();
  wire(page, "-tablet");

  for (const route of [
    "/services",
    "/services/film-and-motion",
    "/pricing",
    "/process",
    "/about",
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "load" });
    await page.waitForTimeout(600);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth + 1,
    );
    record(`tablet: no horizontal scroll on ${route}`, !overflow);
  }

  await context.close();
}

/* ================= Reduced motion ================= */
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  wire(page, "-reduced");

  await page.goto(`${BASE}/work`, { waitUntil: "load" });
  await page.waitForTimeout(700);
  const opacity = await page
    .locator("[data-work-card]")
    .first()
    .evaluate((element) => getComputedStyle(element).opacity);
  record(
    "reduced-motion: content visible without animation",
    Number(opacity) > 0.9,
    `opacity=${opacity}`,
  );

  await context.close();
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
