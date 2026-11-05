"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { FigureFrame, FigureLabel, RangeControl, useWidth } from "./shell";

/*
 * The terms 1, r, r^2, ... laid end to end on a line, so the bar's length is
 * the sum of the first n terms. The scale is fixed, so the picture never hints
 * at where the sum is heading; that marker opens only after the exercise that
 * asks for it.
 */

const MARGIN = 24;
const SUMS_AT = [1, 2, 3, 5, 10, 20, 50, 100, 200];

/** A number to at most four decimal places, without trailing zeros. */
function show(v: number) {
  return String(Number(v.toFixed(4)));
}

/** The first n terms, written out: 1 + 0.9 + 0.81 + ... + 0.9^{49}. */
function termsText(r: number, n: number) {
  const rs = show(r);
  const first = [1, r, r * r].slice(0, Math.min(n, 3)).map(show);
  if (n <= 3) return first.join(" + ");
  if (n === 4) return `${first.join(" + ")} + ${rs}^{3}`;
  return `${first.join(" + ")} + … + ${rs}^{${n - 1}}`;
}

function partialSum(r: number, n: number) {
  let s = 0;
  let term = 1;
  for (let k = 0; k < n; k++) {
    s += term;
    term *= r;
  }
  return s;
}

export function PartialSums({
  title,
  description,
  ratio = 0.9,
  terms = 5,
  maxTerms = 100,
  axisMax = 20,
  limitLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** The starting ratio r, between 0.05 and 0.95. */
  ratio?: number;
  terms?: number;
  maxTerms?: number;
  /** The right-hand end of the scale, fixed whatever the ratio. */
  axisMax?: number;
  /** Keeps the marker for where the sum is heading closed until its exercise is done. */
  limitLocked?: boolean;
  lockedNote?: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [r, setR] = useState(Math.round(Math.min(0.95, Math.max(0.05, ratio)) * 100) / 100);
  const [n, setN] = useState(Math.min(maxTerms, Math.max(1, terms)));
  const [limitOn, setLimitOn] = useState(false);
  const showLimit = limitOn && !limitLocked;

  const inner = Math.max(160, width - 2 * MARGIN);
  const xOf = (v: number) => MARGIN + (Math.min(v, axisMax) / axisMax) * inner;
  const barY = 52;
  const barH = 22;
  const axisY = barY + barH + 14;
  // A row below the tick labels is kept for the marker of where the sum is heading.
  const height = axisY + 46;

  const sums: number[] = [0];
  for (let k = 0; k < n; k++) sums.push(sums[k]! + r ** k);
  const total = sums[n]!;
  const limit = 1 / (1 - r);

  const step = inner / axisMax >= 16 ? 2 : inner / axisMax >= 8 ? 4 : 5;
  const ticks: number[] = [];
  for (let v = 0; v <= axisMax + 1e-9; v += step) ticks.push(v);

  const markerX = xOf(total);
  const labelW = 96;
  const labelX = Math.min(Math.max(markerX, MARGIN + labelW / 2), MARGIN + inner - labelW / 2);
  const limitX = xOf(limit);
  const limitLabelX = Math.min(Math.max(limitX, MARGIN + 60), MARGIN + inner - 60);

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
            <line x1={MARGIN} x2={MARGIN + inner} y1={axisY} y2={axisY} className="stroke-fig-axis" strokeWidth={1.5} />
            {ticks.map((v) => (
              <g key={v}>
                <line x1={xOf(v)} x2={xOf(v)} y1={axisY - 4} y2={axisY + 4} className="stroke-fig-axis" />
                <text x={xOf(v)} y={axisY + 18} textAnchor="middle" className="tabular fill-ink-muted text-[12px]">
                  {v}
                </text>
              </g>
            ))}
            <rect x={MARGIN} y={barY} width={inner} height={barH} className="fill-fig-grid" opacity={0.5} />
            {sums.slice(0, n).map((s, k) => (
              <rect
                key={k}
                x={xOf(s)}
                y={barY}
                width={Math.max(0, xOf(sums[k + 1]!) - xOf(s))}
                height={barH}
                className={k % 2 === 0 ? "fill-fig-vector" : "fill-fig-mass"}
              />
            ))}
            {sums.slice(1, Math.min(n, 40)).map((s, k) =>
              xOf(s) - xOf(sums[k]!) > 3 ? (
                <line key={`s${k}`} x1={xOf(s)} x2={xOf(s)} y1={barY} y2={barY + barH} className="stroke-surface" strokeWidth={1} />
              ) : null,
            )}
            <path d={`M${markerX},${barY - 3} l-5,-8 h10 z`} className="fill-ink" />
            <text
              x={labelX}
              y={barY - 16}
              textAnchor="middle"
              paintOrder="stroke"
              strokeWidth={4}
              strokeLinejoin="round"
              className="tabular fill-ink stroke-surface text-[12px] font-semibold"
            >
              sum {show(total)}
            </text>
            {showLimit ? (
              <g>
                <line
                  x1={limitX}
                  x2={limitX}
                  y1={barY - 6}
                  y2={axisY + 4}
                  className="stroke-fig-gradient"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
                <text
                  x={limitLabelX}
                  y={axisY + 38}
                  textAnchor="middle"
                  paintOrder="stroke"
                  strokeWidth={5}
                  strokeLinejoin="round"
                  className="tabular fill-fig-gradient stroke-surface text-[12px] font-semibold"
                >
                  heading for {show(limit)}
                </text>
              </g>
            ) : null}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl label="Ratio, r" sym="r" min={0.05} max={0.95} step={0.05} value={r} onChange={(v) => setR(Math.round(v * 100) / 100)} display={show(r)} />
          <RangeControl label="Terms, n" sym="n" min={1} max={maxTerms} step={1} value={n} onChange={setN} display={String(n)} />
          <p className="text-sm text-ink" aria-live="polite">
            <span className="tabular">
              <FigureLabel text={termsText(r, n)} />
            </span>{" "}
            = <span className="tabular font-semibold">{show(total)}</span>
            {showLimit ? (
              <>
                , which is <span className="tabular">{show(limit - total)}</span> short of {show(limit)}.
              </>
            ) : (
              "."
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setLimitOn((t) => !t)}
              aria-pressed={showLimit}
              disabled={limitLocked && !showLimit}
            >
              {showLimit ? "Hide where the sum is heading" : "Show where the sum is heading"}
            </Button>
            {limitLocked ? (
              <p className="text-sm text-ink-muted">{lockedNote ?? "This opens once you have answered the questions below."}</p>
            ) : null}
          </div>
        </>
      }
      table={{
        caption: `The sum of the first n terms, for r = ${show(r)}.`,
        columns: ["Terms, n", "Sum"],
        rows: SUMS_AT.filter((m) => m <= maxTerms).map((m) => [m, show(partialSum(r, m))]),
      }}
    />
  );
}
