"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import type { Point } from "./rotation";
import { num } from "./rotation";
import { FigureFrame, RangeControl, useWidth } from "./shell";
import { ARRANGEMENTS, squareWords, triangles, uncovered, type Arrangement } from "./squares";

/*
 * Four copies of a triangle with a right angle in a square of side a + b. Sliders set the two
 * shorter sides; buttons, where the lesson offers both, lay the triangles one in each corner,
 * leaving a tilted four-sided shape in the middle, or as two rectangles, leaving squares of sides a
 * and b. The parts left uncovered are shaded in the warm colour and named with their areas. Calling
 * the middle shape a square is left to the proof that the lesson asks for.
 */

const PAD = 22;

function polygon(points: readonly Point[], at: (p: Point) => Point): string {
  return points.map((p) => at(p).map((v) => v.toFixed(2)).join(",")).join(" ");
}

export function FourTriangles({
  title,
  description,
  a: aStart = 3,
  b: bStart = 4,
  arrangement: arrangementStart = "tilted",
  arrangements = ["tilted", "rectangles"],
}: {
  title: string;
  description: string;
  /** The shorter sides to begin with, whole numbers from 1 to 6. */
  a?: number;
  b?: number;
  arrangement?: Arrangement;
  /** The layouts the buttons offer; with only one, there are no buttons. */
  arrangements?: Arrangement[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [a, setA] = useState(aStart);
  const [b, setB] = useState(bStart);
  const [arrangement, setArrangement] = useState<Arrangement>(arrangementStart);
  const s = a + b;

  const size = Math.max(200, Math.min(width, 340));
  const scale = (size - 2 * PAD) / s;
  const at = ([x, y]: Point): Point => [PAD + x * scale, size - PAD - y * scale];
  const tris = triangles(a, b, arrangement);
  const gaps = uncovered(a, b, arrangement);

  // Each side of the big square is cut into a and b; label each piece outside the square.
  const sideLabels: { x: number; y: number; text: string; anchor: "start" | "middle" | "end" }[] =
    arrangement === "tilted"
      ? [
          { x: a / 2, y: -0.35, text: "a", anchor: "middle" },
          { x: a + b / 2, y: -0.35, text: "b", anchor: "middle" },
          { x: -0.25, y: b / 2, text: "b", anchor: "end" },
          { x: -0.25, y: b + a / 2, text: "a", anchor: "end" },
        ]
      : [
          { x: a / 2, y: -0.35, text: "a", anchor: "middle" },
          { x: a + b / 2, y: -0.35, text: "b", anchor: "middle" },
          { x: -0.25, y: a / 2, text: "a", anchor: "end" },
          { x: -0.25, y: a + b / 2, text: "b", anchor: "end" },
        ];

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
            {gaps.map((g, i) => (
              <polygon key={`gap${i}`} points={polygon(g.points, at)} className="fill-fig-gradient stroke-fig-gradient" fillOpacity={0.2} strokeWidth={1.5} />
            ))}
            {tris.map((t, i) => (
              <polygon key={`tri${i}`} points={polygon(t, at)} className="fill-fig-vector stroke-fig-vector" fillOpacity={0.3} strokeWidth={1.5} strokeLinejoin="round" />
            ))}
            <rect x={at([0, 0])[0]} y={at([0, s])[1]} width={s * scale} height={s * scale} className="fill-none stroke-ink" strokeWidth={1.5} />
            {gaps.map((g, i) => {
              const cx = g.points.reduce((t, p) => t + p[0], 0) / g.points.length;
              const cy = g.points.reduce((t, p) => t + p[1], 0) / g.points.length;
              const [x, y] = at([cx, cy]);
              return (
                <text key={`name${i}`} x={x} y={y} dy="0.32em" textAnchor="middle" fontSize={13} paintOrder="stroke" strokeWidth={4} strokeLinejoin="round" className="fill-ink stroke-surface">
                  {g.name} = {num(g.area)}
                </text>
              );
            })}
            {sideLabels.map((l, i) => {
              const [x, y] = at([l.x, l.y]);
              return (
                <text key={`side${i}`} x={x} y={y} dy="0.32em" textAnchor={l.anchor} fontSize={12} className="fill-ink-muted italic">
                  {l.text}
                </text>
              );
            })}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl label="Shorter side a" min={1} max={6} step={1} value={a} onChange={(v) => setA(Math.round(v))} display={num(a)} />
          <RangeControl label="Shorter side b" min={1} max={6} step={1} value={b} onChange={(v) => setB(Math.round(v))} display={num(b)} />
          {arrangements.length > 1 ? (
            <div role="group" aria-label="How the triangles are laid" className="flex flex-wrap gap-2">
              {ARRANGEMENTS.filter((o) => arrangements.includes(o.id)).map((o) => (
                <Button key={o.id} size="sm" variant={o.id === arrangement ? "primary" : "secondary"} aria-pressed={o.id === arrangement} onClick={() => setArrangement(o.id)}>
                  {o.label}
                </Button>
              ))}
            </div>
          ) : null}
          <p className="tabular text-sm text-ink" aria-live="polite">
            {squareWords(a, b, arrangement)}
          </p>
        </>
      }
      table={{
        columns: ["a", "b", "Big square, (a + b)²", "Four triangles, 2ab", "Left uncovered", "a² + b²"],
        rows: [
          [num(a), num(b), num(s * s), num(2 * a * b), num(s * s - 2 * a * b), num(a * a + b * b)],
        ],
      }}
    />
  );
}
