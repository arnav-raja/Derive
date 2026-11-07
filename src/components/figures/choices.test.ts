import { describe, expect, it } from "vitest";

import { byFirst, choicesWords, factorial, falling, groupBySet, letters, maxChosen, orderedChoices, setText } from "./choices";

const words = (cs: string[][]) => cs.map((c) => c.join(""));

describe("orderedChoices", () => {
  it("lists the ordered choices as the product rule makes them", () => {
    expect(words(orderedChoices(letters(4), 2))).toEqual([
      "AB", "AC", "AD", "BA", "BC", "BD", "CA", "CB", "CD", "DA", "DB", "DC",
    ]);
  });

  it("makes n(n − 1)···(n − k + 1) of them, none repeated, each of k different letters", () => {
    for (let n = 1; n <= 6; n += 1) {
      for (let k = 0; k <= n; k += 1) {
        const cs = orderedChoices(letters(n), k);
        expect(cs).toHaveLength(falling(n, k));
        expect(new Set(words(cs)).size).toBe(cs.length);
        for (const c of cs) expect(new Set(c).size).toBe(k);
      }
    }
  });

  it("has one ordered choice of nothing, the empty one", () => {
    expect(orderedChoices(letters(3), 0)).toEqual([[]]);
  });
});

describe("groupBySet", () => {
  it("gathers each set's orders, the sets in the order they first appear", () => {
    const groups = groupBySet(orderedChoices(letters(4), 2));
    expect(groups.map((g) => g.set.join(""))).toEqual(["AB", "AC", "AD", "BC", "BD", "CD"]);
    expect(words(groups[0]!.orders)).toEqual(["AB", "BA"]);
  });

  it("makes k! orders in each group, and n choose k groups", () => {
    const groups = groupBySet(orderedChoices(letters(6), 3));
    expect(groups).toHaveLength(20);
    for (const g of groups) expect(g.orders).toHaveLength(factorial(3));
  });
});

describe("byFirst", () => {
  it("splits the choices by their first letter", () => {
    const split = byFirst(orderedChoices(letters(3), 2));
    expect(split.map((s) => [s.first, words(s.choices)])).toEqual([
      ["A", ["AB", "AC"]],
      ["B", ["BA", "BC"]],
      ["C", ["CA", "CB"]],
    ]);
  });
});

describe("maxChosen", () => {
  it("keeps the figure to at most 120 ordered choices", () => {
    expect(maxChosen(4)).toBe(4);
    expect(maxChosen(5)).toBe(5);
    expect(maxChosen(6)).toBe(3);
    expect(maxChosen(2)).toBe(2);
  });
});

describe("choicesWords", () => {
  it("gives the count by the product rule", () => {
    expect(choicesWords(4, 2, false)).toBe("12 ordered choices of 2 letters from 4: 4 × 3 = 12.");
    expect(choicesWords(4, 1, false)).toBe("4 ordered choices of 1 letter from 4.");
  });

  it("gives the sets and their orders when grouped", () => {
    expect(choicesWords(5, 3, true)).toBe(
      "60 ordered choices of 3 letters from 5: 5 × 4 × 3 = 60. They fall into 10 groups, one for each set of 3 letters, and each set has 3! = 6 orders.",
    );
    expect(choicesWords(4, 4, true)).toBe(
      "24 ordered choices of 4 letters from 4: 4 × 3 × 2 × 1 = 24. They fall into 1 group, one for each set of 4 letters, and each set has 4! = 24 orders.",
    );
    expect(choicesWords(3, 1, true)).toBe(
      "3 ordered choices of 1 letter from 3. They fall into 3 groups, one for each set of 1 letter, and each set has 1 order.",
    );
  });

  it("writes a set in braces", () => {
    expect(setText(["A", "C"])).toBe("{A, C}");
  });
});
