"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { CheckIcon, CrossIcon, LockIcon } from "@/components/ui/icons";

import { verdict, type GridWords, type QuantifierKind } from "./quantifiers";
import { FigureFrame } from "./shell";

/*
 * A grid of ticks with a row for each of one kind of thing and a column for
 * each of another, and statements about it with two quantifiers. Once open,
 * the figure says whether each statement holds, points to the cells that show
 * it, and lets the learner change the cells to see a statement change.
 */

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function QuantifierGrid({
  title,
  description,
  rowName,
  colName,
  rows,
  cols,
  cells,
  statements,
  joiner = "at",
  yes = "ticked",
  no = "not ticked",
  verdictsLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** What a row stands for, such as "model". */
  rowName: string;
  /** What a column stands for, such as "learning rate". */
  colName: string;
  rows: string[];
  cols: string[];
  /** 1 for a tick and 0 for none, a row at a time. */
  cells: (0 | 1 | boolean)[][];
  statements: { kind: QuantifierKind; text: string }[];
  /** The word between a row and a column in a sentence, as in "Small at 0.1". */
  joiner?: string;
  /** What a tick and its absence mean, for a screen reader. */
  yes?: string;
  no?: string;
  /** Keeps the verdicts, and changing the cells, closed until the exercise they would answer is done. */
  verdictsLocked?: boolean;
  /** Says what opens them. */
  lockedNote?: string;
}) {
  const initial = useMemo(() => rows.map((_, i) => cols.map((_, j) => Boolean(cells[i]?.[j]))), [rows, cols, cells]);
  const [ticks, setTicks] = useState(initial);
  const [shown, setShown] = useState<number | null>(null);
  // For a screen reader: which statements a change to the grid has made true or false.
  const [news, setNews] = useState("");
  const open = !verdictsLocked;

  const words: GridWords = { rows, cols, rowName, colName, joiner };
  const verdicts = statements.map((s) => verdict(s.kind, ticks, words));
  const lit = new Set(open && shown !== null ? verdicts[shown]!.cells.map(([i, j]) => `${i},${j}`) : []);
  const changed = ticks.some((row, i) => row.some((v, j) => v !== initial[i]![j]));

  const toggle = (i: number, j: number) => {
    const next = ticks.map((row, a) => (a === i ? row.map((v, b) => (b === j ? !v : v)) : row));
    const changes = statements.flatMap((s) => {
      const before = verdict(s.kind, ticks, words).holds;
      const after = verdict(s.kind, next, words).holds;
      return before === after ? [] : [`Now ${after ? "true" : "false"}: ${s.text}`];
    });
    setTicks(next);
    setNews(changes.length ? changes.join(" ") : "No statement has changed.");
  };
  const putBack = () => {
    setTicks(initial);
    setNews("The grid is as it was, and so are the statements.");
  };

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div className="overflow-x-auto">
          <table aria-labelledby={titleId} aria-describedby={descId} className="mx-auto border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <td />
                <th scope="colgroup" colSpan={cols.length} className="px-2 pb-1 text-center text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {capitalise(colName)}
                </th>
              </tr>
              <tr>
                <th scope="col" className="px-2 text-left text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {capitalise(rowName)}
                </th>
                {cols.map((c) => (
                  <th key={c} scope="col" className="tabular min-w-16 px-2 text-center font-semibold text-ink">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r}>
                  <th scope="row" className="px-2 text-left font-medium text-ink">
                    {r}
                  </th>
                  {cols.map((c, j) => {
                    const on = ticks[i]![j]!;
                    const mark = on ? (
                      <CheckIcon aria-hidden="true" className="size-5 text-fig-vector" strokeWidth={2.5} />
                    ) : (
                      <CrossIcon aria-hidden="true" className="size-4 text-ink-faint" strokeWidth={2} />
                    );
                    const cellClass = clsx(
                      "flex h-11 w-full min-w-16 items-center justify-center rounded-md border",
                      lit.has(`${i},${j}`) ? "border-accent bg-accent-soft ring-2 ring-accent" : on ? "border-rule bg-surface" : "border-rule bg-inset",
                    );
                    return (
                      <td key={c} className="p-0">
                        {open ? (
                          <button type="button" aria-pressed={on} onClick={() => toggle(i, j)} className={clsx(cellClass, "cursor-pointer hover:border-rule-strong")}>
                            {mark}
                            <span className="sr-only">
                              {r} {joiner} {c}: {on ? yes : no}
                            </span>
                          </button>
                        ) : (
                          <span className={cellClass}>
                            {mark}
                            <span className="sr-only">{on ? yes : no}</span>
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      controls={
        <>
          <ol className="flex flex-col gap-2">
            {statements.map((s, k) => {
              const v = verdicts[k]!;
              return (
                <li key={k} className="flex flex-col gap-1 rounded-md border border-rule bg-surface px-3 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm text-ink">{s.text}</p>
                    {open ? (
                      <span className={clsx("inline-flex items-center gap-1 text-sm font-semibold", v.holds ? "text-correct" : "text-incorrect")}>
                        {v.holds ? <CheckIcon aria-hidden="true" className="size-4" /> : <CrossIcon aria-hidden="true" className="size-4" />}
                        {v.holds ? "True" : "False"}
                      </span>
                    ) : null}
                  </div>
                  {open ? (
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="text-sm text-ink-muted">{v.because}</p>
                      {v.cells.length ? (
                        <Button size="sm" variant="ghost" onClick={() => setShown(shown === k ? null : k)}>
                          {shown === k ? "Hide the cells" : "Show the cells"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
          {open ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink-muted">
                {changed ? "You have changed the grid; the verdicts follow it." : "Choose a cell to add or take away its tick."}
              </p>
              <p role="status" className="sr-only">
                {news}
              </p>
              {changed ? (
                <Button size="sm" variant="secondary" onClick={putBack}>
                  Put the grid back
                </Button>
              ) : null}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <LockIcon aria-hidden="true" className="size-4 shrink-0" />
              {lockedNote ?? "Whether each statement holds opens once you have answered the question below."}
            </p>
          )}
        </>
      }
    />
  );
}
