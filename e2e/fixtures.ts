import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page, type TestInfo } from "@playwright/test";

/*
 * What every page test shares. A page is opened in one window size, with every error the page
 * logs collected, and then looked at in each theme: it is screenshotted, checked for the
 * failures the plan names (text that overflows on a phone, layout jumps while loading,
 * unstyled defaults, figures that do not fit) and checked with axe.
 */

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Every rule for WCAG 2.2 levels A and AA. */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

/** A layout shift score at or below this is "good" in Core Web Vitals. */
export const MAX_LAYOUT_SHIFT = 0.1;

type Fixtures = { errors: string[] };

export const test = base.extend<Fixtures>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(`Uncaught: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`Console: ${m.text()}`);
      });
      // Adds up layout shifts from the first paint on, leaving out those just after input.
      await page.addInitScript(() => {
        const w = window as unknown as { __shift: number };
        w.__shift = 0;
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!e.hadRecentInput) w.__shift += e.value;
            }
          }).observe({ type: "layout-shift", buffered: true });
        } catch {
          // Layout shifts are measured only where the browser reports them.
        }
      });
      await use(errors);
      expect(errors, "The page logged errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Opens a page and waits until its content has come from Derive's server and is on screen, its
 * fonts are in and the network is quiet. GitHub Pages serves a page that does not exist with
 * status 404, and the content then says so.
 */
export async function open(page: Page, path: string, status = 200) {
  const response = await page.goto(path, { waitUntil: "load" });
  expect(response?.status(), `${path} answered ${response?.status()}`).toBe(status);
  await page.waitForSelector("html[data-page]", { timeout: 30_000 });
  expect(await page.locator("html").getAttribute("data-page"), `${path} shows its content`).toBe(status === 404 ? "not-found" : "ready");
  await settle(page);
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
}

/** Switches the system theme, which a learner who has not chosen one follows. */
export async function switchTheme(page: Page, theme: Theme) {
  await page.emulateMedia({ colorScheme: theme });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
}

/**
 * Layout failures, in words: anything wider than the window that is not inside something that
 * scrolls or clips it, content cut off sideways by its own box, the browser's default font or
 * background showing, and a font that failed to load.
 */
export async function layoutProblems(page: Page): Promise<string[]> {
  const width = page.viewportSize()!.width;
  return page.evaluate((vw) => {
    const problems: string[] = [];
    const name = (el: Element) => {
      const id = el.id ? `#${el.id}` : "";
      const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
      const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 50);
      return `<${el.tagName.toLowerCase()}${id}${cls}>${text ? ` "${text}"` : ""}`;
    };
    const visible = (el: Element) => {
      const s = getComputedStyle(el);
      return s.display !== "none" && s.visibility !== "hidden" && Number(s.opacity) > 0;
    };

    const doc = document.documentElement;
    if (doc.scrollWidth > vw + 1) problems.push(`The page is ${doc.scrollWidth}px wide in a ${vw}px window.`);

    // Something reaching past either side of the window, unless an ancestor that fits scrolls
    // or clips it. Only the outermost such element is named.
    const named: Element[] = [];
    for (const el of document.body.querySelectorAll("*")) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.right <= vw + 1 && r.left >= -1) continue;
      if (!visible(el) || named.some((n) => n.contains(el))) continue;
      let held = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.overflowX !== "visible" || s.position === "fixed") {
          const ar = a.getBoundingClientRect();
          if (ar.right <= vw + 1 && ar.left >= -1) {
            held = true;
            break;
          }
        }
      }
      if (held) continue;
      // A fixed panel moved out of the window on purpose, such as a closed drawer, is not shown.
      if (getComputedStyle(el).position === "fixed" && (r.left >= vw || r.right <= 0)) continue;
      named.push(el);
      problems.push(`${name(el)} reaches from ${Math.round(r.left)}px to ${Math.round(r.right)}px in a ${vw}px window.`);
    }

    // Content cut off sideways by a box that hides its overflow, other than on purpose with an
    // ellipsis, and other than text kept for screen readers only.
    for (const el of document.body.querySelectorAll("*")) {
      if (!(el instanceof HTMLElement) || !visible(el)) continue;
      const s = getComputedStyle(el);
      if (s.overflowX !== "hidden" && s.overflowX !== "clip") continue;
      const r = el.getBoundingClientRect();
      if (s.textOverflow === "ellipsis" || r.width <= 2 || r.height <= 2 || s.clipPath === "inset(50%)") continue;
      if (el.scrollWidth > el.clientWidth + 1) {
        problems.push(`${name(el)} cuts off ${el.scrollWidth - el.clientWidth}px of its content.`);
      }
    }

    const body = getComputedStyle(document.body);
    if (/^"?(times|serif)/i.test(body.fontFamily)) problems.push(`The page is set in the browser's default font (${body.fontFamily}).`);
    if (body.backgroundColor === "rgba(0, 0, 0, 0)" && getComputedStyle(doc).backgroundColor === "rgba(0, 0, 0, 0)") {
      problems.push("The page has no background colour of its own.");
    }
    for (const f of document.fonts) {
      if (f.status === "error") problems.push(`The font ${f.family} ${f.weight} failed to load.`);
    }
    return problems;
  }, width);
}

/** The layout shift so far, added up since the page began to load. */
export async function layoutShift(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __shift: number }).__shift ?? 0);
}

/** Axe's WCAG 2.2 A and AA violations, one line each with the elements that fail. */
export async function axeViolations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map((v) => {
    const targets = v.nodes.slice(0, 4).map((n) => n.target.join(" "));
    const more = v.nodes.length > 4 ? ` and ${v.nodes.length - 4} more` : "";
    return `${v.id} (${v.impact}): ${v.help}. ${targets.join("; ")}${more}`;
  });
}

/**
 * Problems with the lesson figures on the page: each needs a title, a description and room. A
 * picture may be wider than its figure only inside a box of the figure that scrolls sideways, as
 * a wide expression tree does once it has shrunk as far as its text allows.
 */
export async function figureProblems(page: Page): Promise<string[]> {
  const width = page.viewportSize()!.width;
  return page.evaluate((vw) => {
    const problems: string[] = [];
    const scrolledIn = (pic: Element, fig: Element) => {
      const r = fig.getBoundingClientRect();
      for (let a = pic.parentElement; a && a !== fig; a = a.parentElement) {
        const overflow = getComputedStyle(a).overflowX;
        if ((overflow === "auto" || overflow === "scroll") && a.getBoundingClientRect().right <= r.right + 1) return true;
      }
      return false;
    };
    for (const [i, fig] of [...document.querySelectorAll("figure[aria-labelledby]")].entries()) {
      const r = fig.getBoundingClientRect();
      const title = document.getElementById(fig.getAttribute("aria-labelledby") ?? "")?.textContent?.trim() ?? "";
      const label = title || `figure ${i + 1}`;
      if (r.width < 2 || r.height < 2) continue;
      if (!title) problems.push(`Figure ${i + 1} has no title.`);
      if (!fig.querySelector("figcaption")?.textContent?.trim()) problems.push(`"${label}" has no description.`);
      if (r.left < -1 || r.right > vw + 1) problems.push(`"${label}" reaches from ${Math.round(r.left)}px to ${Math.round(r.right)}px in a ${vw}px window.`);
      for (const pic of fig.querySelectorAll("svg[role=img], canvas")) {
        const p = pic.getBoundingClientRect();
        if (p.width < 2 || p.height < 2) problems.push(`"${label}" has a picture with no size.`);
        else if (p.right > r.right + 1 && !scrolledIn(pic, fig)) problems.push(`"${label}" has a picture ${Math.round(p.right - r.right)}px wider than the figure.`);
      }
    }
    return problems;
  }, width);
}

/** A full-page screenshot, kept with the test's results and attached to its report. */
export async function screenshot(page: Page, testInfo: TestInfo, name: string) {
  const file = testInfo.outputPath(`${name}.jpeg`);
  await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 70, animations: "disabled", caret: "hide" });
  await testInfo.attach(name, { path: file, contentType: "image/jpeg" });
}

/** A screenshot of each lesson figure on the page, attached to the test's report. */
export async function figureScreenshots(page: Page, testInfo: TestInfo, theme: Theme) {
  const figures = page.locator("figure[aria-labelledby]");
  const n = await figures.count();
  for (let i = 0; i < n; i++) {
    const fig = figures.nth(i);
    if (!(await fig.isVisible())) continue;
    const file = testInfo.outputPath(`figure-${i + 1}-${theme}.jpeg`);
    await fig.screenshot({ path: file, type: "jpeg", quality: 80, animations: "disabled", caret: "hide" });
    await testInfo.attach(`figure ${i + 1}, ${theme}`, { path: file, contentType: "image/jpeg" });
  }
  return n;
}

/**
 * Everything a page must pass, in both themes: it is opened once at this window size, then
 * looked at in light and in dark.
 */
export async function checkPage(page: Page, testInfo: TestInfo, path: string, options: { status?: number; figures?: boolean } = {}) {
  await switchTheme(page, "light");
  await open(page, path, options.status ?? 200);
  const shift = await layoutShift(page);
  for (const theme of THEMES) {
    await switchTheme(page, theme);
    await screenshot(page, testInfo, theme);
    if (options.figures) await figureScreenshots(page, testInfo, theme);
    expect.soft(await layoutProblems(page), `Layout in the ${theme} theme`).toEqual([]);
    if (options.figures) expect.soft(await figureProblems(page), `Figures in the ${theme} theme`).toEqual([]);
    expect.soft(await axeViolations(page), `Axe in the ${theme} theme`).toEqual([]);
  }
  expect.soft(shift, "Layout shift while loading").toBeLessThanOrEqual(MAX_LAYOUT_SHIFT);
}
