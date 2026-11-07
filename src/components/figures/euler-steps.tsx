"use client";

import { useState } from "react";

import { eulerChain, eulerRows, eulerWords, fromPolar } from "./complex";
import { head, Mark, PlaneGrid, planeView } from "./complex-plane";
import { arcPoints, num, piText, radians } from "./rotation";
import { FigureFrame, RangeControl, useWidth } from "./shell";

/*
 * Euler's formula as many small turns. Starting at 1, the figure multiplies by 1 + iθ/n again and
 * again, n times, and draws each product as a corner of a chain of steps. Each step leaves its
 * corner at right angles to the line from 0, so the chain winds round 0, and as n grows it hugs the
 * circle of radius 1 and ends ever nearer the point at angle θ, cos θ + i sin θ, drawn as a ring.
 */

/**
 * Where to name the end of the chain: beside it, on the side away from the second axis, unless the
 * words would run off the picture, in which case on the other side, or centred under it.
 */
function stepsLabel(text: string, lx: number, ly: number, ox: number, oy: number, size: number) {
  const width = text.length * 7.4;
  const fits = (x: number, anchor: "start" | "end") => (anchor === "start" ? x + width <= size - 4 : x - width >= 4);
  let anchor: "start" | "end" | "middle" = lx >= ox ? "start" : "end";
  let x = anchor === "start" ? lx + 10 : lx - 10;
  if (!fits(x, anchor)) {
    anchor = anchor === "start" ? "end" : "start";
    x = anchor === "start" ? lx + 10 : lx - 10;
  }
  if (!fits(x, anchor)) {
    anchor = "middle";
    x = Math.min(Math.max(lx, width / 2 + 4), size - width / 2 - 4);
  }
  const y = Math.min(Math.max(ly + (ly <= oy ? -10 : 18), 14), size - 6);
  return { text, x, y, anchor };
}

export function EulerSteps({ title, description, angle = 180, steps = 4 }: { title: string; description: string; angle?: number; steps?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [deg, setDeg] = useState(Math.max(-360, Math.min(360, Math.round(angle))));
  const [n, setN] = useState(Math.max(1, Math.min(100, Math.round(steps))));

  const chain = eulerChain(deg, n);
  const target = fromPolar(1, deg);
  const reach = Math.max(1, ...chain.map(([x, y]) => Math.max(Math.abs(x), Math.abs(y))));
  const limit = Math.max(1.5, reach * 1.15);
  const view = planeView(width, limit);
  const { at } = view;
  const [ox, oy] = at([0, 0]);
  const last = chain[n]!;
  const [lx, ly] = at(last);
  const [tx, ty] = at(target);
  const words = eulerWords(deg, n);
  const label = stepsLabel(`after ${num(n, 0)} ${n === 1 ? "step" : "steps"}`, lx, ly, ox, oy, view.size);
  const pi = piText(deg);

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
            width={view.size}
            height={view.size}
            viewBox={`0 0 ${view.size} ${view.size}`}
            className="tabular mx-auto block max-w-full font-sans"
          >
            <PlaneGrid view={view} limit={limit} />
            {/* The turn through θ along the circle itself, which the chain of steps follows. */}
            {deg !== 0 ? <path d={view.path(arcPoints(deg))} className="fill-none stroke-fig-gradient" strokeWidth={4} strokeLinecap="round" strokeOpacity={0.55} /> : null}
            <path d={view.path(chain)} className="fill-none stroke-fig-vector" strokeWidth={2} strokeLinejoin="round" />
            {n <= 40
              ? chain.slice(0, -1).map((p, k) => {
                  const [x, y] = at(p);
                  return <circle key={k} cx={x} cy={y} r={2.75} className="fill-fig-vector" />;
                })
              : null}
            <g className="text-fig-vector">
              <line x1={ox} y1={oy} x2={lx} y2={ly} strokeWidth={1.5} strokeDasharray="5 4" className="stroke-current" />
              <polygon points={head(ox, oy, lx, ly, 9)} className="fill-current" />
            </g>
            <circle cx={tx} cy={ty} r={7} className="fill-none stroke-fig-gradient" strokeWidth={2.5} />
            <circle cx={at([1, 0])[0]} cy={oy} r={4} className="fill-surface stroke-ink" strokeWidth={1.5} />
            <Mark x={at([1, 0])[0] + 6} y={oy - 8}>
              1
            </Mark>
            <Mark x={label.x} y={label.y} anchor={label.anchor} className="fill-fig-vector">
              {label.text}
            </Mark>
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl
            label="Angle θ"
            min={-360}
            max={360}
            step={5}
            value={deg}
            onChange={(v) => setDeg(Math.round(v))}
            display={pi && deg !== 0 ? `${num(deg, 0)}°, ${pi}` : `${num(deg, 0)}°`}
          />
          <RangeControl label="Steps, n" min={1} max={100} step={1} value={n} onChange={(v) => setN(Math.round(v))} display={num(n, 0)} />
          <div className="tabular flex flex-col gap-1 text-sm text-ink" aria-live="polite">
            {words.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
          <p className="text-sm text-ink-muted">
            The chain starts at 1, and each step multiplies by 1 + iθ/n. The thick pale arc is the turn through θ along the dashed
            circle of radius 1, and the ring marks its end, cos θ + i sin θ.
          </p>
        </>
      }
      table={{
        caption: `n factors 1 + iθ/n multiplied together, for θ = ${num(deg, 0)}°, which is ${num(radians(deg))} radians, and ever more steps`,
        columns: ["Steps, n", "(1 + iθ/n)^n", "Length", "Turned through"],
        rows: eulerRows(deg),
      }}
    />
  );
}
