/*
 * Random lists of whole numbers, and which of them have two equal numbers: the arithmetic behind
 * the TieLists figure. The lists come from a seeded generator, so the same settings and seed always
 * draw the same lists, on the server and in the browser alike.
 */

/** The largest numbers the figure offers, from 10 to 1,000,000. */
export const TOPS = [10, 100, 1_000, 10_000, 100_000, 1_000_000] as const;

/** Numbers grouped in threes, as the lessons write them. */
export function group(n: number): string {
  return n.toLocaleString("en-GB");
}

/** A small, fast generator of numbers from 0 up to 1 (mulberry32), started from a whole-number seed. */
export function generator(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` lists of `length` whole numbers, each from 1 to `top`, every one as likely as the others. */
export function drawLists(seed: number, count: number, length: number, top: number): number[][] {
  const next = generator(seed);
  return Array.from({ length: count }, () => Array.from({ length }, () => 1 + Math.floor(next() * top)));
}

/** The first number that appears a second time in the list, reading from the start, or null when no two are equal. */
export function repeated(list: number[]): number | null {
  const seen = new Set<number>();
  for (const x of list) {
    if (seen.has(x)) return x;
    seen.add(x);
  }
  return null;
}

/** The number of pairs among n items, n(n - 1)/2. */
export function pairs(n: number): number {
  return (n * (n - 1)) / 2;
}

/** What the figure shows, in words: how many of the lists have two equal numbers. */
export function tieWords(lists: number[][], top: number): string {
  const count = lists.length;
  const length = lists[0]?.length ?? 0;
  const ties = lists.filter((l) => repeated(l) !== null).length;
  const what = `${group(count)} lists of ${length} whole numbers, each from 1 to ${group(top)}`;
  if (ties === 0) return `Of ${what}, none has two equal numbers.`;
  if (ties === count) return `Of ${what}, every one has two equal numbers.`;
  return `Of ${what}, ${group(ties)} ${ties === 1 ? "has" : "have"} two equal numbers.`;
}

/** The numbers that appear more than once in the list, in the order they first appear. */
export function repeats(list: number[]): number[] {
  const counts = new Map<number, number>();
  for (const x of list) counts.set(x, (counts.get(x) ?? 0) + 1);
  return [...counts].filter(([, k]) => k > 1).map(([x]) => x);
}

/** One list in words, with the numbers that repeat, if any do. */
export function listWords(index: number, list: number[]): string {
  const numbers = list.map(group).join(", ");
  const r = repeats(list);
  const head = `List ${index + 1}: ${numbers}.`;
  if (r.length === 0) return `${head} No two are equal.`;
  if (r.length === 1) {
    const times = list.filter((x) => x === r[0]).length;
    return `${head} ${group(r[0]!)} appears ${times === 2 ? "twice" : `${times} times`}.`;
  }
  const names = r.map(group);
  return `${head} ${names.slice(0, -1).join(", ")} and ${names.at(-1)} each appear more than once.`;
}
