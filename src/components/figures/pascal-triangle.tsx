"use client";

import { useMemo, useState } from "react";

import { LockIcon } from "@/components/ui/icons";

import { above, entryWords, pascalRows, SETS_MAX_ROW, setWords, splitByLast } from "./pascal";
import { FigureFrame, RangeControl, useWidth } from "./shell";

/*
 * Pascal's triangle, row 0 at the top, with one entry picked out and the entries just above it
 * marked, so that the learner can compare them. With `sums`, each row's sum stands at its right.
 * With `sets`, a list shows the sets of features that the picked entry counts, split by whether
 * they hold the last feature; the list can stay closed until the exercise it would answer is done.
 */

const LABEL = 26;
const TOP = 18;
const MAX_ROWS = 12;

const grouped = (v: number) => v.toLocaleString("en-GB");

export function PascalTriangle({
  title,
  description,
  rows: initialRows = 6,
  maxRows = 10,
  selected = [4, 2],
  sums = false,
  sets = false,
  setsLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** The last row shown, to begin with: rows 0 to this one. */
  rows?: number;
  /** The last row the control reaches, at most 12. */
  maxRows?: number;
  /** The entry picked out to begin with, as [row, place], both counted from 0. */
  selected?: [number, number];
  /** Shows each row's sum at its right. */
  sums?: boolean;
  /** Lists the sets that the picked entry counts. */
  sets?: boolean;
  /** Keeps that list, and the words that add the two entries above, closed until the exercise they would answer is done. */
  setsLocked?: boolean;
  /** Says what opens them. */
  lockedNote?: string;
}) {
  const [ref, boxWidth] = useWidth<HTMLDivElement>();
  const top = Math.min(MAX_ROWS, Math.max(1, Math.round(maxRows)));
  const [last, setLast] = useState(Math.min(top, Math.max(1, Math.round(initialRows))));
  const [pick, setPick] = useState<[number, number]>(() => {
    const r = Math.min(last, Math.max(0, Math.round(selected[0])));
    return [r, Math.min(r, Math.max(0, Math.round(selected[1])))];
  });
  const [pn, pk] = pick;

  const rows = useMemo(() => pascalRows(last), [last]);
  const changeLast = (next: number) => {
    setPick(([r, i]) => {
      const row = Math.min(r, next);
      return [row, Math.min(i, row)];
    });
    setLast(next);
  };

  // The width of the widest number decides how far apart the entries must be. Inter's tabular
  // figures are 0.648 em wide, and filling 0.84 of a cell leaves a gap between neighbours. Narrow
  // boxes give the row labels less room.
  const label = boxWidth < 360 ? 18 : LABEL;
  const digits = grouped(Math.max(...rows[last]!)).length;
  const sumDigits = sums ? grouped(2 ** last).length : 0;
  const sumWidth = sums ? Math.max(30, sumDigits * 7.5 + 14) : 0;
  const avail = Math.max(120, boxWidth - label - sumWidth - 4);
  const cell = Math.min(46, avail / (last + 1));
  const fontSize = Math.max(9, Math.min(14, (cell * 0.84) / (0.65 * Math.max(2, digits))));
  const rowH = Math.max(22, Math.min(34, fontSize * 2.3));
  const centre = label + avail / 2;
  const height = TOP + (last + 1) * rowH + 4;
  const xOf = (r: number, i: number) => centre + (i - r / 2) * cell;
  const yOf = (r: number) => TOP + r * rowH + rowH / 2;
  const boxW = Math.min(cell - 2, Math.max(fontSize * 1.6, fontSize * 0.62 * digits + 10));
  const boxH = Math.min(rowH - 4, fontSize * 1.7);
  const parents = above(pn, pk);
  const rule = sets ? !setsLocked : true;
  const split = useMemo(() => splitByLast(pn, pk), [pn, pk]);
  const value = rows[pn]?.[pk] ?? 0;

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div ref={ref} className="w-full">
          <svg
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descId}
            width={boxWidth}
            height={height}
            viewBox={`0 0 ${boxWidth} ${height}`}
            className="block max-w-full font-sans"
          >
            <g className="fill-ink-muted text-[10px]">
              <text x={2} y={TOP - 6}>
                Row
              </text>
              {sums ? (
                <text x={label + avail + 8} y={TOP - 6}>
                  Sum
                </text>
              ) : null}
            </g>
            {parents.map(([r, i]) => (
              <line
                key={`line${r},${i}`}
                x1={xOf(r, i)}
                y1={yOf(r) + boxH / 2}
                x2={xOf(pn, pk)}
                y2={yOf(pn) - boxH / 2}
                className="stroke-fig-gradient"
                strokeWidth={1.5}
              />
            ))}
            {parents.map(([r, i]) => (
              <rect
                key={`up${r},${i}`}
                x={xOf(r, i) - boxW / 2}
                y={yOf(r) - boxH / 2}
                width={boxW}
                height={boxH}
                rx={boxH / 2}
                className="fill-surface stroke-fig-gradient"
                strokeWidth={1.75}
              />
            ))}
            <rect
              x={xOf(pn, pk) - boxW / 2}
              y={yOf(pn) - boxH / 2}
              width={boxW}
              height={boxH}
              rx={boxH / 2}
              className="fill-fig-gradient stroke-fig-gradient"
              strokeWidth={1}
            />
            {rows.map((row, r) => (
              <g key={r} className="tabular">
                <text x={2} y={yOf(r) + 3.5} className="fill-ink-muted text-[11px]">
                  {r}
                </text>
                {row.map((v, i) => {
                  const picked = r === pn && i === pk;
                  return (
                    <text
                      key={i}
                      x={xOf(r, i)}
                      y={yOf(r) + fontSize * 0.36}
                      textAnchor="middle"
                      fontSize={fontSize}
                      className={picked ? "fill-surface font-semibold" : "fill-ink"}
                    >
                      {grouped(v)}
                    </text>
                  );
                })}
                {sums ? (
                  <text x={label + avail + 8} y={yOf(r) + fontSize * 0.36} fontSize={Math.min(fontSize, 13)} className="fill-ink-muted">
                    {grouped(2 ** r)}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl label="Rows shown" min={1} max={top} step={1} value={last} onChange={changeLast} display={`0 to ${last}`} />
          <RangeControl
            label="Picked entry: row"
            min={0}
            max={last}
            step={1}
            value={pn}
            onChange={(r) => setPick(([, i]) => [r, Math.min(i, r)])}
          />
          <RangeControl label="Picked entry: place" min={0} max={pn} step={1} value={pk} onChange={(i) => setPick(([r]) => [r, i])} />
          <p className="tabular text-sm text-ink" aria-live="polite">
            {entryWords(rows, pn, pk, rule, sums)}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={18} height={12} viewBox="0 0 18 12" className="shrink-0">
                <rect x={0.5} y={0.5} width={17} height={11} rx={5.5} className="fill-fig-gradient stroke-fig-gradient" />
              </svg>
              The picked entry
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={18} height={12} viewBox="0 0 18 12" className="shrink-0">
                <rect x={1} y={1} width={16} height={10} rx={5} className="fill-surface stroke-fig-gradient" strokeWidth={1.75} />
              </svg>
              The entries just above it
            </li>
            {sums ? <li>Each row&apos;s sum, at its right</li> : null}
          </ul>
          {sets ? (
            setsLocked ? (
              <p className="flex items-center gap-2 text-sm text-ink-muted">
                <LockIcon aria-hidden="true" className="size-4 shrink-0" />
                {lockedNote ?? "The list of sets opens once you have answered the question below."}
              </p>
            ) : pn > SETS_MAX_ROW ? (
              <p className="text-sm text-ink-muted">The sets are listed for the entries of rows 0 to {SETS_MAX_ROW}.</p>
            ) : pn === 0 ? (
              <p className="text-sm text-ink">There are no features to choose from, and the one set of none of them is the empty set, ∅.</p>
            ) : (
              <div className="flex flex-col gap-2 text-sm text-ink">
                <p>
                  The {grouped(value)} {value === 1 ? "set" : "sets"} of {pk} of {pn === 1 ? "feature 1" : `the features 1 to ${pn}`}:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { label: `With feature ${pn}`, list: split.withLast },
                    { label: `Without feature ${pn}`, list: split.withoutLast },
                  ].map((part) => (
                    <div key={part.label} className="flex flex-col gap-1">
                      <p className="font-semibold">
                        {part.label}: {part.list.length}
                      </p>
                      {part.list.length ? (
                        <ul aria-label={part.label} className="tabular flex flex-wrap gap-1">
                          {part.list.map((s) => (
                            <li key={s.join(",")} className="rounded-sm border border-rule bg-surface px-1.5 py-0.5">
                              {setWords(s)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-ink-muted">None</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : null}
        </>
      }
      table={{
        columns: sums ? ["Row", "Entries", "Sum"] : ["Row", "Entries"],
        rows: rows.map((row, r) => {
          const line = [r, row.map(grouped).join(", ")] as (string | number)[];
          return sums ? [...line, grouped(2 ** r)] : line;
        }),
      }}
    />
  );
}
