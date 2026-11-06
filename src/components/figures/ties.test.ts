import { describe, expect, it } from "vitest";

import { drawLists, generator, listWords, pairs, repeated, repeats, tieWords, TOPS } from "./ties";

describe("drawLists", () => {
  it("draws the same lists from the same seed, and different ones from another", () => {
    expect(drawLists(7, 5, 10, 1_000)).toEqual(drawLists(7, 5, 10, 1_000));
    expect(drawLists(7, 5, 10, 1_000)).not.toEqual(drawLists(8, 5, 10, 1_000));
  });

  it("gives whole numbers from 1 to top, and reaches both ends", () => {
    const all = drawLists(3, 200, 20, 10).flat();
    expect(all.every((x) => Number.isInteger(x) && x >= 1 && x <= 10)).toBe(true);
    expect(new Set(all)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  });

  it("gives numbers from 0 up to 1 from the generator", () => {
    const next = generator(1);
    const xs = Array.from({ length: 1_000 }, next);
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it("makes ties about as often as counting pairs says", () => {
    // 10 numbers from 1 to 10 are all different only 3,628,800 times in 10^10, so nearly every
    // list ties; 5 from 1 to 10 tie with chance 1 - 30,240/100,000, about 70 in 100.
    const narrow = drawLists(1, 1_000, 10, 10).filter((l) => repeated(l) !== null).length;
    expect(narrow).toBeGreaterThan(990);
    const five = drawLists(1, 1_000, 5, 10).filter((l) => repeated(l) !== null).length;
    expect(five).toBeGreaterThan(650);
    expect(five).toBeLessThan(750);
    // 10 numbers from 1 to 1,000,000 tie about 45 times in a million lists.
    const wide = drawLists(1, 1_000, 10, 1_000_000).filter((l) => repeated(l) !== null).length;
    expect(wide).toBeLessThan(5);
  });
});

describe("repeated and repeats", () => {
  it("finds the first number that appears again, or null", () => {
    expect(repeated([7, 3, 9, 3, 5])).toBe(3);
    expect(repeated([1, 2, 3])).toBeNull();
    expect(repeated([])).toBeNull();
  });

  it("lists every number that appears more than once, in the order they first appear", () => {
    expect(repeats([4, 1, 4, 2, 1, 4])).toEqual([4, 1]);
    expect(repeats([1, 2])).toEqual([]);
  });

  it("counts pairs as n(n - 1)/2", () => {
    expect(pairs(10)).toBe(45);
    expect(pairs(23)).toBe(253);
    expect(pairs(1)).toBe(0);
  });
});

describe("tieWords and listWords", () => {
  it("says how many lists tie, with digits grouped in threes", () => {
    expect(tieWords([[1, 2], [3, 3]], 1_000_000)).toBe(
      "Of 2 lists of 2 whole numbers, each from 1 to 1,000,000, 1 has two equal numbers.",
    );
    expect(tieWords([[1, 2], [3, 4]], 10)).toBe("Of 2 lists of 2 whole numbers, each from 1 to 10, none has two equal numbers.");
    expect(tieWords([[1, 1], [3, 3]], 10)).toBe("Of 2 lists of 2 whole numbers, each from 1 to 10, every one has two equal numbers.");
    expect(tieWords([[1, 1], [3, 3], [1, 2]], 10)).toContain("2 have two equal numbers");
  });

  it("reads one list out, and names what repeats", () => {
    expect(listWords(0, [412077, 93012])).toBe("List 1: 412,077, 93,012. No two are equal.");
    expect(listWords(6, [4, 9, 4, 1])).toBe("List 7: 4, 9, 4, 1. 4 appears twice.");
    expect(listWords(2, [5, 5, 5])).toBe("List 3: 5, 5, 5. 5 appears 3 times.");
    expect(listWords(0, [2, 7, 2, 7, 9, 9])).toBe("List 1: 2, 7, 2, 7, 9, 9. 2, 7 and 9 each appear more than once.");
  });

  it("offers ranges from 10 to 1,000,000 in powers of ten", () => {
    expect(TOPS).toEqual([10, 100, 1_000, 10_000, 100_000, 1_000_000]);
  });
});
