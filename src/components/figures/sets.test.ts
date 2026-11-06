import { describe, expect, it } from "vitest";

import { verdict, type GridWords } from "./quantifiers";
import { compareShading, lowerFirst, parseSetExpression, regionName, regionsOf, sameRegions, setTex, spokenSet, type NamedSet } from "./sets";

const SYMS = ["S", "E"] as const;
const regions = (text: string) => [...regionsOf(parseSetExpression(text, SYMS))].sort();

describe("set expressions", () => {
  it("covers the right regions", () => {
    expect(regions("S")).toEqual(["both", "first"]);
    expect(regions("E")).toEqual(["both", "second"]);
    expect(regions("S ∩ E")).toEqual(["both"]);
    expect(regions("S ∪ E")).toEqual(["both", "first", "second"]);
    expect(regions("S ∩ Eᶜ")).toEqual(["first"]);
    expect(regions("(S ∪ E)ᶜ")).toEqual(["neither"]);
    expect(regions("Sᶜᶜ")).toEqual(["both", "first"]);
    expect(regions("U")).toEqual(["both", "first", "neither", "second"]);
    expect(regions("∅")).toEqual([]);
    expect(regions("S ∪ E ∪ Sᶜ")).toEqual(["both", "first", "neither", "second"]);
  });

  it("agrees with De Morgan's laws", () => {
    const same = (a: string, b: string) => sameRegions(regionsOf(parseSetExpression(a, SYMS)), regionsOf(parseSetExpression(b, SYMS)));
    expect(same("(S ∪ E)ᶜ", "Sᶜ ∩ Eᶜ")).toBe(true);
    expect(same("(S ∩ E)ᶜ", "Sᶜ ∪ Eᶜ")).toBe(true);
    expect(same("(S ∩ E)ᶜ", "Sᶜ ∩ Eᶜ")).toBe(false);
  });

  it("refuses what it cannot read", () => {
    expect(() => parseSetExpression("S ∪ E ∩ S", SYMS)).toThrow(/mixed/);
    expect(() => parseSetExpression("(S ∪ E", SYMS)).toThrow(/bracket/);
    expect(() => parseSetExpression("S ∪ X", SYMS)).toThrow(/not one of its sets/);
    expect(() => parseSetExpression("S E", SYMS)).toThrow(/out of place/);
    expect(() => parseSetExpression("S ∪", SYMS)).toThrow(/too soon/);
    expect(() => parseSetExpression("U", ["U", "E"])).toThrow(/every element/);
  });

  it("says each set in words and in TeX", () => {
    expect(spokenSet(parseSetExpression("S ∩ Eᶜ", SYMS), SYMS)).toBe("the intersection of S and the complement of E");
    expect(spokenSet(parseSetExpression("(S ∪ E)ᶜ", SYMS), SYMS)).toBe("the complement of the union of S and E");
    expect(setTex("(S ∪ E)ᶜ")).toBe("(S \\cup E)^c");
    expect(setTex("Sᶜ ∩ Eᶜ")).toBe("S^c \\cap E^c");
  });
});

describe("regions and shading", () => {
  const sets: [NamedSet, NamedSet] = [
    { name: "Short", not: "Long", sym: "S" },
    { name: "In English", not: "Not in English", sym: "E" },
  ];

  it("names each region from the sets' names", () => {
    expect(regionName("both", sets)).toBe("Short, in English");
    expect(regionName("first", sets)).toBe("Short, not in English");
    expect(regionName("second", sets)).toBe("Long, in English");
    expect(regionName("neither", sets)).toBe("Long, not in English");
    expect(regionName("neither", [{ name: "Labelled spam", sym: "P" }, { name: "Contains a link", not: "Contains no link", sym: "Q" }])).toBe(
      "Not labelled spam, contains no link",
    );
    expect(lowerFirst("GPU jobs")).toBe("GPU jobs");
  });

  it("says what a shading has too many of and too few of", () => {
    const target = regionsOf(parseSetExpression("S ∩ Eᶜ", SYMS));
    expect(compareShading(new Set(["first"]), target)).toEqual({ ok: true, extra: [], missing: [] });
    expect(compareShading(new Set(["first", "both"]), target)).toEqual({ ok: false, extra: ["both"], missing: [] });
    expect(compareShading(new Set(), target)).toEqual({ ok: false, extra: [], missing: ["first"] });
  });
});

describe("the quantifier grid", () => {
  const words: GridWords = {
    rows: ["Small", "Medium", "Large"],
    cols: ["0.1", "0.01", "0.001"],
    rowName: "model",
    colName: "learning rate",
    joiner: "at",
  };
  const grid = [
    [true, true, false],
    [false, true, false],
    [false, false, true],
  ];

  it("decides each statement for the lesson's grid", () => {
    expect(verdict("every-row-some-col", grid, words)).toEqual({
      holds: true,
      cells: [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      because: "Every model has a tick: Small at 0.1, Medium at 0.01 and Large at 0.001.",
    });
    expect(verdict("some-col-every-row", grid, words).holds).toBe(false);
    expect(verdict("some-col-every-row", grid, words).because).toBe("No column is ticked in every row: 0.1 misses Medium, 0.01 misses Large and 0.001 misses Small.");
    expect(verdict("every-col-some-row", grid, words).holds).toBe(true);
    expect(verdict("some-row-every-col", grid, words).holds).toBe(false);
    expect(verdict("every-row-every-col", grid, words).because).toBe("Small at 0.001 has no tick.");
    expect(verdict("some-row-some-col", grid, words).because).toBe("Small at 0.1 is ticked.");
  });

  it("gives a counterexample row, or a witness column", () => {
    const noRate = [
      [true, false],
      [false, false],
    ];
    const w2 = { ...words, rows: ["Small", "Medium"], cols: ["0.1", "0.01"] };
    expect(verdict("every-row-some-col", noRate, w2)).toEqual({
      holds: false,
      cells: [
        [1, 0],
        [1, 1],
      ],
      because: "The row for Medium has no tick, so that model is a counterexample.",
    });
    const oneRate = [
      [true, true],
      [false, true],
    ];
    expect(verdict("some-col-every-row", oneRate, w2).because).toBe("The column for 0.01 is ticked in every row, so that learning rate is a witness.");
  });

  it("whenever some column suits every row, every row has a column", () => {
    // Every 2 by 2 and 2 by 3 grid of ticks: there is r for all m carries for all m there is r with it.
    const sizes: [number, number][] = [
      [2, 2],
      [2, 3],
      [3, 2],
    ];
    for (const [R, C] of sizes) {
      const w = { ...words, rows: words.rows.slice(0, R), cols: words.cols.slice(0, C) };
      for (let bits = 0; bits < 2 ** (R * C); bits++) {
        const g: boolean[][] = Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => Boolean(bits & (1 << (i * C + j)))));
        if (verdict("some-col-every-row", g, w).holds) expect(verdict("every-row-some-col", g, w).holds).toBe(true);
        if (verdict("some-row-every-col", g, w).holds) expect(verdict("every-col-some-row", g, w).holds).toBe(true);
      }
    }
  });
});
