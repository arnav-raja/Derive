import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/*
 * Checks the colour tokens in globals.css against WCAG 2.2 AA: every text
 * token on every surface at 4.5:1, and figure colours at 3:1.
 */

const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`Missing ${selector}`);
  const open = css.indexOf("{", start);
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(open + 1, end);
  const tokens: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    tokens[m[1]!] = m[2]!.toLowerCase();
  }
  return tokens;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const themes = {
  light: block(":root {"),
  dark: block(':root[data-theme="dark"]'),
};

const surfaces = ["paper", "surface", "inset"];
const text = ["ink", "ink-muted", "ink-faint", "accent", "correct", "incorrect", "hint", "warning"];
const states = ["accent", "correct", "incorrect", "hint", "warning"];
const figures = ["fig-vector", "fig-gradient", "fig-mass", "fig-point", "fig-axis"];

describe.each(Object.entries(themes))("%s theme", (_name, t) => {
  it.each(text.flatMap((fg) => surfaces.map((bg) => [fg, bg])))(
    "%s on %s meets 4.5:1",
    (fg, bg) => {
      expect(contrast(t[fg]!, t[bg]!)).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(states)("%s on its soft background meets 4.5:1", (s) => {
    expect(contrast(t[s]!, t[`${s}-soft`]!)).toBeGreaterThanOrEqual(4.5);
  });

  it("text on the accent button meets 4.5:1", () => {
    expect(contrast(t["on-accent"]!, t.accent!)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(figures)("%s on the surface meets 3:1", (f) => {
    expect(contrast(t[f]!, t.surface!)).toBeGreaterThanOrEqual(3);
  });
});

it("the system dark theme matches the chosen dark theme", () => {
  const start = css.indexOf("@media (prefers-color-scheme: dark)");
  const system = block(':root:not([data-theme="light"])');
  expect(start).toBeGreaterThan(0);
  expect(system).toEqual(themes.dark);
});
