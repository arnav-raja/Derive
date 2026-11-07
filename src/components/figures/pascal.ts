/*
 * The numbers behind the Pascal's triangle figure: its rows, built by Pascal's rule, the sets that
 * an entry counts, split by whether they hold the last of the things, and the figure's words.
 */

/** The last row whose entries' sets the figure lists: no entry up to row 6 counts more than 20. */
export const SETS_MAX_ROW = 6;

/** Rows 0 to `last` of Pascal's triangle, each built from the row above by Pascal's rule. */
export function pascalRows(last: number): number[][] {
  const rows: number[][] = [[1]];
  for (let r = 1; r <= last; r += 1) {
    const above = rows[r - 1]!;
    const row = [1];
    for (let i = 0; i + 1 < above.length; i += 1) row.push(above[i]! + above[i + 1]!);
    row.push(1);
    rows.push(row);
  }
  return rows;
}

/** Every set of k of the numbers 1 to n, each written in increasing order, the sets in dictionary order. */
export function subsets(n: number, k: number): number[][] {
  const out: number[][] = [];
  const pick = (from: number, chosen: number[]) => {
    if (chosen.length === k) {
      out.push(chosen);
      return;
    }
    for (let x = from; x <= n - (k - chosen.length) + 1; x += 1) pick(x + 1, [...chosen, x]);
  };
  if (k >= 0 && k <= n) pick(1, []);
  return out;
}

/** The sets of k of the numbers 1 to n that hold n, and those that leave it out. */
export function splitByLast(n: number, k: number): { withLast: number[][]; withoutLast: number[][] } {
  const all = subsets(n, k);
  return { withLast: all.filter((s) => s.includes(n)), withoutLast: all.filter((s) => !s.includes(n)) };
}

/** A set as it is written: {1, 3, 4}, or ∅ for the empty set. */
export function setWords(set: readonly number[]): string {
  return set.length === 0 ? "∅" : `{${set.join(", ")}}`;
}

const grouped = (v: number) => v.toLocaleString("en-GB");

/** The entries just above row n, place k: above to the left and above to the right, where they exist. */
export function above(n: number, k: number): [number, number][] {
  if (n === 0) return [];
  const out: [number, number][] = [];
  if (k >= 1) out.push([n - 1, k - 1]);
  if (k <= n - 1) out.push([n - 1, k]);
  return out;
}

/**
 * The picked entry in words: its value and what it counts, then the entries above it. With `rule`,
 * the words also say that the two entries above add up to it, which is Pascal's rule; without, the
 * learner is left to notice it. With `sums`, they give the row's sum.
 */
export function entryWords(rows: number[][], n: number, k: number, rule: boolean, sums: boolean): string {
  const value = rows[n]?.[k] ?? 0;
  const parts = [`Row ${n}, place ${k} is ${grouped(value)}, the number of ways to choose ${k} of ${n} ${n === 1 ? "thing" : "things"}.`];
  const ups = above(n, k).map(([r, i]) => rows[r]?.[i] ?? 0);
  if (ups.length === 0) parts.push("It is the top of the triangle.");
  else if (ups.length === 1) parts.push(`It is at an end of its row, with one entry above it, ${grouped(ups[0]!)}.`);
  else {
    const [a, b] = ups as [number, number];
    parts.push(rule ? `Just above it are ${grouped(a)} and ${grouped(b)}, and ${grouped(a)} + ${grouped(b)} = ${grouped(value)}.` : `Just above it are ${grouped(a)} and ${grouped(b)}.`);
  }
  if (sums) {
    const total = (rows[n] ?? []).reduce((s, v) => s + v, 0);
    parts.push(`Row ${n} adds up to ${grouped(total)}, which is 2 to the power ${n}.`);
  }
  return parts.join(" ");
}
