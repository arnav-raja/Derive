"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { formatValue } from "./expr";
import { FigureFrame, PredictPanel, RangeControl, useWidth, type PredictPhase } from "./shell";

/*
 * A logarithmic number line: each step to the right multiplies by ten, so a
 * second and the age of the universe fit on one line. Positions are computed
 * from the values given; nothing is placed by hand.
 */

export type ScaleItem = { label: string; value: number; sym?: string; note?: string };

type Placed = ScaleItem & { x: number; row: number; labelX: number; hidden?: boolean; guess?: boolean };

const ROW_HEIGHT = 18;
const MARGIN = 28;

function exponentLabel(k: number) {
  return (
    <>
      10
      <tspan dy="-0.55em" fontSize="0.72em">
        {k}
      </tspan>
    </>
  );
}

/**
 * Puts labels in rows above and below the line so none overlap, and keeps
 * each label inside the figure: a label near an edge slides inwards.
 */
function placeLabels(items: (ScaleItem & { x: number; hidden?: boolean; guess?: boolean })[], width: number): Placed[] {
  const sorted = [...items].sort((a, b) => a.x - b.x);
  const rowsEnd: number[] = [];
  return sorted.map((it) => {
    const w = Math.min(220, it.label.length * 6.6 + 8);
    const labelX = Math.min(Math.max(it.x, w / 2 + 2), width - w / 2 - 2);
    const left = labelX - w / 2;
    let row = 0;
    // Rows alternate above (even) and below (odd) the line.
    while (rowsEnd[row] !== undefined && rowsEnd[row]! > left) row++;
    rowsEnd[row] = labelX + w / 2;
    return { ...it, row, labelX };
  });
}

export function ScaleLine({
  title,
  description,
  items,
  unit,
  min,
  max,
  predict,
  span,
}: {
  title: string;
  description: string;
  items: ScaleItem[];
  unit?: string;
  /** The lowest and highest powers of ten shown; by default, from the items. */
  min?: number;
  max?: number;
  /** A value kept back until the learner has placed a guess. */
  predict?: { prompt: string; label: string; value: number; sym?: string };
  /** Two labels to bracket, with the factor between them. */
  span?: { from: string; to: string };
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const values = [...items.map((i) => i.value), ...(predict ? [predict.value] : [])].filter((v) => v > 0);
  const lo = min ?? Math.floor(Math.log10(Math.min(...values)));
  const hi = max ?? Math.ceil(Math.log10(Math.max(...values)));
  const [selected, setSelected] = useState<string | null>(null);
  const [linear, setLinear] = useState(false);
  const [phase, setPhase] = useState<PredictPhase>("asking");
  const [guess, setGuess] = useState(Math.round(((lo + hi) / 2) * 10) / 10);

  const inner = Math.max(120, width - 2 * MARGIN);
  const maxValue = Math.max(...values);
  const xOf = (v: number) =>
    linear ? MARGIN + (v / maxValue) * inner : MARGIN + ((Math.log10(v) - lo) / (hi - lo)) * inner;

  const revealed = !predict || phase === "revealed";
  const all = useMemo(() => {
    const list: (ScaleItem & { x: number; hidden?: boolean; guess?: boolean })[] = items.map((i) => ({ ...i, x: 0 }));
    if (predict && revealed) list.push({ label: predict.label, value: predict.value, sym: predict.sym, x: 0 });
    if (predict && !linear) list.push({ label: "Your guess", value: 10 ** guess, x: 0, guess: true });
    return list;
  }, [items, predict, revealed, guess, linear]);
  const placed = placeLabels(all.map((i) => ({ ...i, x: xOf(i.value) })), inner + 2 * MARGIN);
  const rows = Math.max(1, ...placed.map((p) => p.row + 1));
  const above = Math.ceil(rows / 2);
  const below = Math.floor(rows / 2);
  const axisY = 34 + above * ROW_HEIGHT;
  const height = axisY + 40 + below * ROW_HEIGHT;

  const span_ = span ? [items.find((i) => i.label === span.from), items.find((i) => i.label === span.to)] : null;
  const ticks: number[] = [];
  for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) ticks.push(k);
  const every = Math.max(1, Math.ceil(ticks.length / Math.max(2, Math.floor(inner / 44))));

  const crowded = linear ? items.filter((i) => i.value / maxValue < 0.01).length : 0;
  const sel = selected ? all.find((i) => i.label === selected && !i.guess) : null;

  const factor = predict ? 10 ** Math.abs(guess - Math.log10(predict.value)) : 1;

  return (
    <FigureFrame
      title={title}
      description={description}
      predict={
        predict ? (
          <PredictPanel
            prompt={predict.prompt}
            phase={phase}
            canLock
            onLock={() => setPhase("locked")}
            onReveal={() => setPhase("revealed")}
            onReset={() => setPhase("asking")}
            input={
              <RangeControl
                label="Your guess"
                min={lo}
                max={hi}
                step={0.1}
                value={guess}
                onChange={(v) => phase === "asking" && setGuess(v)}
                display={`${formatValue(10 ** guess, 2)}${unit ? ` ${unit}` : ""}`}
              />
            }
            verdict={
              <p>
                {predict.label} is {formatValue(predict.value)}
                {unit ? ` ${unit}` : ""}. Your guess was {formatValue(10 ** guess, 2)}, off by a factor of{" "}
                <span className="tabular font-semibold">{formatValue(factor, 2)}</span>
                {factor <= 3
                  ? ": within a factor of 3, which is a good estimate."
                  : factor <= 10
                    ? ": within one power of ten."
                    : `: about ${Math.round(Math.log10(factor))} powers of ten away. Where did the reasoning slip?`}
              </p>
            }
          />
        ) : null
      }
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
            {!linear
              ? ticks.map((k, i) => (
                  <g key={k}>
                    <line x1={xOf(10 ** k)} x2={xOf(10 ** k)} y1={axisY - 5} y2={axisY + 5} className="stroke-fig-axis" />
                    {i % every === 0 ? (
                      <text x={xOf(10 ** k)} y={axisY + 22} textAnchor="middle" className="fill-ink-muted text-[12px]">
                        {exponentLabel(k)}
                      </text>
                    ) : null}
                  </g>
                ))
              : [0, 0.25, 0.5, 0.75, 1].map((f) => (
                  <g key={f}>
                    <line x1={MARGIN + f * inner} x2={MARGIN + f * inner} y1={axisY - 5} y2={axisY + 5} className="stroke-fig-axis" />
                    <text x={MARGIN + f * inner} y={axisY + 22} textAnchor="middle" className="fill-ink-muted text-[12px]">
                      {f === 0 ? "0" : formatValue(f * maxValue, 2)}
                    </text>
                  </g>
                ))}
            {span_ && span_[0] && span_[1] && !linear ? (
              <g>
                <path
                  d={`M${xOf(span_[0].value)},${axisY - 10} v-6 H${xOf(span_[1].value)} v6`}
                  className="fill-none stroke-fig-gradient"
                  strokeWidth={1.5}
                />
                <text x={(xOf(span_[0].value) + xOf(span_[1].value)) / 2} y={axisY - 20} textAnchor="middle" className="fill-ink text-[12px] font-semibold">
                  × {formatValue(span_[1].value / span_[0].value, 2)}
                </text>
              </g>
            ) : null}
            {placed.map((p) => {
              const up = p.row % 2 === 0;
              const level = Math.floor(p.row / 2);
              const ly = up ? axisY - 28 - level * ROW_HEIGHT : axisY + 40 + level * ROW_HEIGHT;
              const active = selected === p.label && !p.guess;
              return (
                <g
                  key={`${p.label}-${p.guess ? "g" : "v"}`}
                  data-sym={p.sym}
                  onPointerEnter={() => !p.guess && setSelected(p.label)}
                  onPointerLeave={() => setSelected(null)}
                >
                  <line x1={p.x} x2={p.x} y1={axisY} y2={up ? ly + 4 : ly - 12} className="stroke-fig-grid" />
                  {p.guess ? (
                    <path d={`M${p.x},${axisY - 7} l6,-10 h-12 z`} className="fill-fig-gradient" />
                  ) : (
                    <circle cx={p.x} cy={axisY} r={active ? 6 : 4.5} className={clsx(active ? "fill-accent" : "fill-fig-vector", "stroke-surface")} strokeWidth={1.5} />
                  )}
                  <text
                    x={p.labelX}
                    y={ly}
                    textAnchor="middle"
                    className={clsx("text-[12px]", active ? "fill-accent font-semibold" : p.guess ? "fill-fig-gradient font-semibold" : "fill-ink")}
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      controls={
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Points on the line">
            {items.map((i) => (
              <button
                key={i.label}
                type="button"
                data-sym={i.sym}
                aria-pressed={selected === i.label}
                onClick={() => setSelected(selected === i.label ? null : i.label)}
                onFocus={() => setSelected(i.label)}
                className={clsx(
                  "rounded-full border px-2.5 py-0.5 text-xs",
                  selected === i.label ? "border-accent bg-accent-soft text-accent-strong" : "border-rule text-ink-muted hover:border-rule-strong",
                )}
              >
                {i.label}
              </button>
            ))}
          </div>
          <p className="min-h-5 text-sm text-ink" aria-live="polite">
            {sel ? (
              <>
                <span className="font-semibold">{sel.label}:</span> {formatValue(sel.value)}
                {unit ? ` ${unit}` : ""}, which is 10 to the power {Math.log10(sel.value).toFixed(2)}.
                {sel.note ? ` ${sel.note}` : ""}
              </>
            ) : (
              <span className="text-ink-muted">Point at a dot, or choose a label, to read its value.</span>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm" variant="secondary" onClick={() => setLinear((l) => !l)} aria-pressed={linear}>
              {linear ? "Back to powers of ten" : "See it on an ordinary scale"}
            </Button>
            {linear ? (
              <p className="text-sm text-ink-muted">
                On an ordinary scale, {crowded} of the {items.length} points sit within 1% of zero.
              </p>
            ) : null}
          </div>
        </>
      }
      table={{
        columns: ["Item", `Value${unit ? ` (${unit})` : ""}`, "Power of ten"],
        rows: [...items, ...(predict && revealed ? [{ label: predict.label, value: predict.value }] : [])].map((i) => [
          i.label,
          formatValue(i.value),
          Math.log10(i.value).toFixed(2),
        ]),
      }}
    />
  );
}
