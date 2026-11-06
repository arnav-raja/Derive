"use client";

import { useId, useMemo, useState } from "react";

import { LockIcon } from "@/components/ui/icons";

import { FigureFrame, RangeControl, useWidth } from "./shell";
import { levelsFor, tileCount, tileOutline, tiling, tilingWords, type Square } from "./tiling";

/*
 * A grid 2^n squares wide with one square cut out, and the L tiles that cover the rest, placed a
 * level at a time the way induction builds the covering: first the tile across the centre, then
 * the tile across the centre of each quarter, and so on down to blocks 2 by 2. The learner sets
 * the width and the cut square, and steps through the levels. The tiles can stay closed until an
 * exercise they would answer is done, or be left out, for a figure that sets the puzzle.
 */

const LEFT = 22;
const TOP = 18;
const MAX_SIDE = 400;

export function TileGrid({
  title,
  description,
  width: initialWidth = 8,
  cut: initialCut = [1, 1],
  placed: initialPlaced,
  maxWidth = 16,
  counts = false,
  gridOnly = false,
  tilesLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** The grid's width to begin with: 2, 4, 8 or 16 squares. */
  width?: number;
  /** The cut square to begin with, as [row, column], counted from 1 at the top left. */
  cut?: [number, number];
  /** How many levels of tiles are placed to begin with; all of them unless set. */
  placed?: number;
  /** The widest grid the control reaches. */
  maxWidth?: number;
  /** Shows how many tiles each level places, and the total. */
  counts?: boolean;
  /** Shows only the grid, its cut square and its quarters, with no tiles and no level control. */
  gridOnly?: boolean;
  /** Keeps the tiles off the grid until the exercise they would answer is done. */
  tilesLocked?: boolean;
  /** Says what opens them. */
  lockedNote?: string;
}) {
  const [ref, boxWidth] = useWidth<HTMLDivElement>();
  const uid = useId();
  const hatch = `${uid}-hatch`.replace(/[^a-zA-Z0-9_-]/g, "");

  const maxN = Math.max(1, levelsFor(maxWidth));
  const [n, setN] = useState(Math.min(maxN, Math.max(1, levelsFor(initialWidth))));
  const width = 2 ** n;
  const clamp = (v: number) => Math.min(width - 1, Math.max(0, Math.round(v)));
  const [cut, setCut] = useState<Square>([clamp(initialCut[0] - 1), clamp(initialCut[1] - 1)]);
  const [levels, setLevels] = useState(Math.min(n, Math.max(0, initialPlaced ?? n)));
  const tilesShown = !gridOnly && !tilesLocked;
  const placed = tilesShown ? Math.min(levels, n) : 0;

  const { blocks, tiles } = useMemo(() => tiling(width, cut), [width, cut]);

  const changeWidth = (next: number) => {
    const w = 2 ** next;
    setCut(([r, c]) => [Math.min(w - 1, r), Math.min(w - 1, c)]);
    // All levels placed stays all placed; otherwise as many as the new grid has.
    setLevels((k) => (k >= n ? next : Math.min(k, next)));
    setN(next);
  };

  // The grid is drawn at the same size whatever its width, so the squares shrink as it grows.
  const side = Math.max(120, Math.min(MAX_SIDE, boxWidth - LEFT - 4));
  const cell = side / width;
  const x0 = Math.max(0, Math.floor((boxWidth - LEFT - side) / 2)) + LEFT;
  const height = TOP + side + 4;
  const labelEvery = width <= 8 ? 1 : width <= 16 ? (cell >= 16 ? 1 : 3) : 4;
  const gapWidth = Math.max(1.5, Math.min(3, cell * 0.1));
  const next = placed >= 1 && placed < n ? blocks.filter((b) => b.level === placed + 1) : [];

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
            <defs>
              <pattern id={hatch} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={6} className="stroke-ink-muted" strokeWidth={1.5} />
              </pattern>
            </defs>
            {Array.from({ length: width }, (_, i) =>
              i % labelEvery === 0 || i === width - 1 ? (
                <g key={`l${i}`} className="tabular fill-ink-muted text-[11px]">
                  <text x={x0 + (i + 0.5) * cell} y={TOP - 6} textAnchor="middle">
                    {i + 1}
                  </text>
                  <text x={x0 - 6} y={TOP + (i + 0.5) * cell + 3.5} textAnchor="end">
                    {i + 1}
                  </text>
                </g>
              ) : null,
            )}
            <g>
              {Array.from({ length: width * width }, (_, k) => (
                <rect
                  key={k}
                  x={x0 + (k % width) * cell}
                  y={TOP + Math.floor(k / width) * cell}
                  width={cell}
                  height={cell}
                  className="fill-surface stroke-fig-grid"
                  strokeWidth={1}
                />
              ))}
            </g>
            <g strokeLinejoin="round">
              {tiles
                .filter((t) => t.level <= placed)
                .map((t) => (
                  <polygon
                    key={`${t.top},${t.left}`}
                    points={tileOutline(t)
                      .map(([x, y]) => `${x0 + x * cell},${TOP + y * cell}`)
                      .join(" ")}
                    className={t.level === placed ? "fill-fig-gradient stroke-surface" : "fill-fig-vector stroke-surface"}
                    strokeWidth={gapWidth}
                  />
                ))}
            </g>
            <rect
              x={x0 + cut[1] * cell}
              y={TOP + cut[0] * cell}
              width={cell}
              height={cell}
              fill={`url(#${hatch})`}
              className="stroke-ink-muted"
              strokeWidth={1.5}
            />
            {placed === 0 && n >= 2 ? (
              <g className="stroke-fig-axis" strokeWidth={1.5} strokeDasharray="5 3">
                <line x1={x0 + side / 2} y1={TOP} x2={x0 + side / 2} y2={TOP + side} />
                <line x1={x0} y1={TOP + side / 2} x2={x0 + side} y2={TOP + side / 2} />
              </g>
            ) : null}
            {next.map((b) => (
              <rect
                key={`${b.top},${b.left}`}
                x={x0 + b.left * cell}
                y={TOP + b.top * cell}
                width={b.width * cell}
                height={b.width * cell}
                className="fill-none stroke-fig-axis"
                strokeWidth={1.5}
                strokeDasharray="5 3"
              />
            ))}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl
            label="Grid width"
            min={1}
            max={maxN}
            step={1}
            value={n}
            onChange={changeWidth}
            display={`${width} by ${width}`}
          />
          <RangeControl
            label="Cut square: row"
            min={1}
            max={width}
            step={1}
            value={cut[0] + 1}
            onChange={(v) => setCut(([, c]) => [clamp(v - 1), c])}
          />
          <RangeControl
            label="Cut square: column"
            min={1}
            max={width}
            step={1}
            value={cut[1] + 1}
            onChange={(v) => setCut(([r]) => [r, clamp(v - 1)])}
          />
          {gridOnly ? null : tilesLocked ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <LockIcon aria-hidden="true" className="size-4 shrink-0" />
              {lockedNote ?? "The tiles open once you have answered the question below."}
            </p>
          ) : (
            <RangeControl
              label="Levels of tiles"
              min={0}
              max={n}
              step={1}
              value={placed}
              onChange={setLevels}
              display={`${placed} of ${n}`}
            />
          )}
          <p className="text-sm text-ink" aria-live="polite">
            {tilingWords(width, placed, counts, tilesShown)}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={14} height={14} viewBox="0 0 22 22" className="shrink-0">
                <polygon points="11,1 21,1 21,21 1,21 1,11 11,11" className={tilesShown ? "fill-fig-gradient" : "fill-fig-vector"} />
              </svg>
              One tile: a 2 by 2 block less one square
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
                <rect x={1} y={1} width={12} height={12} fill={`url(#${hatch})`} className="stroke-ink-muted" strokeWidth={1.5} />
              </svg>
              The cut square
            </li>
            {placed === 0 && n >= 2 ? (
              <li className="flex items-center gap-2">
                <svg aria-hidden="true" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
                  <g className="stroke-fig-axis" strokeWidth={1.5} strokeDasharray="4 2">
                    <line x1={7} y1={0} x2={7} y2={14} />
                    <line x1={0} y1={7} x2={14} y2={7} />
                  </g>
                </svg>
                The four quarters
              </li>
            ) : null}
            {placed >= 1 && placed < n ? (
              <li className="flex items-center gap-2">
                <svg aria-hidden="true" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
                  <rect x={1} y={1} width={12} height={12} className="fill-none stroke-fig-axis" strokeWidth={1.5} strokeDasharray="4 2" />
                </svg>
                A smaller grid, one square taken
              </li>
            ) : null}
            {placed >= 2 ? (
              <>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-3.5 shrink-0 rounded-xs bg-fig-gradient" />
                  Placed at the last level
                </li>
                <li className="flex items-center gap-2">
                  <span aria-hidden="true" className="size-3.5 shrink-0 rounded-xs bg-fig-vector" />
                  Placed earlier
                </li>
              </>
            ) : null}
          </ul>
        </>
      }
      table={
        counts
          ? {
              columns: ["Level", "Each block", "Tiles at this level", "Tiles so far"],
              rows: Array.from({ length: n }, (_, i) => {
                const w = width / 2 ** i;
                return [i + 1, `${w} by ${w}`, (4 ** i).toLocaleString("en-GB"), tileCount(i + 1).toLocaleString("en-GB")];
              }),
            }
          : undefined
      }
    />
  );
}
