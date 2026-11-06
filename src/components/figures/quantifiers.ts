/*
 * The logic behind the quantifier grid: whether a statement with two
 * quantifiers holds for a grid of ticks, and the cells that show it, a witness
 * for each "there is" and a counterexample for a "for every" that fails.
 */

import { listWords } from "./sets";

export const QUANTIFIER_KINDS = [
  "every-row-some-col",
  "some-col-every-row",
  "every-col-some-row",
  "some-row-every-col",
  "every-row-every-col",
  "some-row-some-col",
] as const;
export type QuantifierKind = (typeof QUANTIFIER_KINDS)[number];

export type GridWords = {
  rows: string[];
  cols: string[];
  /** What a row stands for, such as "model". */
  rowName: string;
  /** What a column stands for, such as "learning rate". */
  colName: string;
  /** The word between a row and a column in a sentence, as in "Small at 0.1". */
  joiner: string;
};

export type Verdict = {
  holds: boolean;
  /** The cells that show it, as [row, column]. */
  cells: [number, number][];
  /** The reason, in words. */
  because: string;
};

/** Whether a statement of this kind holds for the grid, with the cells and the words that show it. */
export function verdict(kind: QuantifierKind, ticks: boolean[][], w: GridWords): Verdict {
  const R = w.rows.length;
  const C = w.cols.length;
  const rowsIdx = Array.from({ length: R }, (_, i) => i);
  const colsIdx = Array.from({ length: C }, (_, j) => j);
  const at = (i: number, j: number) => ticks[i]?.[j] === true;
  const pair = (i: number, j: number) => `${w.rows[i]} ${w.joiner} ${w.cols[j]}`;

  switch (kind) {
    case "every-row-some-col": {
      const bad = rowsIdx.find((i) => !colsIdx.some((j) => at(i, j)));
      if (bad === undefined) {
        const picks = rowsIdx.map((i) => [i, colsIdx.find((j) => at(i, j))!] as [number, number]);
        return {
          holds: true,
          cells: picks,
          because: R === 0 ? `There are no rows, so nothing can break it.` : `Every ${w.rowName} has a tick: ${listWords(picks.map(([i, j]) => pair(i, j)))}.`,
        };
      }
      return {
        holds: false,
        cells: colsIdx.map((j) => [bad, j]),
        because: `The row for ${w.rows[bad]} has no tick, so that ${w.rowName} is a counterexample.`,
      };
    }
    case "every-col-some-row": {
      const bad = colsIdx.find((j) => !rowsIdx.some((i) => at(i, j)));
      if (bad === undefined) {
        const picks = colsIdx.map((j) => [rowsIdx.find((i) => at(i, j))!, j] as [number, number]);
        return {
          holds: true,
          cells: picks,
          because: C === 0 ? `There are no columns, so nothing can break it.` : `Every ${w.colName} has a tick: ${listWords(picks.map(([i, j]) => pair(i, j)))}.`,
        };
      }
      return {
        holds: false,
        cells: rowsIdx.map((i) => [i, bad]),
        because: `The column for ${w.cols[bad]} has no tick, so that ${w.colName} is a counterexample.`,
      };
    }
    case "some-col-every-row": {
      const good = colsIdx.find((j) => rowsIdx.every((i) => at(i, j)));
      if (good !== undefined) {
        return {
          holds: true,
          cells: rowsIdx.map((i) => [i, good]),
          because: `The column for ${w.cols[good]} is ticked in every row, so that ${w.colName} is a witness.`,
        };
      }
      const misses = colsIdx.map((j) => [rowsIdx.find((i) => !at(i, j))!, j] as [number, number]);
      return {
        holds: false,
        cells: misses,
        because: `No column is ticked in every row: ${listWords(misses.map(([i, j]) => `${w.cols[j]} misses ${w.rows[i]}`))}.`,
      };
    }
    case "some-row-every-col": {
      const good = rowsIdx.find((i) => colsIdx.every((j) => at(i, j)));
      if (good !== undefined) {
        return {
          holds: true,
          cells: colsIdx.map((j) => [good, j]),
          because: `The row for ${w.rows[good]} is ticked in every column, so that ${w.rowName} is a witness.`,
        };
      }
      const misses = rowsIdx.map((i) => [i, colsIdx.find((j) => !at(i, j))!] as [number, number]);
      return {
        holds: false,
        cells: misses,
        because: `No row is ticked in every column: ${listWords(misses.map(([i, j]) => `${w.rows[i]} misses ${w.cols[j]}`))}.`,
      };
    }
    case "every-row-every-col": {
      for (const i of rowsIdx) {
        for (const j of colsIdx) {
          if (!at(i, j)) return { holds: false, cells: [[i, j]], because: `${pair(i, j)} has no tick.` };
        }
      }
      return { holds: true, cells: rowsIdx.flatMap((i) => colsIdx.map((j) => [i, j] as [number, number])), because: "Every cell is ticked." };
    }
    case "some-row-some-col": {
      for (const i of rowsIdx) {
        for (const j of colsIdx) {
          if (at(i, j)) return { holds: true, cells: [[i, j]], because: `${pair(i, j)} is ticked.` };
        }
      }
      return { holds: false, cells: [], because: "No cell is ticked." };
    }
  }
}
