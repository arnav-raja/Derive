import { expect, test, type Page } from "@playwright/test";

import { LEARNERS } from "./learners";
import { PHASES, writtenLessons } from "./store";

/*
 * Performance budgets. Each page is loaded once, at desktop width, with an empty cache, and
 * what it takes to show it is measured: the bytes of script, style, fonts and HTML sent over
 * the network (compressed, as served; the HTML counts the page's content from Derive's server
 * as well as the static page around it), and the number of elements on the page. A page over its
 * budget fails the build. Bytes and elements are the same on every run, so the budgets hold on
 * any machine; times are not, so they are not budgeted.
 *
 * A budget is raised only on purpose, with the reason in the commit. Each is about 15 per cent
 * above what the page measured when it was set, on 6 November 2026, with all 12 phase 1
 * lessons written; each test's "measured" annotation in the report gives the page's sizes now.
 */

type Measure = { js: number; css: number; fonts: number; html: number; elements: number };
type Budget = Measure;

const KB = 1024;

/** Budgets for the app's pages, for a learner who has finished every written lesson. */
const PAGE_BUDGETS: Record<string, Budget> = {
  "/today": { js: 210 * KB, css: 20 * KB, fonts: 85 * KB, html: 12 * KB, elements: 300 },
  "/curriculum": { js: 210 * KB, css: 20 * KB, fonts: 85 * KB, html: 77 * KB, elements: 2_000 },
  "/courses/M1": { js: 210 * KB, css: 20 * KB, fonts: 85 * KB, html: 20 * KB, elements: 750 },
  "/lessons/M1.1": { js: 520 * KB, css: 21 * KB, fonts: 120 * KB, html: 16 * KB, elements: 450 },
  "/review": { js: 465 * KB, css: 21 * KB, fonts: 265 * KB, html: 12 * KB, elements: 300 },
  "/notebook": { js: 210 * KB, css: 21 * KB, fonts: 220 * KB, html: 12 * KB, elements: 300 },
  "/progress": { js: 210 * KB, css: 20 * KB, fonts: 85 * KB, html: 25 * KB, elements: 900 },
  "/settings": { js: 215 * KB, css: 20 * KB, fonts: 85 * KB, html: 12 * KB, elements: 400 },
  "/placement?course=E1": { js: 465 * KB, css: 21 * KB, fonts: 220 * KB, html: 10 * KB, elements: 250 },
  // Raised from 180 KB on 6 November, when sign-in moved into the browser for GitHub Pages: the
  // page now carries Supabase's auth client and the form's checks (201 KB measured).
  "/sign-in": { js: 230 * KB, css: 20 * KB, fonts: 140 * KB, html: 9 * KB, elements: 200 },
};

/**
 * One budget for every phase of every lesson, since they share the workspace. The largest
 * phases set it: M1.4's Derive for HTML (73 KB) and elements (7,987, most of them KaTeX's) and
 * M1.4's Explore for fonts (628 KB, with KaTeX's).
 */
const PHASE_BUDGET: Budget = { js: 525 * KB, css: 21 * KB, fonts: 725 * KB, html: 85 * KB, elements: 9_200 };

async function measure(page: Page, path: string): Promise<Measure> {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response?.status(), `${path} answered ${response?.status()}`).toBe(200);
  await page.waitForSelector("html[data-page=ready]", { timeout: 30_000 });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const out = { js: 0, css: 0, fonts: 0, html: nav?.encodedBodySize ?? 0, elements: document.getElementsByTagName("*").length };
    for (const e of performance.getEntriesByType("resource") as PerformanceResourceTiming[]) {
      const url = new URL(e.name);
      // The page's content, from Derive's server, counts with its HTML.
      if (url.pathname.endsWith("/_derive/page")) {
        out.html += e.encodedBodySize;
        continue;
      }
      // Prefetches for later pages, made once the page is up, are not part of showing it.
      if (e.initiatorType === "fetch" || e.initiatorType === "xmlhttprequest") continue;
      if (/\.m?js$/.test(url.pathname)) out.js += e.encodedBodySize;
      else if (/\.css$/.test(url.pathname)) out.css += e.encodedBodySize;
      else if (/\.(woff2?|ttf|otf)$/.test(url.pathname)) out.fonts += e.encodedBodySize;
    }
    return out;
  });
}

const kb = (n: number) => `${(n / KB).toLocaleString("en-GB", { maximumFractionDigits: 1 })} KB`;

function report(path: string, m: Measure) {
  return `${path}: js ${kb(m.js)}, css ${kb(m.css)}, fonts ${kb(m.fonts)}, html ${kb(m.html)}, ${m.elements.toLocaleString("en-GB")} elements`;
}

function within(path: string, m: Measure, b: Budget) {
  for (const key of ["js", "css", "fonts", "html"] as const) {
    expect.soft(m[key], `${path} sends ${kb(m[key])} of ${key}, over its budget of ${kb(b[key])}`).toBeLessThanOrEqual(b[key]);
  }
  expect.soft(m.elements, `${path} has ${m.elements} elements, over its budget of ${b.elements}`).toBeLessThanOrEqual(b.elements);
}

test.use({ baseURL: LEARNERS.finished.url });

for (const [path, budget] of Object.entries(PAGE_BUDGETS)) {
  test(path, async ({ page }, testInfo) => {
    const m = await measure(page, path);
    testInfo.annotations.push({ type: "measured", description: report(path, m) });
    within(path, m, budget);
  });
}

for (const lesson of writtenLessons()) {
  test(`${lesson.code} phases`, async ({ browser }, testInfo) => {
    for (const phase of PHASES) {
      // A fresh window for each phase, so that nothing is already cached.
      const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      const page = await context.newPage();
      const path = `/lessons/${lesson.code}/${phase}`;
      const m = await measure(page, `${LEARNERS.finished.url}${path}`);
      testInfo.annotations.push({ type: "measured", description: report(path, m) });
      within(path, m, PHASE_BUDGET);
      await context.close();
    }
  });
}
