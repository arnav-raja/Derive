import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { dotsPath, rankView } from "./word-ranks";
import {
  byCount,
  drawNext,
  followers,
  inWord,
  loopLength,
  mostLikely,
  nextCounts,
  percent,
  rankByCount,
  rankWords,
  readBook,
  runOf,
  sliderRanks,
  times,
  tokens,
  writerWords,
} from "./words";

describe("tokens", () => {
  // The cases of the Build phase's tests for build-tokens, which the Python reference passes.
  it("cuts the lesson's examples as its Python tokeniser does", () => {
    const cases: [string, string[]][] = [
      ["The cat sat. the CAT ran.", ["the", "cat", "sat", "the", "cat", "ran"]],
      ["", []],
      ["Alice", ["alice"]],
      ["  ", []],
      ["?!", []],
      ["Don't panic, it's five o'clock: rock'n'roll.", ["don't", "panic", "it's", "five", "o'clock", "rock'n'roll"]],
      ["'Oh dear!' said the Rabbit.", ["oh", "dear", "said", "the", "rabbit"]],
      ["the rabbits' ears", ["the", "rabbits", "ears"]],
      ["'tis", ["tis"]],
      ["a''b", ["a", "b"]],
      ["' '", []],
      ["it'", ["it"]],
      ["don't'", ["don't"]],
      ["नमस्ते दुनिया", ["नमस्ते", "दुनिया"]],
      ["मैं ठीक हूँ।", ["मैं", "ठीक", "हूँ"]],
      ["வணக்கம், தமிழ்", ["வணக்கம்", "தமிழ்"]],
      ["Chapter 12", ["chapter", "12"]],
      ["3.50 rupees", ["3", "50", "rupees"]],
      ["२०२६ में", ["२०२६", "में"]],
      ["ÉCOLE École école", ["école", "école", "école"]],
      ["café au lait", ["café", "au", "lait"]],
    ];
    for (const [text, expected] of cases) expect(tokens(text), text).toEqual(expected);
  });

  it("knows letters, marks and digits in any script", () => {
    for (const ch of ["a", "Z", "न", "्", "े", "ि", "7", "७"]) expect(inWord(ch), ch).toBe(true);
    for (const ch of ["'", ".", " ", "!", "।", "-"]) expect(inWord(ch), ch).toBe(false);
  });
});

describe("counting and ranking", () => {
  it("ranks larger counts first, and equal counts in alphabetical order", () => {
    const ranked = rankByCount(["b", "a", "c", "b", "a", "d"]);
    expect(ranked).toEqual([
      { word: "a", count: 2 },
      { word: "b", count: 2 },
      { word: "c", count: 1 },
      { word: "d", count: 1 },
    ]);
    expect(byCount({ word: "z", count: 5 }, { word: "a", count: 4 })).toBeLessThan(0);
  });

  it("puts an apostrophe before every letter among equal counts, as Python compares strings", () => {
    expect(rankByCount(["obliged", "o'clock", "hedgehogs", "he's"]).map((x) => x.word)).toEqual(["he's", "hedgehogs", "o'clock", "obliged"]);
  });

  it("says once and twice in words", () => {
    expect([1, 2, 3, 1_258].map(times)).toEqual(["once", "twice", "3 times", "1,258 times"]);
  });

  it("counts which word follows which, as the lesson's next_counts does", () => {
    const follows = nextCounts(["the", "cat", "sat", "the", "cat", "ran"]);
    expect(followers(follows, "the")).toEqual([{ word: "cat", count: 2 }]);
    expect(followers(follows, "cat")).toEqual([
      { word: "ran", count: 1 },
      { word: "sat", count: 1 },
    ]);
    expect(followers(follows, "ran")).toEqual([]);
    expect(mostLikely(follows, "cat")).toBe("ran");
    expect(mostLikely(follows, "ran")).toBeNull();
  });

  it("draws each next word with a chance in proportion to its count", () => {
    const follows = nextCounts(["a", "b", "a", "b", "a", "c", "a", "b"]);
    // After a: b 3 times and c once, so b for u below 0.75 and c from there on.
    expect(drawNext(follows, "a", 0)).toBe("b");
    expect(drawNext(follows, "a", 0.74)).toBe("b");
    expect(drawNext(follows, "a", 0.75)).toBe("c");
    expect(drawNext(follows, "a", 0.999)).toBe("c");
    expect(drawNext(follows, "c", 0.5)).toBe("a");
    expect(drawNext(follows, "zebra", 0.5)).toBeNull();
  });

  it("writes percentages with one decimal place below 10%", () => {
    expect(percent(1_642, 26_688)).toBe("6.2%");
    expect(percent(6_718, 26_688)).toBe("25%");
    expect(percent(1, 1)).toBe("100%");
  });
});

describe("the writer's loop", () => {
  it("finds the loop once a word comes round with only commonest words since", () => {
    expect(loopLength(["the", "queen", "and"], [false, true, true])).toBeNull();
    expect(loopLength(["the", "queen", "and", "the"], [false, true, true, true])).toBe(3);
    expect(loopLength(["the", "queen", "and", "the"], [false, true, false, true])).toBeNull();
    expect(loopLength(["a", "a"], [false, true])).toBe(1);
    expect(loopLength(["a"], [false])).toBeNull();
  });
});

describe("Alice's Adventures in Wonderland", () => {
  const book = readBook(readFileSync(path.join(process.cwd(), "public", "texts", "alice.txt"), "utf8"));
  const total = book.before.at(-1)!;

  it("has the lesson's numbers", () => {
    expect(book.words.length).toBe(26_688);
    expect(total).toBe(26_688);
    expect(book.ranked.length).toBe(2_630);
    expect(book.ranked.slice(0, 10)).toEqual([
      { word: "the", count: 1_642 },
      { word: "and", count: 872 },
      { word: "to", count: 729 },
      { word: "a", count: 632 },
      { word: "she", count: 541 },
      { word: "it", count: 530 },
      { word: "of", count: 514 },
      { word: "said", count: 462 },
      { word: "i", count: 410 },
      { word: "alice", count: 386 },
    ]);
    expect(book.ranked[99]).toEqual({ word: "never", count: 48 });
    expect(book.ranked[999]).toEqual({ word: "paw", count: 3 });
    expect(book.ranked.filter((x) => x.count === 1).length).toBe(1_143);
    expect(book.ranked.filter((x) => x.count === 2).length).toBe(408);
    expect(percent(book.before[10]!, total)).toBe("25%");
    expect(percent(book.before[100]!, total)).toBe("59%");
    // From rank 10 to rank 500, count times rank stays between about 3,300 and 4,900.
    const products = book.ranked.slice(9, 500).map((x, i) => x.count * (i + 10));
    expect(Math.min(...products)).toBeGreaterThanOrEqual(3_300);
    expect(Math.max(...products)).toBeLessThanOrEqual(4_900);
  });

  it("has the lesson's next-word counts", () => {
    expect(followers(book.follows, "the").slice(0, 4)).toEqual([
      { word: "queen", count: 65 },
      { word: "king", count: 60 },
      { word: "gryphon", count: 53 },
      { word: "mock", count: 53 },
    ]);
    const said = followers(book.follows, "said");
    expect(said.reduce((s, x) => s + x.count, 0)).toBe(462);
    expect(said.slice(0, 3)).toEqual([
      { word: "the", count: 210 },
      { word: "alice", count: 116 },
      { word: "to", count: 39 },
    ]);
    expect(followers(book.follows, "queen").reduce((s, x) => s + x.count, 0)).toBe(68);
    expect(followers(book.follows, "queen")[0]).toEqual({ word: "and", count: 7 });
    expect(followers(book.follows, "and")[0]).toEqual({ word: "the", count: 82 });
    let pairs = 0;
    for (const row of book.follows.values()) pairs += row.size;
    expect(pairs).toBe(14_734);
    const once = [...book.follows.values()].reduce((s, row) => s + [...row.values()].filter((c) => c === 1).length, 0);
    expect(once / pairs).toBeGreaterThan(0.74);
    expect(once / pairs).toBeLessThan(0.78);
  });

  it("writes the puzzle's loop", () => {
    const written = ["the"];
    while (written.length < 7) written.push(mostLikely(book.follows, written.at(-1)!)!);
    expect(written).toEqual(["the", "queen", "and", "the", "queen", "and", "the"]);
    const commonest = written.map((_, i) => i > 0);
    expect(loopLength(written.slice(0, 4), commonest.slice(0, 4))).toBe(3);
    expect(writerWords(book, written.slice(0, 4), commonest.slice(0, 4))).toBe(
      "4 words so far. “the” has come round again, with each word since its last time the commonest after the one before. Adding the commonest next word now repeats the same 3 words, “queen”, “and”, “the”, for ever.",
    );
    expect(writerWords(book, ["the", "queen"], [false, true])).toBe("2 words so far.");
  });

  it("falls into a loop within 16 words from every start", () => {
    for (const { word } of book.ranked) {
      const seen = new Set<string>();
      let w: string | null = word;
      let steps = 0;
      while (w !== null && !seen.has(w)) {
        seen.add(w);
        w = mostLikely(book.follows, w);
        steps++;
      }
      expect(steps, word).toBeLessThanOrEqual(16);
    }
  });

  it("describes a rank and the words that share its count", () => {
    expect(rankWords(book, 10)).toEqual([
      "Rank 10 is “alice”, which appears 386 times: count times rank is 3,860.",
      "The words up to rank 10 make up 25% of the book's 26,688 words.",
    ]);
    const { first, last } = runOf(book.ranked, 2_000);
    expect([first, last]).toEqual([1_488, 2_630]);
    expect(rankWords(book, 2_000)[1]).toBe(
      "1,143 words appear once, at ranks 1,488 to 2,630, in alphabetical order, with an apostrophe before every letter.",
    );
    // The apostrophe is named only for a run that holds a word with one.
    expect(rankWords(book, 96)[1]).toBe("4 words appear 49 times, at ranks 96 to 99, in alphabetical order.");
  });

  it("draws one dot per word, leaving out only dots on top of others", () => {
    const view = rankView(640);
    const d = dotsPath(book, view);
    const dots = d.split("M").length - 1;
    expect(dots).toBeGreaterThan(200);
    expect(dots).toBeLessThanOrEqual(2_630);
    expect(view.y(1)).toBeGreaterThan(view.y(2_000));
    expect(view.x(1)).toBeLessThan(view.x(2_630));
  });
});

describe("the slider", () => {
  it("stops at every rank up to 38, then about 4% apart, and at the last rank", () => {
    const stops = sliderRanks(2_630);
    expect(stops.slice(0, 38)).toEqual(Array.from({ length: 38 }, (_, i) => i + 1));
    expect(stops[38]).toBe(40);
    expect(stops).toContain(10);
    expect(stops.at(-1)).toBe(2_630);
    for (let i = 1; i < stops.length; i++) expect(stops[i]!).toBeGreaterThan(stops[i - 1]!);
    expect(stops.length).toBeLessThan(160);
  });
});
