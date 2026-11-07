"use client";

import { useState, type ReactNode } from "react";

import { angleOf, complexText, degText, fromPolar, length, mul, powers, powersWords, productWords, raised, type Complex } from "./complex";
import { num, radians, type Point } from "./rotation";
import { Button } from "@/components/ui/button";

import { FigureFrame, FigureLabel, RangeControl, useWidth } from "./shell";

/*
 * The plane of complex numbers: a + bi is the point (a, b), real numbers lie along the first axis
 * and multiples of i along the second. In its product mode the figure multiplies two numbers, each
 * set by its length and angle, and draws the product with the two angles laid end to end. In its
 * powers mode it draws 1, z, z², … up to a power the learner chooses.
 */

const PAD = 24;

/** z to the power k as a label: 1, z, z², z³, …, z²⁴. */
export function powerLabel(k: number): string {
  if (k === 0) return "1";
  if (k === 1) return "z";
  return `z${raised(k)}`;
}

/** A gap between grid lines of 1, 2 or 5 times a power of ten, with at most five of them on each side of 0. */
export function tickStep(limit: number): number {
  const raw = Math.max(limit / 5, 0.5);
  const power = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5]) if (m * power >= raw) return m * power;
  return 10 * power;
}

/** The three corners of an arrowhead at the end of the line from (x1, y1) to (x2, y2), in screen units. */
export function head(x1: number, y1: number, x2: number, y2: number, size = 9): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * size;
  const by = y2 - uy * size;
  const w = size * 0.5;
  return `${x2},${y2} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`;
}

export type PlaneView = { size: number; at: (p: Point) => Point; scale: number; path: (pts: readonly Point[]) => string };

/** A square view of the plane from -limit to limit each way, at most 440 pixels across. */
export function planeView(width: number, limit: number): PlaneView {
  const size = Math.max(220, Math.min(width, 440));
  const scale = (size - 2 * PAD) / (2 * limit);
  const at = ([x, y]: Point): Point => [size / 2 + x * scale, size / 2 - y * scale];
  const path = (pts: readonly Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${at(p)[0].toFixed(2)},${at(p)[1].toFixed(2)}`).join("");
  return { size, at, scale, path };
}

/** The grid, the two axes with their numbers, and the circle of radius 1 about 0. */
export function PlaneGrid({ view, limit }: { view: PlaneView; limit: number }) {
  const { at, scale } = view;
  const step = tickStep(limit);
  const count = Math.floor(limit / step);
  const ticks = Array.from({ length: 2 * count + 1 }, (_, i) => (i - count) * step).filter((v) => v !== 0);
  const [ox, oy] = at([0, 0]);
  const edge = limit;
  return (
    <g>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={at([v, -edge])[0]} x2={at([v, edge])[0]} y1={at([v, -edge])[1]} y2={at([v, edge])[1]} className="stroke-fig-grid" />
          <line x1={at([-edge, v])[0]} x2={at([edge, v])[0]} y1={at([-edge, v])[1]} y2={at([edge, v])[1]} className="stroke-fig-grid" />
        </g>
      ))}
      <line x1={at([-edge, 0])[0]} x2={at([edge, 0])[0]} y1={oy} y2={oy} className="stroke-fig-axis" />
      <line x1={ox} x2={ox} y1={at([0, -edge])[1]} y2={at([0, edge])[1]} className="stroke-fig-axis" />
      {ticks.map((v) => (
        <g key={`t${v}`} fontSize={11} className="fill-ink-muted">
          <text x={at([v, 0])[0]} y={oy + 14} textAnchor="middle">
            {num(v)}
          </text>
          <text x={ox - 6} y={at([0, v])[1]} dy="0.32em" textAnchor="end">
            {complexText([0, v])}
          </text>
        </g>
      ))}
      <circle cx={ox} cy={oy} r={scale} className="fill-none stroke-ink-muted" strokeWidth={1} strokeDasharray="4 4" />
    </g>
  );
}

/** A label drawn over the picture, with a halo in the page colour so that lines behind it do not cut it. */
export function Mark({ x, y, children, anchor = "start", className = "fill-ink" }: { x: number; y: number; children: ReactNode; anchor?: "start" | "middle" | "end"; className?: string }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={13} fontWeight={600} paintOrder="stroke" strokeWidth={4} strokeLinejoin="round" className={`${className} stroke-surface`}>
      {children}
    </text>
  );
}

/** Points along the arc of radius r from angle `from` to angle `to`, in degrees, at most a degree apart. */
function arc(from: number, to: number, r: number): Point[] {
  const steps = Math.max(1, Math.ceil(Math.abs(to - from)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = radians(from + ((to - from) * i) / steps);
    return [r * Math.cos(t), r * Math.sin(t)] as const;
  });
}

/** Where a label for the tip of an arrow from 0 to p goes: a little beyond the tip, out from 0. */
function beyond(view: PlaneView, p: Complex, gap = 14): Point {
  const [x, y] = view.at(p);
  const [ox, oy] = view.at([0, 0]);
  const d = Math.hypot(x - ox, y - oy) || 1;
  return [x + ((x - ox) / d) * gap, y + ((y - oy) / d) * gap + 4];
}

type Mode = "product" | "powers";

export function ComplexPlane({
  title,
  description,
  mode = "product",
  z: zStart = [1.5, 45],
  w: wStart = [2, 30],
  count: countStart = 8,
}: {
  title: string;
  description: string;
  mode?: Mode;
  /** z as its length and its angle in degrees. */
  z?: [number, number];
  /** w as its length and its angle in degrees, for the product mode. */
  w?: [number, number];
  /** The highest power drawn, for the powers mode. */
  count?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [zr, setZr] = useState(zStart[0]);
  const [zd, setZd] = useState(Math.round(zStart[1]));
  const [wr, setWr] = useState(wStart[0]);
  const [wd, setWd] = useState(Math.round(wStart[1]));
  const firstCount = Math.max(1, Math.min(24, Math.round(countStart)));
  const [count, setCount] = useState(firstCount);
  const atStart = zr === zStart[0] && zd === Math.round(zStart[1]) && wr === wStart[0] && wd === Math.round(wStart[1]) && count === firstCount;
  const startAgain = () => {
    setZr(zStart[0]);
    setZd(Math.round(zStart[1]));
    setWr(wStart[0]);
    setWd(Math.round(wStart[1]));
    setCount(firstCount);
  };

  const z = fromPolar(zr, zd);
  const w = fromPolar(wr, wd);
  const product = mul(z, w);
  const all = mode === "powers" ? powers(z, count) : [];

  const reach = mode === "product" ? Math.max(length(z), length(w), length(product)) : Math.max(...all.map(length));
  const limit = Math.max(1.5, reach * 1.15);
  const view = planeView(width, limit);
  const { at } = view;
  const [ox, oy] = at([0, 0]);

  const arrow = (to: Complex, className: string, key: string, thick = false) => {
    const [tx, ty] = at(to);
    if (Math.hypot(tx - ox, ty - oy) < 2) return null;
    return (
      <g key={key} className={className}>
        <line x1={ox} y1={oy} x2={tx} y2={ty} strokeWidth={thick ? 3 : 2.25} className="stroke-current" />
        <polygon points={head(ox, oy, tx, ty, thick ? 11 : 9)} className="fill-current" />
      </g>
    );
  };

  const words = mode === "product" ? productWords(zr, zd, wr, wd) : powersWords(zr, zd, count);
  // z's angle is drawn from the first axis, and w's onward from the end of z's, just outside it, so
  // that neither arc hides the other when w's angle is negative.
  const arcR = Math.min(0.6, limit / 4);

  const picture = ({ titleId, descId }: { titleId: string; descId: string }) => (
    <div ref={ref} className="w-full">
      <svg
        role="img"
        aria-labelledby={titleId}
        aria-describedby={descId}
        width={view.size}
        height={view.size}
        viewBox={`0 0 ${view.size} ${view.size}`}
        className="tabular mx-auto block max-w-full font-sans"
      >
        <PlaneGrid view={view} limit={limit} />
        {mode === "product" ? (
          <>
            {zd !== 0 ? <path d={view.path(arc(0, zd, arcR))} className="fill-none stroke-fig-vector" strokeWidth={4} strokeLinecap="round" /> : null}
            {wd !== 0 ? <path d={view.path(arc(zd, zd + wd, arcR * 1.35))} className="fill-none stroke-fig-point" strokeWidth={4} strokeLinecap="round" /> : null}
            {arrow(z, "text-fig-vector", "z")}
            {arrow(w, "text-fig-point", "w")}
            {arrow(product, "text-fig-gradient", "zw", true)}
            {(
              [
                [z, "z", "fill-fig-vector"],
                [w, "w", "fill-fig-point"],
                [product, "zw", "fill-fig-gradient"],
              ] as const
            ).map(([p, label, cls]) => {
              const [lx, ly] = beyond(view, p);
              return (
                <Mark key={label} x={lx} y={ly} anchor="middle" className={cls}>
                  {label}
                </Mark>
              );
            })}
          </>
        ) : (
          <>
            <path d={view.path(all)} className="fill-none stroke-fig-vector" strokeWidth={1.5} strokeOpacity={0.6} />
            {arrow(z, "text-fig-vector", "z")}
            {count > 1 ? arrow(all[count]!, "text-fig-gradient", "last", true) : null}
            {all.map((p, k) => {
              const [x, y] = at(p);
              return <circle key={k} cx={x} cy={y} r={k === count ? 5.5 : 3.5} className={k === count ? "fill-fig-gradient" : "fill-ink"} />;
            })}
            {all.map((p, k) => {
              // Every point is named while there are few; with many, the first four and the last.
              if (count > 8 && k > 3 && k !== count) return null;
              if (k === 1 && count > 1) {
                const [lx, ly] = beyond(view, p);
                return (
                  <Mark key={k} x={lx} y={ly} anchor="middle" className="fill-fig-vector">
                    {powerLabel(k)}
                  </Mark>
                );
              }
              // A point on the second axis is named to its right, clear of the axis's own numbers.
              const onAxis = Math.abs(p[0]) <= limit * 0.04 && Math.abs(p[1]) > limit * 0.04;
              const [px, py] = at(p);
              const [lx, ly] = onAxis ? [px + 9, py + 4] : beyond(view, p, 16);
              return (
                <Mark key={k} x={lx} y={ly} anchor={onAxis ? "start" : "middle"} className={k === count ? "fill-fig-gradient" : "fill-ink"}>
                  {powerLabel(k)}
                </Mark>
              );
            })}
          </>
        )}
      </svg>
    </div>
  );

  const zControls = (
    <>
      <RangeControl label="Length of z" min={mode === "product" ? 0.5 : 0.8} max={mode === "product" ? 2 : 1.5} step={mode === "product" ? 0.05 : 0.01} value={zr} onChange={setZr} display={num(zr, 3)} />
      <RangeControl label="Angle of z" min={-180} max={180} step={1} value={zd} onChange={(v) => setZd(Math.round(v))} display={degText(zd, 0)} />
    </>
  );

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={picture}
      controls={
        <>
          {zControls}
          {mode === "product" ? (
            <>
              <RangeControl label="Length of w" min={0.5} max={2} step={0.05} value={wr} onChange={setWr} display={num(wr, 3)} />
              <RangeControl label="Angle of w" min={-180} max={180} step={1} value={wd} onChange={(v) => setWd(Math.round(v))} display={degText(wd, 0)} />
            </>
          ) : (
            <RangeControl label="Highest power" min={1} max={24} step={1} value={count} onChange={(v) => setCount(Math.round(v))} display={powerLabel(count)} />
          )}
          <div>
            <Button size="sm" variant="ghost" onClick={startAgain} disabled={atStart}>
              Start again
            </Button>
          </div>
          <div className="tabular flex flex-col gap-1 text-sm text-ink" aria-live="polite">
            {words.map((s, i) => (
              <p key={i}>
                <FigureLabel text={s} />
              </p>
            ))}
          </div>
          <p className="text-sm text-ink-muted">
            <FigureLabel
              text={
                mode === "product"
                  ? "Two thick arcs at the centre show the angle of z and, just outside it, the angle of w, laid on from the end of the first. The dashed circle has radius 1."
                  : "The points are 1, z, z^2, and so on, each joined to the next. The dashed circle has radius 1."
              }
            />
          </p>
        </>
      }
      table={
        mode === "product"
          ? {
              columns: ["Number", "a + bi", "Length", "Angle"],
              rows: (
                [
                  ["z", z],
                  ["w", w],
                  ["zw", product],
                ] as const
              ).map(([name, p]) => [name, complexText(p), num(length(p), 4), degText(angleOf(p))]),
            }
          : {
              columns: ["Power", "a + bi", "Length", "Angle"],
              rows: all.map((p, k) => [k === 0 ? "z⁰ = 1" : powerLabel(k), complexText(p), num(length(p), 4), degText(angleOf(p))]),
            }
      }
    />
  );
}
