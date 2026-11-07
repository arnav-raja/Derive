import { describe, expect, it } from "vitest";

import { above, entryWords, pascalRows, setWords, splitByLast, subsets } from "./pascal";

function choose(n: number, k: number): number {
  let c = 1;
  for (let i = 0; i < k; i += 1) c = (c * (n - i)) / (i + 1);
  return c;
}

describe("pascalRows", () => {
  it("builds the rows by Pascal's rule", () => {
    expect(pascalRows(4)).toEqual([[1], [1, 1], [1, 2, 1], [1, 3, 3, 1], [1, 4, 6, 4, 1]]);
  });

  it("holds n choose k in row n, place k, and each row adds up to 2 to the power n", () => {
    const rows = pascalRows(12);
    rows.forEach((row, n) => {
      row.forEach((v, k) => expect(v).toBe(choose(n, k)));
      expect(row.reduce((s, v) => s + v, 0)).toBe(2 ** n);
    });
  });
});

describe("subsets", () => {
  it("lists every set of k of 1 to n, in dictionary order", () => {
    expect(subsets(4, 2)).toEqual([[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]]);
    expect(subsets(3, 0)).toEqual([[]]);
    expect(subsets(3, 3)).toEqual([[1, 2, 3]]);
    expect(subsets(2, 3)).toEqual([]);
  });

  it("makes n choose k sets", () => {
    for (let n = 0; n <= 8; n += 1) for (let k = 0; k <= n; k += 1) expect(subsets(n, k)).toHaveLength(choose(n, k));
  });
});

describe("splitByLast", () => {
  it("splits the sets as Pascal's rule does", () => {
    const { withLast, withoutLast } = splitByLast(5, 2);
    expect(withLast.map(setWords)).toEqual(["{1, 5}", "{2, 5}", "{3, 5}", "{4, 5}"]);
    expect(withoutLast).toHaveLength(6);
    for (let n = 1; n <= 7; n += 1) {
      for (let k = 0; k <= n; k += 1) {
        const s = splitByLast(n, k);
        expect(s.withLast).toHaveLength(k >= 1 ? choose(n - 1, k - 1) : 0);
        expect(s.withoutLast).toHaveLength(k <= n - 1 ? choose(n - 1, k) : 0);
      }
    }
  });

  it("writes the empty set as ∅", () => {
    expect(setWords([])).toBe("∅");
  });
});

describe("entryWords", () => {
  const rows = pascalRows(10);

  it("names the entries above without the rule while it is closed", () => {
    expect(entryWords(rows, 5, 2, false, false)).toBe(
      "Row 5, place 2 is 10, the number of ways to choose 2 of 5 things. Just above it are 4 and 6.",
    );
  });

  it("adds them up once the rule is open, and gives the row's sum", () => {
    expect(entryWords(rows, 10, 3, true, true)).toBe(
      "Row 10, place 3 is 120, the number of ways to choose 3 of 10 things. Just above it are 36 and 84, and 36 + 84 = 120. Row 10 adds up to 1,024, which is 2 to the power 10.",
    );
  });

  it("handles the top and the ends of a row", () => {
    expect(entryWords(rows, 0, 0, true, false)).toBe("Row 0, place 0 is 1, the number of ways to choose 0 of 0 things. It is the top of the triangle.");
    expect(entryWords(rows, 4, 4, true, false)).toBe(
      "Row 4, place 4 is 1, the number of ways to choose 4 of 4 things. It is at an end of its row, with one entry above it, 1.",
    );
    expect(above(4, 0)).toEqual([[3, 0]]);
    expect(above(4, 2)).toEqual([
      [3, 1],
      [3, 2],
    ]);
  });
});
