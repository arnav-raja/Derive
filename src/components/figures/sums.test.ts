import { describe, expect, it } from "vitest";

import { limitText, shortText, sumText } from "./sums";

const RATIOS = Array.from({ length: 19 }, (_, i) => (i + 1) * 0.05);

describe("the partial sums readout", () => {
  it("writes exact sums in full and cuts the others off", () => {
    expect(sumText(0.9, 1)).toBe("1");
    expect(sumText(0.9, 3)).toBe("2.71");
    expect(sumText(0.9, 6)).toBe("4.6855…");
    expect(sumText(0.9, 100)).toBe("9.9997…");
    expect(limitText(0.9)).toBe("10");
    expect(limitText(0.7)).toBe("3.3333…");
  });

  it("never shows a sum as where it is heading, nor as more than the sum", () => {
    for (const r of RATIOS) {
      const limit = limitText(r);
      for (let n = 1; n <= 100; n++) {
        const text = sumText(r, n);
        // A limit that ends after four places is never shown as a sum; one that goes on, such as
        // 3.3333…, can share its first digits with a sum, and the shortfall tells them apart.
        if (!limit.endsWith("…")) expect(text).not.toBe(limit);
        const shown = Number(text.replace("…", ""));
        expect(shown).toBeLessThanOrEqual((1 - r ** n) / (1 - r) + 1e-12);
        expect(1 / (1 - r) - shown).toBeGreaterThan(0);
      }
    }
  });

  it("gives how far short the sum falls, never 0", () => {
    expect(shortText(0.9, 1)).toBe("9");
    expect(shortText(0.5, 100)).toBe("1.6 × 10^{−30}");
    for (const r of RATIOS) {
      for (let n = 1; n <= 100; n++) expect(shortText(r, n)).not.toMatch(/^0$|^0\.0*$/);
    }
  });
});
