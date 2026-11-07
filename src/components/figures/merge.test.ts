import { describe, expect, it } from "vitest";

import { levelsWords, makeList, merge, mergeLevels, pickSmallest, shuffled, SIZES, totalComparisons, worstOrder } from "./merge";

/** The lesson's `merge_sort`, top down, with its comparisons counted. */
function mergeSortCount(xs: readonly number[]): { out: number[]; comparisons: number } {
  if (xs.length <= 1) return { out: [...xs], comparisons: 0 };
  const h = Math.floor(xs.length / 2);
  const a = mergeSortCount(xs.slice(0, h));
  const b = mergeSortCount(xs.slice(h));
  const m = merge(a.out, b.out);
  return { out: m.out, comparisons: a.comparisons + b.comparisons + m.comparisons };
}

/** Every order of the list, for checking small cases by brute force. */
function orders(xs: number[]): number[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => orders([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

/** The most comparisons merge sort makes on n items: W(n) = W(n // 2) + W(n - n // 2) + n - 1. */
function worst(n: number): number {
  if (n <= 1) return 0;
  const h = Math.floor(n / 2);
  return worst(h) + worst(n - h) + n - 1;
}

describe("merge", () => {
  it("counts the comparisons of the lesson's examples", () => {
    expect(merge([2, 5, 9], [3, 4])).toEqual({ out: [2, 3, 4, 5, 9], comparisons: 3 });
    expect(merge([1, 2, 3, 4], [5, 6, 7, 8]).comparisons).toBe(4);
    expect(merge([1, 3, 5, 7], [2, 4, 6, 8]).comparisons).toBe(7);
    expect(merge([4, 8], [1, 2, 3, 9])).toEqual({ out: [1, 2, 3, 4, 8, 9], comparisons: 5 });
    expect(merge([], [1, 2])).toEqual({ out: [1, 2], comparisons: 0 });
  });
});

describe("makeList", () => {
  it("shuffles the losses 1 to n, the same way from the same seed", () => {
    const xs = shuffled(64, 3);
    expect([...xs].sort((a, b) => a - b)).toEqual(Array.from({ length: 64 }, (_, i) => i + 1));
    expect(shuffled(64, 3)).toEqual(xs);
    expect(shuffled(64, 4)).not.toEqual(xs);
  });

  it("gives the losses in order, the wrong way round, or in the worst order", () => {
    expect(makeList(4, "sorted", 1)).toEqual([1, 2, 3, 4]);
    expect(makeList(4, "reversed", 1)).toEqual([4, 3, 2, 1]);
    expect(makeList(8, "worst", 1)).toEqual([1, 5, 3, 7, 2, 6, 4, 8]);
  });
});

describe("worstOrder", () => {
  it("makes merge_sort compare as much as it ever can, for every length", () => {
    for (let n = 0; n <= 40; n += 1) {
      const sorted = Array.from({ length: n }, (_, i) => i + 1);
      const order = worstOrder(sorted);
      expect([...order].sort((a, b) => a - b)).toEqual(sorted);
      expect(mergeSortCount(order).comparisons).toBe(worst(n));
    }
  });

  it("is the worst of all the orders of up to 8 items", () => {
    for (const n of [3, 4, 5, 8]) {
      const sorted = Array.from({ length: n }, (_, i) => i + 1);
      const most = Math.max(...orders(sorted).map((o) => mergeSortCount(o).comparisons));
      expect(most).toBe(worst(n));
      expect(mergeSortCount(worstOrder(sorted)).comparisons).toBe(most);
    }
  });
});

describe("mergeLevels", () => {
  it("makes the same merges as merge_sort for every length the figure offers", () => {
    for (const n of SIZES) {
      for (const order of ["random", "sorted", "reversed", "worst"] as const) {
        const list = makeList(n, order, 3);
        const levels = mergeLevels(list);
        const top = mergeSortCount(list);
        expect(levels.at(-1)!.runs).toEqual([top.out]);
        expect(totalComparisons(levels)).toBe(top.comparisons);
        expect(levels).toHaveLength(Math.log2(n) + 1);
        levels.forEach((l, j) => {
          expect(l.runs).toHaveLength(n / 2 ** j);
          expect(l.comparisons).toBeLessThan(j === 0 ? 1 : n);
        });
      }
    }
  });

  it("gives the lesson's counts for 1,024 losses", () => {
    expect(totalComparisons(mergeLevels(makeList(1024, "sorted", 1)))).toBe(5120);
    expect(totalComparisons(mergeLevels(makeList(1024, "reversed", 1)))).toBe(5120);
    // W(10) = 9 × 1,024 + 1, the closed form the Derive phase finds.
    expect(totalComparisons(mergeLevels(makeList(1024, "worst", 1)))).toBe(9217);
    const shuffledTotal = totalComparisons(mergeLevels(makeList(1024, "random", 3)));
    expect(shuffledTotal).toBeGreaterThan(8850);
    expect(shuffledTotal).toBeLessThan(9050);
    expect(pickSmallest(1024)).toBe(523776);
  });

  it("handles a list of no items and of one", () => {
    expect(mergeLevels([])).toEqual([{ runs: [], comparisons: 0 }]);
    expect(mergeLevels([5])).toEqual([{ runs: [[5]], comparisons: 0 }]);
  });
});

describe("levelsWords", () => {
  it("says how many levels and comparisons, against picking the smallest", () => {
    const levels = mergeLevels(makeList(16, "worst", 1));
    expect(levelsWords(16, "worst", levels)).toBe(
      "16 losses, in the order that makes the most comparisons: 4 levels of merges make 49 comparisons in all, " +
        "no level more than 15. Picking the smallest loss left, again and again, would make 120.",
    );
    const sorted = mergeLevels(makeList(1024, "sorted", 1));
    expect(levelsWords(1024, "sorted", sorted)).toContain("1,024 losses, already in order: 10 levels of merges make 5,120 comparisons");
    expect(levelsWords(1024, "sorted", sorted)).toContain("would make 523,776.");
  });
});
