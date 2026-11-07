"use client";

import { useState } from "react";

import { num, pathPoints, pointText, turn, turnWords, type Point } from "./rotation";
import { FigureFrame, RangeControl, useWidth } from "./shell";

/*
 * The plane as a grid of vectors, drawn with one unit across as long as one unit up. Here it turns:
 * a slider turns the whole plane about the origin, and a second, when the lesson asks for it, turns
 * it again. The plane before the turn stays in faint dashes; the arrows from the origin to (1, 0)
 * and (0, 1), and any marked points and flag, are drawn where the turns take them, and each marked
 * point's path round its circle is drawn in the warm colour of an update.
 */

const PAD = 24;
/** A flag that shows which way round the plane is: a pole and a pennant, all within 3.5 of the origin. */
const POLE: Point[] = [
  [1, 1],
  [1, 3],
];
const PENNANT: Point[] = [
  [1, 3],
  [2.2, 2.6],
  [1, 2.2],
];

export type PlaneMark = { x: number; y: number; label: string };

/** The three corners of an arrowhead at the end of the line from (x1, y1) to (x2, y2), in screen units. */
function head(x1: number, y1: number, x2: number, y2: number, size = 9): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const bx = x2 - ux * size;
  const by = y2 - uy * size;
  const w = size * 0.5;
  return `${x2},${y2} ${bx - uy * w},${by + ux * w} ${bx + uy * w},${by - ux * w}`;
}

export function VectorPlane({
  title,
  description,
  x: xDomain,
  y: yDomain,
  turn: firstStart = 30,
  then: secondStart,
  marks = [],
  flag = false,
}: {
  title: string;
  description: string;
  x: [number, number];
  y: [number, number];
  /** The first turn, in degrees, anticlockwise. */
  turn?: number;
  /** A second turn after the first, in degrees; leave it out for one slider only. */
  then?: number;
  marks?: PlaneMark[];
  flag?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [first, setFirst] = useState(Math.round(firstStart));
  const [second, setSecond] = useState(secondStart === undefined ? undefined : Math.round(secondStart));
  const total = first + (second ?? 0);

  const spanX = xDomain[1] - xDomain[0];
  const spanY = yDomain[1] - yDomain[0];
  const plotW = Math.max(180, Math.min(width, 440)) - 2 * PAD;
  const scale = Math.min(plotW / spanX, (420 - 2 * PAD) / spanY);
  const w = spanX * scale + 2 * PAD;
  const h = spanY * scale + 2 * PAD;
  const at = ([x, y]: Point): Point => [PAD + (x - xDomain[0]) * scale, PAD + (yDomain[1] - y) * scale];
  const line = (pts: readonly Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${at(p)[0].toFixed(2)},${at(p)[1].toFixed(2)}`).join("");

  const xs = Array.from({ length: Math.floor(xDomain[1]) - Math.ceil(xDomain[0]) + 1 }, (_, i) => Math.ceil(xDomain[0]) + i);
  const ys = Array.from({ length: Math.floor(yDomain[1]) - Math.ceil(yDomain[0]) + 1 }, (_, i) => Math.ceil(yDomain[0]) + i);
  const [ox, oy] = at([0, 0]);
  const axes: { at: Point; label: string }[] = [
    { at: [1, 0], label: "(1, 0)" },
    { at: [0, 1], label: "(0, 1)" },
  ];
  const named = [...axes, ...marks.map((m) => ({ at: [m.x, m.y] as Point, label: m.label }))];
  const words = turnWords(named, first, second);

  const arrow = (to: Point, className: string, dashed: boolean, key: string) => {
    const [tx, ty] = at(to);
    return (
      <g key={key} className={className}>
        <line x1={ox} y1={oy} x2={tx} y2={ty} strokeWidth={dashed ? 1.5 : 2.5} strokeDasharray={dashed ? "5 4" : undefined} className="stroke-current" />
        <polygon points={head(ox, oy, tx, ty, dashed ? 7 : 10)} className="fill-current" />
      </g>
    );
  };

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
            width={w}
            height={h}
            viewBox={`0 0 ${w} ${h}`}
            className="tabular mx-auto block max-w-full font-sans"
          >
            {xs.map((v) => (
              <line key={`x${v}`} x1={at([v, 0])[0]} x2={at([v, 0])[0]} y1={at([0, yDomain[0]])[1]} y2={at([0, yDomain[1]])[1]} className={v === 0 ? "stroke-fig-axis" : "stroke-fig-grid"} />
            ))}
            {ys.map((v) => (
              <line key={`y${v}`} y1={at([0, v])[1]} y2={at([0, v])[1]} x1={at([xDomain[0], 0])[0]} x2={at([xDomain[1], 0])[0]} className={v === 0 ? "stroke-fig-axis" : "stroke-fig-grid"} />
            ))}
            {xs
              .filter((v) => v !== 0 && v % 2 === 0)
              .map((v) => (
                <text key={`tx${v}`} x={at([v, 0])[0]} y={oy + 14} textAnchor="middle" fontSize={11} className="fill-ink-muted">
                  {num(v)}
                </text>
              ))}
            {ys
              .filter((v) => v !== 0 && v % 2 === 0)
              .map((v) => (
                <text key={`ty${v}`} x={ox - 6} y={at([0, v])[1]} dy="0.32em" textAnchor="end" fontSize={11} className="fill-ink-muted">
                  {num(v)}
                </text>
              ))}

            {/* The plane before the turn, faint and dashed. */}
            {flag ? (
              <g className="text-fig-point">
                <path d={line(POLE)} className="fill-none stroke-current" strokeWidth={1.5} strokeDasharray="5 4" />
                <path d={`${line(PENNANT)}Z`} className="fill-none stroke-current" strokeWidth={1.5} strokeDasharray="5 4" />
              </g>
            ) : null}
            {axes.map((a, i) => arrow(a.at, "text-fig-point", true, `before${i}`))}

            {/* Each marked point's path round its circle about the origin. */}
            {marks.map((m, i) => (
              <path key={`path${i}`} d={line(pathPoints([m.x, m.y], total))} className="fill-none stroke-fig-gradient" strokeWidth={2} strokeDasharray="2 4" strokeLinecap="round" />
            ))}

            {/* The plane after the turns. */}
            {flag ? (
              <g className="text-fig-vector">
                <path d={line(POLE.map((p) => turn(p, total)))} className="fill-none stroke-current" strokeWidth={2.5} />
                <path d={`${line(PENNANT.map((p) => turn(p, total)))}Z`} className="fill-current stroke-current" fillOpacity={0.25} strokeWidth={2} />
              </g>
            ) : null}
            {axes.map((a, i) => arrow(turn(a.at, total), "text-fig-vector", false, `after${i}`))}

            {marks.map((m, i) => {
              const [bx, by] = at([m.x, m.y]);
              const [ax, ay] = at(turn([m.x, m.y], total));
              return (
                <g key={`mark${i}`}>
                  <circle cx={bx} cy={by} r={4.5} className="fill-surface stroke-fig-point" strokeWidth={1.5} />
                  <circle cx={ax} cy={ay} r={5} className="fill-ink" />
                  <text x={bx + 8} y={by + 14} fontSize={12} paintOrder="stroke" strokeWidth={4} strokeLinejoin="round" className="fill-ink-muted stroke-surface">
                    {m.label}
                  </text>
                  <text x={ax + 8} y={ay - 8} fontSize={12} paintOrder="stroke" strokeWidth={4} strokeLinejoin="round" className="fill-ink stroke-surface">
                    {total === 0 ? "" : "turned"}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl label="Turn by, in degrees" min={-180} max={180} step={1} value={first} onChange={(v) => setFirst(Math.round(v))} display={`${num(first, 0)}°`} />
          {second !== undefined ? (
            <RangeControl label="Then turn by, in degrees" min={-180} max={180} step={1} value={second} onChange={(v) => setSecond(Math.round(v))} display={`${num(second, 0)}°`} />
          ) : null}
          <div className="tabular flex flex-col gap-1 text-sm text-ink" aria-live="polite">
            {words.map((s, i) => (
              <p key={i}>{s}</p>
            ))}
          </div>
          <p className="text-sm text-ink-muted">
            The faint dashed arrows{flag ? " and flag" : ""} are the plane before turning; the solid ones are where the turns take
            them{marks.length ? ", and the dotted curves are the paths the marked points travel" : ""}. A positive angle turns
            anticlockwise.
          </p>
        </>
      }
      table={{
        columns: second !== undefined ? ["Point", "After the first turn", "After both turns"] : ["Point", "After the turn"],
        rows: named.map(({ at: p, label }) => {
          const once = turn(p, first);
          return second !== undefined ? [label, pointText(once), pointText(turn(once, second))] : [label, pointText(once)];
        }),
      }}
    />
  );
}
