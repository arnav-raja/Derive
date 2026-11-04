"use client";

import { clsx } from "clsx";
import { scaleLinear, scaleLog } from "d3-scale";
import { useId, useMemo, useState } from "react";

import { compileExpr, formatValue } from "./expr";
import { FigureFrame, PredictPanel, RangeControl, useWidth, type PredictPhase } from "./shell";

/*
 * Graphs of y = f(x), computed point by point in the browser from the
 * expressions a lesson gives. Sliders change parameters; the readout gives
 * exact values wherever the learner points.
 */

export type PlotCurve = { expr: string; label: string; sym?: string; tone?: "vector" | "gradient" | "mass" | "point" };
export type PlotParam = { name: string; label?: string; min: number; max: number; step: number; value: number; sym?: string };
export type PlotMark = { x: number; curve?: number; label?: string };

const TONES = {
  vector: "stroke-fig-vector",
  gradient: "stroke-fig-gradient",
  mass: "stroke-fig-mass",
  point: "stroke-fig-point",
} as const;
const DOTS = {
  vector: "fill-fig-vector",
  gradient: "fill-fig-gradient",
  mass: "fill-fig-mass",
  point: "fill-fig-point",
} as const;
const ORDER = ["vector", "gradient", "mass", "point"] as const;
/** Curves differ in dash as well as colour, so colour is never the only cue. */
const DASHES = [undefined, "7 4", "2 3", "10 3 2 3"];

const M = { left: 52, right: 16, top: 14, bottom: 40 };

function safe(f: (s: Record<string, number>) => number, scope: Record<string, number>): number {
  try {
    const v = f(scope);
    return Number.isFinite(v) ? v : Number.NaN;
  } catch {
    return Number.NaN;
  }
}

function tickText(v: number, log: boolean): string {
  if (log) {
    const k = Math.log10(v);
    return Number.isInteger(Math.round(k * 1e6) / 1e6) ? `10^${Math.round(k)}` : "";
  }
  return formatValue(v, 3);
}

export function FunctionPlot({
  title,
  description,
  curves,
  params = [],
  x: xDomain,
  y: yDomain,
  logX = false,
  logY = false,
  xLabel = "x",
  yLabel = "y",
  marks = [],
  predict,
}: {
  title: string;
  description: string;
  curves: PlotCurve[];
  params?: PlotParam[];
  x: [number, number];
  y?: [number, number];
  logX?: boolean;
  logY?: boolean;
  xLabel?: string;
  yLabel?: string;
  marks?: PlotMark[];
  /** Keeps one curve back until the learner has guessed its value at x. */
  predict?: { prompt: string; curve?: number; x: number };
}) {
  const uid = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = Math.round(Math.min(380, Math.max(240, width * 0.6)));
  const [values, setValues] = useState<Record<string, number>>(() => Object.fromEntries(params.map((p) => [p.name, p.value])));
  const [phase, setPhase] = useState<PredictPhase>("asking");
  const fns = useMemo(() => curves.map((c) => compileExpr(c.expr)), [curves]);

  const hidden = predict && phase !== "revealed" ? (predict.curve ?? 0) : -1;
  const plotW = Math.max(100, width - M.left - M.right);
  const plotH = height - M.top - M.bottom;
  const xs = (logX ? scaleLog() : scaleLinear()).domain(xDomain).range([M.left, M.left + plotW]);

  // Sample each curve; the y range comes from the data unless it is given.
  const n = Math.min(800, Math.max(160, Math.round(plotW)));
  const samples = useMemo(() => {
    const pts: number[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push(logX ? 10 ** (Math.log10(xDomain[0]) + t * (Math.log10(xDomain[1]) - Math.log10(xDomain[0]))) : xDomain[0] + t * (xDomain[1] - xDomain[0]));
    }
    return curves.map((_, ci) => pts.map((x) => [x, safe(fns[ci]!, { ...values, x })] as const));
  }, [curves, fns, values, n, logX, xDomain]);

  const autoY = useMemo((): [number, number] => {
    const ys = samples.flat().map(([, y]) => y).filter((y) => Number.isFinite(y) && (!logY || y > 0));
    if (!ys.length) return logY ? [1, 10] : [-1, 1];
    let lo = Math.min(...ys);
    let hi = Math.max(...ys);
    if (lo === hi) {
      lo -= 1;
      hi += 1;
    }
    return [lo, hi];
  }, [samples, logY]);
  const range: [number, number] = [M.top + plotH, M.top];
  const ys = logY
    ? scaleLog().domain(yDomain ?? autoY).range(range)
    : yDomain
      ? scaleLinear().domain(yDomain).range(range)
      : scaleLinear().domain(autoY).nice().range(range);
  const yd = ys.domain() as [number, number];

  const paths = samples.map((pts) => {
    let d = "";
    let pen = false;
    let prevY: number | null = null;
    for (const [x, y] of pts) {
      if (!Number.isFinite(y) || (logY && y <= 0)) {
        pen = false;
        prevY = null;
        continue;
      }
      const py = ys(y);
      const px = xs(x);
      // A jump across most of the plot is a discontinuity, not a steep line.
      if (prevY !== null && Math.abs(py - prevY) > plotH * 3) pen = false;
      const clamped = Math.max(M.top - plotH, Math.min(M.top + 2 * plotH, py));
      d += `${pen ? "L" : "M"}${px.toFixed(1)},${clamped.toFixed(1)}`;
      pen = true;
      prevY = py;
    }
    return d;
  });

  const [readX, setReadX] = useState<number>(() => (predict ? predict.x : logX ? Math.sqrt(xDomain[0] * xDomain[1]) : (xDomain[0] + xDomain[1]) / 2));
  const readT = logX ? (Math.log10(readX) - Math.log10(xDomain[0])) / (Math.log10(xDomain[1]) - Math.log10(xDomain[0])) : (readX - xDomain[0]) / (xDomain[1] - xDomain[0]);
  const fromT = (t: number) => (logX ? 10 ** (Math.log10(xDomain[0]) + t * (Math.log10(xDomain[1]) - Math.log10(xDomain[0]))) : xDomain[0] + t * (xDomain[1] - xDomain[0]));
  const readings = curves.map((c, i) => ({ c, i, y: safe(fns[i]!, { ...values, x: readX }) }));

  const [guess, setGuess] = useState(0.5);
  const guessY = logY ? 10 ** (Math.log10(yd[0]) + guess * (Math.log10(yd[1]) - Math.log10(yd[0]))) : yd[0] + guess * (yd[1] - yd[0]);
  const truth = predict ? safe(fns[predict.curve ?? 0]!, { ...values, x: predict.x }) : Number.NaN;

  const xTicks = xs.ticks(Math.max(2, Math.floor(plotW / 80)));
  const yTicks = ys.ticks(Math.max(2, Math.floor(plotH / 50)));
  const clip = `${uid}-clip`.replace(/[^a-zA-Z0-9_-]/g, "");

  const tableXs = Array.from({ length: 11 }, (_, i) => fromT(i / 10));

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
                label={`Your guess at ${xLabel} = ${formatValue(predict.x)}`}
                min={0}
                max={1}
                step={0.005}
                value={guess}
                onChange={(v) => phase === "asking" && setGuess(v)}
                display={formatValue(guessY, 3)}
              />
            }
            verdict={
              <p>
                At {xLabel} = {formatValue(predict.x)}, {curves[predict.curve ?? 0]?.label} is{" "}
                <span className="tabular font-semibold">{formatValue(truth)}</span>. You guessed {formatValue(guessY, 3)}
                {Number.isFinite(truth) && truth !== 0
                  ? `, which is ${formatValue(Math.abs(guessY - truth) / Math.abs(truth) * 100, 2)}% away.`
                  : "."}
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
            className="block max-w-full touch-none font-sans"
            onPointerMove={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              const t = (e.clientX - box.left - M.left) / plotW;
              if (t >= 0 && t <= 1) setReadX(fromT(t));
            }}
          >
            <defs>
              <clipPath id={clip}>
                <rect x={M.left} y={M.top} width={plotW} height={plotH} />
              </clipPath>
            </defs>
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={M.left} x2={M.left + plotW} y1={ys(t)} y2={ys(t)} className="stroke-fig-grid" />
                <text x={M.left - 6} y={ys(t)} dy="0.32em" textAnchor="end" className="fill-ink-muted text-[11px]">
                  {tickText(t, logY)}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line x1={xs(t)} x2={xs(t)} y1={M.top} y2={M.top + plotH} className="stroke-fig-grid" />
                <text x={xs(t)} y={M.top + plotH + 16} textAnchor="middle" className="fill-ink-muted text-[11px]">
                  {tickText(t, logX)}
                </text>
              </g>
            ))}
            {!logY && yd[0] < 0 && yd[1] > 0 ? (
              <line x1={M.left} x2={M.left + plotW} y1={ys(0)} y2={ys(0)} className="stroke-fig-axis" />
            ) : null}
            {!logX && xDomain[0] < 0 && xDomain[1] > 0 ? (
              <line x1={xs(0)} x2={xs(0)} y1={M.top} y2={M.top + plotH} className="stroke-fig-axis" />
            ) : null}
            <rect x={M.left} y={M.top} width={plotW} height={plotH} className="fill-none stroke-fig-axis" />
            <text x={M.left + plotW / 2} y={height - 6} textAnchor="middle" className="fill-ink text-[12px]">
              {xLabel}
            </text>
            <text x={12} y={M.top + plotH / 2} textAnchor="middle" transform={`rotate(-90 12 ${M.top + plotH / 2})`} className="fill-ink text-[12px]">
              {yLabel}
            </text>
            <g clipPath={`url(#${clip})`}>
              {paths.map((d, i) =>
                i === hidden ? null : (
                  <path
                    key={i}
                    d={d}
                    data-sym={curves[i]!.sym}
                    className={clsx("fill-none", TONES[curves[i]!.tone ?? ORDER[i % ORDER.length]!])}
                    strokeWidth={2.25}
                    strokeDasharray={DASHES[i % DASHES.length]}
                  />
                ),
              )}
              <line x1={xs(readX)} x2={xs(readX)} y1={M.top} y2={M.top + plotH} className="stroke-fig-point" strokeDasharray="3 3" />
              {readings.map(({ c, i, y }) =>
                i === hidden || !Number.isFinite(y) || (logY && y <= 0) ? null : (
                  <circle key={i} cx={xs(readX)} cy={ys(y)} r={4} className={DOTS[c.tone ?? ORDER[i % ORDER.length]!]} />
                ),
              )}
              {marks.map((m, k) => {
                const ci = m.curve ?? 0;
                if (ci === hidden) return null;
                const y = safe(fns[ci]!, { ...values, x: m.x });
                if (!Number.isFinite(y)) return null;
                return (
                  <g key={k}>
                    <circle cx={xs(m.x)} cy={ys(y)} r={4.5} className="fill-surface stroke-ink" strokeWidth={1.5} />
                    {m.label ? (
                      <text x={xs(m.x) + 8} y={ys(y) - 8} className="fill-ink text-[12px]">
                        {m.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
              {predict && phase !== "revealed" ? (
                <g>
                  <line x1={xs(predict.x)} x2={xs(predict.x)} y1={M.top} y2={M.top + plotH} className="stroke-fig-gradient" strokeDasharray="2 4" />
                  <circle cx={xs(predict.x)} cy={ys(guessY)} r={6} className="fill-fig-gradient" />
                </g>
              ) : predict ? (
                <circle cx={xs(predict.x)} cy={ys(guessY)} r={6} className="fill-none stroke-fig-gradient" strokeWidth={2} />
              ) : null}
            </g>
          </svg>
        </div>
      )}
      controls={
        <>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Curves">
            {curves.map((c, i) => (
              <li key={i} className="flex items-center gap-2" data-sym={c.sym}>
                <svg width="20" height="8" aria-hidden="true">
                  <line x1="0" x2="20" y1="4" y2="4" className={TONES[c.tone ?? ORDER[i % ORDER.length]!]} strokeWidth={2.5} strokeDasharray={DASHES[i % DASHES.length]} />
                </svg>
                <span className="text-ink">{i === hidden ? `${c.label} (hidden until you predict)` : c.label}</span>
              </li>
            ))}
          </ul>
          {params.map((p) => (
            <RangeControl
              key={p.name}
              label={p.label ?? p.name}
              sym={p.sym}
              min={p.min}
              max={p.max}
              step={p.step}
              value={values[p.name] ?? p.value}
              onChange={(v) => setValues((s) => ({ ...s, [p.name]: v }))}
              display={formatValue(values[p.name] ?? p.value, 3)}
            />
          ))}
          <RangeControl
            label={`Read the graph at ${xLabel}`}
            min={0}
            max={1}
            step={0.001}
            value={readT}
            onChange={(t) => setReadX(fromT(t))}
            display={formatValue(readX, 3)}
          />
          <p className="text-sm text-ink" aria-live="polite">
            At {xLabel} = <span className="tabular">{formatValue(readX, 4)}</span>:{" "}
            {readings
              .filter(({ i }) => i !== hidden)
              .map(({ c, y }) => `${c.label} = ${formatValue(y, 4)}`)
              .join("; ")}
            .
          </p>
        </>
      }
      table={{
        columns: [xLabel, ...curves.map((c, i) => (i === hidden ? `${c.label} (after you predict)` : c.label))],
        rows: tableXs.map((x) => [formatValue(x, 4), ...curves.map((_, i) => (i === hidden ? "" : formatValue(safe(fns[i]!, { ...values, x }), 4)))]),
      }}
    />
  );
}
