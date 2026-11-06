/*
 * The logic behind the tile figure: a grid 2^n squares wide with one square cut out, covered with
 * L tiles (a 2 by 2 block less one square) the way induction on n covers it. The tile across the
 * centre takes one square from each of the three quarters that do not hold the cut square; that
 * leaves four grids half as wide, each with one square taken, and each is covered the same way.
 * Squares are [row, column], counted from 0 at the top left.
 */

export type Square = [row: number, column: number];

/** A grid the construction covers: the whole grid at level 1, its quarters at level 2, and so on. */
export type Block = { level: number; top: number; left: number; width: number; taken: Square };

/**
 * One L tile. It lies in the 2 by 2 block of squares whose top left square is [top, left], and
 * leaves out one of its four squares: 0 the top left, 1 the top right, 2 the bottom left and 3 the
 * bottom right. It is placed at the level of the block it crosses the centre of.
 */
export type Tile = { level: number; top: number; left: number; gap: 0 | 1 | 2 | 3; squares: Square[] };

export const isPowerOfTwo = (w: number) => Number.isInteger(w) && w >= 1 && (w & (w - 1)) === 0;

/** How many levels the construction has for a grid this wide: 3 for 8 by 8. */
export const levelsFor = (width: number) => Math.round(Math.log2(width));

/** How many tiles cover a grid this wide, less one square: (width^2 - 1) / 3. */
export const tilesFor = (width: number) => (width * width - 1) / 3;

/** Every block and tile of the construction, a level at a time. */
export function tiling(width: number, cut: Square): { blocks: Block[]; tiles: Tile[] } {
  if (!isPowerOfTwo(width) || width < 2) throw new Error(`The grid must be 2, 4, 8, ... squares wide, not ${width}.`);
  const [r, c] = cut;
  if (!(Number.isInteger(r) && Number.isInteger(c) && r >= 0 && c >= 0 && r < width && c < width)) {
    throw new Error(`The cut square [${r}, ${c}] is not in a grid ${width} squares wide.`);
  }
  const blocks: Block[] = [];
  const tiles: Tile[] = [];
  let level: Block[] = [{ level: 1, top: 0, left: 0, width, taken: [r, c] }];
  while (level.length && level[0]!.width >= 2) {
    const next: Block[] = [];
    for (const b of level) {
      blocks.push(b);
      const h = b.width / 2;
      const corners: Square[] = [
        [b.top, b.left],
        [b.top, b.left + h],
        [b.top + h, b.left],
        [b.top + h, b.left + h],
      ];
      // The four squares round the centre, one in each quarter, in the same order as the quarters.
      const middle: Square[] = [
        [b.top + h - 1, b.left + h - 1],
        [b.top + h - 1, b.left + h],
        [b.top + h, b.left + h - 1],
        [b.top + h, b.left + h],
      ];
      const [tr, tc] = b.taken;
      const holder = (tr >= b.top + h ? 2 : 0) + (tc >= b.left + h ? 1 : 0);
      tiles.push({
        level: b.level,
        top: b.top + h - 1,
        left: b.left + h - 1,
        gap: holder as Tile["gap"],
        squares: middle.filter((_, i) => i !== holder),
      });
      if (h >= 2) {
        corners.forEach(([top, left], i) => next.push({ level: b.level + 1, top, left, width: h, taken: i === holder ? b.taken : middle[i]! }));
      }
    }
    level = next;
  }
  return { blocks, tiles };
}

/** The corners of a tile's L, in order round it, in units of one square. */
export function tileOutline(tile: Pick<Tile, "top" | "left" | "gap">): [x: number, y: number][] {
  const flipX = tile.gap % 2 === 1;
  const flipY = tile.gap >= 2;
  // The L that leaves out the top left square, measured from the block's top left corner.
  const base: [number, number][] = [
    [1, 0],
    [2, 0],
    [2, 2],
    [0, 2],
    [0, 1],
    [1, 1],
  ];
  return base.map(([x, y]) => [tile.left + (flipX ? 2 - x : x), tile.top + (flipY ? 2 - y : y)]);
}

const group = (n: number) => n.toLocaleString("en-GB");

/**
 * What the figure shows, in words, for a grid this wide with this many levels of tiles placed.
 * `tilesShown` is false when the figure has no tiles to show, or keeps them closed, so that the
 * words do not promise tiles that are to come.
 */
export function tilingWords(width: number, placed: number, counts: boolean, tilesShown = true): string {
  const n = levelsFor(width);
  const k = tilesShown ? Math.max(0, Math.min(n, placed)) : 0;
  const so = counts ? ` ${tileCount(k)} ${tileCount(k) === 1 ? "tile" : "tiles"} so far, of ${group(tilesFor(width))}.` : "";
  if (k === 0) {
    const quarters = n >= 2 ? ` The dashed lines split it into four quarters, each ${width / 2} by ${width / 2}.` : "";
    const grid = `grid ${width} by ${width}, with one square cut out.${quarters}`;
    return tilesShown ? `No tiles yet: a ${grid}` : `A ${grid}`;
  }
  if (k === n) {
    if (n === 1) return "One tile covers the three squares left.";
    const all = "Every square but the cut one is covered, and no two tiles overlap.";
    return counts ? `${all} ${group(tilesFor(width))} tiles in all.` : all;
  }
  const w = width / 2 ** k;
  if (k === 1) {
    return `The tile across the centre takes one square from each of the three quarters without the cut square. Each ${w} by ${w} quarter now has one square taken: the same puzzle, half as wide.${so}`;
  }
  return `${k} levels placed. Each ${w} by ${w} block, outlined, now has one square taken, so it is covered the same way.${so}`;
}

/** Tiles placed once k levels are down: 1 + 4 + ... + 4^(k-1). */
export const tileCount = (k: number) => (4 ** k - 1) / 3;
