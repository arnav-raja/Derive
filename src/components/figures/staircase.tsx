"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { FigureFrame, RangeControl, useWidth } from "./shell";

/*
 * The staircase of causal attention. Token k is compared with tokens 1 to k,
 * so row k has k dots, and the comparisons a token may not make (with later
 * tokens) are drawn faintly. A second staircase, turned round, fills the rest
 * of a rectangle n rows deep and n + 1 columns wide.
 */

const LEFT = 34;
const TOP = 40;
const RIGHT = 8;
const BOTTOM = 8;

function sumText(n: number) {
  if (n === 1) return "1";
  if (n <= 5) return Array.from({ length: n }, (_, i) => i + 1).join(" + ");
  return `1 + 2 + 3 + … + ${n}`;
}

const count = (n: number) => (n * (n + 1)) / 2;

export function Staircase({
  title,
  description,
  max = 12,
  initial = 4,
  turnedLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** The largest number of tokens the slider reaches. */
  max?: number;
  initial?: number;
  /** Keeps the turned copy closed until the exercise that it would answer is done. */
  turnedLocked?: boolean;
  /** Says what opens the turned copy. */
  lockedNote?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [n, setN] = useState(Math.min(max, Math.max(1, initial)));
  const [turnedOn, setTurnedOn] = useState(false);
  const turned = turnedOn && !turnedLocked;

  // Cells are sized for the widest picture, max + 1 columns, so the picture
  // keeps its size while the slider moves.
  const cell = Math.max(16, Math.min(28, Math.floor((width - LEFT - RIGHT) / (max + 1))));
  const gridW = LEFT + (max + 1) * cell + RIGHT;
  const offset = Math.max(0, Math.floor((width - gridW) / 2));
  const x0 = offset + LEFT;
  const height = TOP + max * cell + BOTTOM;
  const r = Math.max(4, cell * 0.3);
  const cx = (j: number) => x0 + (j - 0.5) * cell;
  const cy = (k: number) => TOP + (k - 0.5) * cell;
  const columns = turned ? n + 1 : n;

  const rows = Array.from({ length: n }, (_, i) => i + 1);

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
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block max-w-full font-sans"
          >
            <text x={x0 + (columns * cell) / 2} y={12} textAnchor="middle" className="fill-ink-muted text-[12px]">
              compared with token
            </text>
            <text
              x={offset + 10}
              y={TOP + (n * cell) / 2}
              textAnchor="middle"
              transform={`rotate(-90 ${offset + 10} ${TOP + (n * cell) / 2})`}
              className="fill-ink-muted text-[12px]"
            >
              token
            </text>
            {Array.from({ length: n }, (_, i) => i + 1).map((j) => (
              <text key={`c${j}`} x={cx(j)} y={TOP - 8} textAnchor="middle" className="tabular fill-ink-muted text-[11px]">
                {j}
              </text>
            ))}
            {rows.map((k) => (
              <text key={`r${k}`} x={x0 - 6} y={cy(k) + 4} textAnchor="end" className="tabular fill-ink-muted text-[11px]">
                {k}
              </text>
            ))}
            {turned ? (
              <rect
                x={x0}
                y={TOP}
                width={(n + 1) * cell}
                height={n * cell}
                rx={4}
                className="fill-none stroke-fig-axis"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            ) : null}
            {rows.map((k) =>
              Array.from({ length: columns }, (_, i) => i + 1).map((j) => {
                if (j <= k) {
                  return <circle key={`${k}-${j}`} cx={cx(j)} cy={cy(k)} r={r} className="fill-fig-vector" />;
                }
                if (turned) {
                  const s = r * 1.7;
                  return (
                    <rect
                      key={`${k}-${j}`}
                      x={cx(j) - s / 2}
                      y={cy(k) - s / 2}
                      width={s}
                      height={s}
                      rx={2}
                      className="fill-fig-gradient"
                    />
                  );
                }
                return <circle key={`${k}-${j}`} cx={cx(j)} cy={cy(k)} r={Math.max(1.5, r * 0.3)} className="fill-fig-axis opacity-40" />;
              }),
            )}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl label="Tokens, n" sym="n" min={1} max={max} step={1} value={n} onChange={setN} display={String(n)} />
          <p className="text-sm text-ink" aria-live="polite">
            {turned ? (
              <>
                Two staircases fill {n} {n === 1 ? "row" : "rows"} of {n + 1}: {n * (n + 1)} dots and squares in all, so one
                staircase has {n * (n + 1)} ÷ 2 = <span className="tabular font-semibold">{count(n)}</span>.
              </>
            ) : (
              <>
                {n === 1 ? "1 token makes " : `${n} tokens make `}
                <span className="tabular">{sumText(n)}</span> = <span className="tabular font-semibold">{count(n)}</span>{" "}
                {count(n) === 1 ? "comparison" : "comparisons"}. The faint dots are comparisons with later tokens, which
                are never made.
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setTurnedOn((t) => !t)}
              aria-pressed={turned}
              disabled={turnedLocked && !turned}
            >
              {turned ? "Take the second staircase away" : "Add a second staircase, turned round"}
            </Button>
            {turnedLocked ? <p className="text-sm text-ink-muted">{lockedNote ?? "The second staircase opens once you have answered the question below."}</p> : null}
            {turned ? (
              <p className="text-sm text-ink-muted">Circles: the first staircase. Squares: the same staircase turned round.</p>
            ) : null}
          </div>
        </>
      }
      table={{
        columns: ["Tokens, n", "Comparisons"],
        rows: Array.from({ length: max }, (_, i) => [i + 1, count(i + 1)]),
      }}
    />
  );
}
