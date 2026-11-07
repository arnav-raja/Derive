import { describe, expect, it } from "vitest";

import { levelsFor, tileCount, tileOutline, tilesFor, tiling, tilingWords, type Square } from "./tiling";

const key = ([r, c]: Square) => `${r},${c}`;

describe("tiling", () => {
  for (const width of [2, 4, 8, 16]) {
    it(`covers every ${width} by ${width} grid, wherever the cut square is, once each`, () => {
      // The checks are gathered and asserted once: an expect for each square of every 16 by 16
      // tiling took seconds, close to the runner's timeout.
      const problems: string[] = [];
      for (let r = 0; r < width; r++) {
        for (let c = 0; c < width; c++) {
          const where = `cut at ${r},${c}`;
          const { tiles, blocks } = tiling(width, [r, c]);
          if (tiles.length !== tilesFor(width)) problems.push(`${where}: ${tiles.length} tiles`);
          const seen = new Map<string, number>();
          for (const t of tiles) {
            if (t.squares.length !== 3) problems.push(`${where}: a tile of ${t.squares.length} squares`);
            for (const s of t.squares) {
              // Each tile's squares lie in its 2 by 2 block, and the left-out square is not among them.
              const down = s[0] - t.top;
              const across = s[1] - t.left;
              if (down < 0 || down > 1 || across < 0 || across > 1) problems.push(`${where}: ${key(s)} lies outside its block`);
              if (down * 2 + across === t.gap) problems.push(`${where}: ${key(s)} is its tile's left-out square`);
              seen.set(key(s), (seen.get(key(s)) ?? 0) + 1);
            }
          }
          if (seen.has(key([r, c]))) problems.push(`${where}: the cut square is covered`);
          if (seen.size !== width * width - 1) problems.push(`${where}: ${seen.size} squares covered`);
          if (![...seen.values()].every((v) => v === 1)) problems.push(`${where}: a square is covered twice`);
          // Level k has 4^(k-1) blocks, each with one tile across its centre.
          for (let k = 1; k <= levelsFor(width); k++) {
            const levelBlocks = blocks.filter((b) => b.level === k).length;
            const levelTiles = tiles.filter((t) => t.level === k).length;
            if (levelBlocks !== 4 ** (k - 1) || levelTiles !== 4 ** (k - 1)) {
              problems.push(`${where}: level ${k} has ${levelBlocks} blocks and ${levelTiles} tiles`);
            }
          }
        }
      }
      expect(problems).toEqual([]);
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
