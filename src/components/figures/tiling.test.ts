import { describe, expect, it } from "vitest";

import { levelsFor, tileCount, tileOutline, tilesFor, tiling, tilingWords, type Square } from "./tiling";

const key = ([r, c]: Square) => `${r},${c}`;

describe("tiling", () => {
  for (const width of [2, 4, 8, 16]) {
    it(`covers every ${width} by ${width} grid, wherever the cut square is, once each`, () => {
      for (let r = 0; r < width; r++) {
        for (let c = 0; c < width; c++) {
          const { tiles, blocks } = tiling(width, [r, c]);
          expect(tiles).toHaveLength(tilesFor(width));
          const seen = new Map<string, number>();
          for (const t of tiles) {
            expect(t.squares).toHaveLength(3);
            for (const s of t.squares) {
              // Each tile's squares lie in its 2 by 2 block, and the left-out square is not among them.
              expect(s[0] - t.top).toBeGreaterThanOrEqual(0);
              expect(s[0] - t.top).toBeLessThan(2);
              expect(s[1] - t.left).toBeGreaterThanOrEqual(0);
              expect(s[1] - t.left).toBeLessThan(2);
              expect((s[0] - t.top) * 2 + (s[1] - t.left)).not.toBe(t.gap);
              seen.set(key(s), (seen.get(key(s)) ?? 0) + 1);
            }
          }
          expect(seen.has(key([r, c]))).toBe(false);
          expect(seen.size).toBe(width * width - 1);
          expect([...seen.values()].every((v) => v === 1)).toBe(true);
          // Level k has 4^(k-1) blocks, each with one tile across its centre.
          for (let k = 1; k <= levelsFor(width); k++) {
            expect(blocks.filter((b) => b.level === k)).toHaveLength(4 ** (k - 1));
            expect(tiles.filter((t) => t.level === k)).toHaveLength(4 ** (k - 1));
          }
        }
      }
    });
  }

  it("gives each block of the next level the square the tile above it took", () => {
    const { blocks, tiles } = tiling(8, [1, 6]);
    const centre = tiles.find((t) => t.level === 1)!;
    expect(centre.gap).toBe(1);
    expect(centre.squares.map(key).sort()).toEqual(["3,3", "4,3", "4,4"]);
    const quarters = blocks.filter((b) => b.level === 2);
    expect(quarters.map((b) => key(b.taken))).toEqual(["3,3", "1,6", "4,3", "4,4"]);
  });

  it("refuses a grid that is not 2, 4, 8, ... wide, or a cut square outside it", () => {
    expect(() => tiling(6, [0, 0])).toThrow();
    expect(() => tiling(1, [0, 0])).toThrow();
    expect(() => tiling(4, [4, 0])).toThrow();
  });
});

describe("tileOutline", () => {
  it("draws the L round the three squares it covers", () => {
    expect(tileOutline({ top: 0, left: 0, gap: 0 })).toEqual([
      [1, 0],
      [2, 0],
      [2, 2],
      [0, 2],
      [0, 1],
      [1, 1],
    ]);
    // Leaving out the bottom right square of the block at [2, 4], the inner corner is at its centre.
    const pts = tileOutline({ top: 2, left: 4, gap: 3 });
    expect(pts).toContainEqual([5, 3]);
    expect(pts).toContainEqual([4, 2]);
    expect(pts).not.toContainEqual([6, 4]);
  });
});

describe("tilingWords", () => {
  it("says what each stage shows, and counts only when asked", () => {
    expect(tilingWords(8, 0, false)).toBe(
      "No tiles yet: a grid 8 by 8, with one square cut out. The dashed lines split it into four quarters, each 4 by 4.",
    );
    expect(tilingWords(2, 0, false)).toBe("No tiles yet: a grid 2 by 2, with one square cut out.");
    expect(tilingWords(8, 1, false)).toContain("Each 4 by 4 quarter now has one square taken");
    expect(tilingWords(8, 1, false)).not.toMatch(/\d+ tiles?/);
    expect(tilingWords(8, 2, true)).toContain("5 tiles so far, of 21.");
    expect(tilingWords(8, 3, true)).toContain("21 tiles in all.");
    expect(tilingWords(2, 1, false)).toBe("One tile covers the three squares left.");
    expect(tilingWords(2, 1, true)).toBe("One tile covers the three squares left.");
  });

  it("promises no tiles when the figure has none to show, or keeps them closed", () => {
    expect(tilingWords(8, 3, false, false)).toBe(
      "A grid 8 by 8, with one square cut out. The dashed lines split it into four quarters, each 4 by 4.",
    );
    expect(tilingWords(2, 0, true, false)).toBe("A grid 2 by 2, with one square cut out.");
  });

  it("counts 1 + 4 + ... + 4^(k-1) tiles once k levels are placed", () => {
    expect([0, 1, 2, 3, 4].map(tileCount)).toEqual([0, 1, 5, 21, 85]);
    expect(tilesFor(1024)).toBe(349_525);
  });
});
