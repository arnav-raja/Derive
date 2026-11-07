/*
 * Merge sort a level at a time: the arithmetic behind the MergeLevels figure. The losses are the
 * whole numbers 1 to n, put in one of four orders; each level merges the runs of the level above
 * in pairs, counting its comparisons as the lesson's `merge` makes them, with `<` only and the
 * item from the first run moved first when two are equal. For a list of 2^k items the levels make
 * exactly the merges that `merge_sort`'s calls make.
 */

import { generator, group } from "./ties";

export type Order = "random" | "sorted" | "reversed" | "worst";

/** The orders the figure offers, with the words on their buttons. */
export const ORDERS: readonly { id: Order; label: string }[] = [
  { id: "random", label: "Shuffled" },
  { id: "sorted", label: "In order" },
  { id: "reversed", label: "Wrong way round" },
  { id: "worst", label: "Most comparisons" },
];

/** The list lengths the figure offers: 8 to 1,024, powers of 2, so that every level halves evenly. */
export const SIZES = [8, 16, 32, 64, 128, 256, 512, 1024] as const;

/** The losses 1 to n, shuffled by the Fisher and Yates method from a seeded generator. */
export function shuffled(n: number, seed: number): number[] {
  const next = generator(seed);
  const xs = Array.from({ length: n }, (_, i) => i + 1);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [xs[i], xs[j]] = [xs[j]!, xs[i]!];
  }
  return xs;
}

/**
 * The order of the sorted list `xs` that makes `merge_sort` compare the most: the items its first
 * half will hold alternate with those of its second half, so every merge takes from the two runs in
 * turn, and each half is put in its own worst order in the same way. The first half has n // 2
 * items, as `merge_sort` splits.
 */
export function worstOrder(xs: readonly number[]): number[] {
  if (xs.length <= 1) return [...xs];
  const even = xs.filter((_, i) => i % 2 === 0);
  const odd = xs.filter((_, i) => i % 2 === 1);
  // With an odd length the first half is the shorter, so it takes the odd places.
  const [first, second] = xs.length % 2 === 0 ? [even, odd] : [odd, even];
  return [...worstOrder(first), ...worstOrder(second)];
}

/** The losses 1 to n in the order asked for. */
export function makeList(n: number, order: Order, seed: number): number[] {
  const sorted = Array.from({ length: n }, (_, i) => i + 1);
  switch (order) {
    case "sorted":
      return sorted;
    case "reversed":
      return sorted.reverse();
    case "worst":
      return worstOrder(sorted);
    default:
      return shuffled(n, seed);
  }
}

/** The lesson's `merge`, with its comparisons counted. */
export function merge(a: readonly number[], b: readonly number[]): { out: number[]; comparisons: number } {
  const out: number[] = [];
  let i = 0;
  let j = 0;
  let comparisons = 0;
  while (i < a.length && j < b.length) {
    comparisons += 1;
    if (b[j]! < a[i]!) {
      out.push(b[j]!);
      j += 1;
    } else {
      out.push(a[i]!);
      i += 1;
    }
  }
  return { out: [...out, ...a.slice(i), ...b.slice(j)], comparisons };
}

/** One row of the figure: its runs, and the comparisons its merges made. */
export type Level = { runs: number[][]; comparisons: number };

/** The list as single items, then each level of merges in pairs, until one run is left. */
export function mergeLevels(list: readonly number[]): Level[] {
  const levels: Level[] = [{ runs: list.map((x) => [x]), comparisons: 0 }];
  while (levels.at(-1)!.runs.length > 1) {
    const above = levels.at(-1)!.runs;
    const runs: number[][] = [];
    let comparisons = 0;
    for (let k = 0; k + 1 < above.length; k += 2) {
      const m = merge(above[k]!, above[k + 1]!);
      runs.push(m.out);
      comparisons += m.comparisons;
    }
    if (above.length % 2 === 1) runs.push(above.at(-1)!);
    levels.push({ runs, comparisons });
  }
  return levels;
}

/** All the comparisons of all the levels. */
export function totalComparisons(levels: readonly Level[]): number {
  return levels.reduce((sum, l) => sum + l.comparisons, 0);
}

/** n(n − 1)/2: the comparisons of a sort that picks the smallest item left, again and again. */
export function pickSmallest(n: number): number {
  return (n * (n - 1)) / 2;
}

const ORDER_WORDS: Record<Order, string> = {
  random: "shuffled",
  sorted: "already in order",
  reversed: "the wrong way round",
  worst: "in the order that makes the most comparisons",
};

/** What the figure shows, in words. */
export function levelsWords(n: number, order: Order, levels: readonly Level[]): string {
  const merging = levels.length - 1;
  const total = totalComparisons(levels);
  const most = levels.reduce((m, l) => Math.max(m, l.comparisons), 0);
  return (
    `${group(n)} losses, ${ORDER_WORDS[order]}: ${merging} ${merging === 1 ? "level" : "levels"} of merges make ` +
    `${group(total)} ${total === 1 ? "comparison" : "comparisons"} in all, no level more than ${group(most)}. ` +
    `Picking the smallest loss left, again and again, would make ${group(pickSmallest(n))}.`
  );
}
