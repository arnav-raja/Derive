"use client";

import { useState } from "react";

import { arcPoints, num, piText, pointAt, radians, unitCircleWords, type Point } from "./rotation";
import { FigureFrame, RangeControl, useWidth } from "./shell";

/*
 * The point at an angle. A slider turns from (1, 0) along the circle of radius 1; the arc it
 * sweeps is drawn in the warm colour, since its length is the angle in radians, and dashed lines
 * from the point to the axes mark its two coordinates, the cosine and the sine.
 */

const LIMIT = 1.3;
const PAD = 22;
const TABLE_ANGLES = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360];

function path(points: readonly Point[], at: (p: Point) => Point): string {
  return points.map((p, i) => `${i ? "L" : "M"}${at(p)[0].toFixed(2)},${at(p)[1].toFixed(2)}`).join("");
}

export function UnitCircle({ title, description, angle = 30 }: { title: string; description: string; angle?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [deg, setDeg] = useState(Math.max(-360, Math.min(360, Math.round(angle))));

  const size = Math.max(200, Math.min(width, 380));
  const scale = (size - 2 * PAD) / (2 * LIMIT);
  const at = ([x, y]: Point): Point => [size / 2 + x * scale, size / 2 - y * scale];
  const [px, py] = pointAt(deg);
  const [sx, sy] = at([px, py]);
  const [ox, oy] = at([0, 0]);
  const grid = [-1, -0.5, 0.5, 1];
  // The labels sit beside their dashed lines, on the side away from the origin's axes.
  const sinLabelX = sx + (px >= 0 ? 8 : -8);
  const cosLabelY = sy + (py >= 0 ? -8 : 16);

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
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="tabular mx-auto block max-w-full font-sans"
          >
            {grid.map((g) => (
              <g key={g}>
                <line x1={at([g, -LIMIT])[0]} x2={at([g, LIMIT])[0]} y1={at([g, -LIMIT])[1]} y2={at([g, LIMIT])[1]} className="stroke-fig-grid" />
                <line x1={at([-LIMIT, g])[0]} x2={at([LIMIT, g])[0]} y1={at([-LIMIT, g])[1]} y2={at([LIMIT, g])[1]} className="stroke-fig-grid" />
              </g>
            ))}
            <line x1={at([-LIMIT, 0])[0]} x2={at([LIMIT, 0])[0]} y1={oy} y2={oy} className="stroke-fig-axis" />
            <line x1={ox} x2={ox} y1={at([0, -LIMIT])[1]} y2={at([0, LIMIT])[1]} className="stroke-fig-axis" />
            {[1, -1].map((v) => (
              <g key={v} className="fill-ink-muted" fontSize={11}>
                <text x={at([v, 0])[0] + (v > 0 ? 4 : -4)} y={oy + 14} textAnchor={v > 0 ? "start" : "end"}>
                  {num(v)}
                </text>
                <text x={ox - 6} y={at([0, v])[1] + (v > 0 ? -4 : 12)} textAnchor="end">
                  {num(v)}
                </text>
              </g>
            ))}
            <circle cx={ox} cy={oy} r={scale} className="fill-none stroke-ink-muted" strokeWidth={1.25} />
            {deg !== 0 ? (
              <path d={path(arcPoints(deg), at)} className="fill-none stroke-fig-gradient" strokeWidth={5} strokeLinecap="round" />
            ) : null}
            <line x1={sx} x2={sx} y1={sy} y2={oy} className="stroke-fig-point" strokeWidth={1.75} strokeDasharray="5 4" />
            <line x1={sx} x2={ox} y1={sy} y2={sy} className="stroke-fig-point" strokeWidth={1.75} strokeDasharray="5 4" />
            <line x1={ox} y1={oy} x2={sx} y2={sy} className="stroke-fig-vector" strokeWidth={2.25} />
            <circle cx={at([1, 0])[0]} cy={oy} r={4} className="fill-surface stroke-ink" strokeWidth={1.5} />
            <circle cx={sx} cy={sy} r={6} className="fill-fig-vector" />
            {Math.abs(py) > 0.08 ? (
              <text
                x={sinLabelX}
                y={(sy + oy) / 2}
                dy="0.32em"
                textAnchor={px >= 0 ? "start" : "end"}
                fontSize={12}
                paintOrder="stroke"
                strokeWidth={4}
                strokeLinejoin="round"
                className="fill-ink stroke-surface"
              >
                sin
              </text>
            ) : null}
            {Math.abs(px) > 0.12 ? (
              <text
                x={(sx + ox) / 2}
                y={cosLabelY}
                textAnchor="middle"
                fontSize={12}
                paintOrder="stroke"
                strokeWidth={4}
                strokeLinejoin="round"
                className="fill-ink stroke-surface"
              >
                cos
              </text>
            ) : null}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl
            label="Angle in degrees"
            min={-360}
            max={360}
            step={1}
            value={deg}
            onChange={(v) => setDeg(Math.round(v))}
            display={`${num(deg, 0)}°`}
          />
          <p className="tabular text-sm text-ink" aria-live="polite">
            {unitCircleWords(deg)}
          </p>
          <p className="text-sm text-ink-muted">
            The thick arc is the turn from (1, 0), and its length is the angle in radians. The dashed lines run from the
            point to the two axes.
          </p>
        </>
      }
      table={{
        columns: ["Angle in degrees", "In radians", "cos", "sin"],
        rows: TABLE_ANGLES.map((d) => {
          const [c, s] = pointAt(d);
          const pi = piText(d);
          return [`${num(d, 0)}°`, d === 0 ? "0" : `${pi}, about ${num(radians(d))}`, num(c), num(s)];
        }),
      }}
    />
  );
}
