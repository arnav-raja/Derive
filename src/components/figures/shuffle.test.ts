import { describe, expect, it } from "vitest";

import { bufferShuffle, firstRowWords, itemName, rows, stream, STREAM_LENGTH, topicCounts } from "./shuffle";

const SEEDS = [1, 2, 3, 7, 42, 1_000];

describe("stream", () => {
  it("holds 12 items about each topic, in order", () => {
    const s = stream();
    expect(s).toHaveLength(STREAM_LENGTH);
    expect(s.map(itemName).slice(0, 3)).toEqual(["A1", "A2", "A3"]);
    expect(itemName(s[12]!)).toBe("B1");
    expect(itemName(s[35]!)).toBe("C12");
    expect(s.every((item, i) => item.place === i)).toBe(true);
    expect(rows(s).map(topicCounts)).toEqual([
      [12, 0, 0],
      [0, 12, 0],
      [0, 0, 12],
    ]);
  });
});

describe("bufferShuffle", () => {
  it("hands out every item exactly once, for every size of buffer", () => {
    for (let k = 1; k <= STREAM_LENGTH + 4; k++) {
      for (const seed of SEEDS) {
        const out = bufferShuffle(stream(), k, seed);
        expect(out.map((item) => item.place).sort((a, b) => a - b)).toEqual(stream().map((item) => item.place));
      }
    }
  });

  it("leaves the stream in order with a buffer of 1", () => {
    for (const seed of SEEDS) expect(bufferShuffle(stream(), 1, seed)).toEqual(stream());
  });

  it("never hands out the item at place p before place p - k + 1, and reaches that place", () => {
    // Gathered and asserted once: an expect for each item of 7,200 shuffles took seconds.
    const early: string[] = [];
    const furthest: number[] = [];
    for (let k = 1; k <= STREAM_LENGTH; k++) {
      let most = 0;
      for (let seed = 1; seed <= 200; seed++) {
        bufferShuffle(stream(), k, seed).forEach((item, j) => {
          if (j < item.place - k + 1) early.push(`buffer ${k}, seed ${seed}: place ${item.place} out at ${j}`);
          most = Math.max(most, item.place - j);
        });
      }
      furthest.push(most);
    }
    expect(early).toEqual([]);
    // With a buffer of k, the furthest any item comes forward is k - 1 places.
    expect(furthest).toEqual(Array.from({ length: STREAM_LENGTH }, (_, i) => i));
  });

  it("gives the same order for the same seed, and a different one for another", () => {
    expect(bufferShuffle(stream(), 4, 5)).toEqual(bufferShuffle(stream(), 4, 5));
    expect(bufferShuffle(stream(), 36, 5)).not.toEqual(bufferShuffle(stream(), 36, 6));
  });

  it("mixes the topics only near their boundaries with a small buffer, and everywhere with a large one", () => {
    for (const seed of SEEDS) {
      const first = topicCounts(rows(bufferShuffle(stream(), 4, seed))[0]!);
      expect(first[0]).toBeGreaterThanOrEqual(9);
      expect(first[2]).toBe(0);
    }
    const mixed = SEEDS.map((seed) => topicCounts(rows(bufferShuffle(stream(), 36, seed))[0]!));
    expect(mixed.some((c) => c[2]! > 0)).toBe(true);
  });
});

describe("firstRowWords", () => {
  it("says what the first row holds", () => {
    expect(firstRowWords(stream(), 1)).toBe(
      "With a buffer of 1 item, the first row of 12 handed out holds 12 items about A, none about B and none about C.",
    );
    const out = bufferShuffle(stream(), 4, 1);
    const [a, b, c] = topicCounts(rows(out)[0]!);
    expect(firstRowWords(out, 4)).toBe(
      `With a buffer of 4 items, the first row of 12 handed out holds ${a} items about A, ${b === 0 ? "none" : b} about B and ${c === 0 ? "none" : c} about C.`,
    );
  });
});
