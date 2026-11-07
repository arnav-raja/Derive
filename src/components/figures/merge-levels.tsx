"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { levelsWords, makeList, mergeLevels, ORDERS, SIZES, totalComparisons, type Order } from "./merge";
import { FigureFrame, RangeControl, useWidth } from "./shell";
import { group } from "./ties";

/*
 * Merge sort drawn a level at a time. The top row is the list as given, as single items; each row
 * below merges the runs of the row above in pairs, until the bottom row is one run in order. Each
 * loss is a bar as tall as the loss, and gaps between bars mark where one run ends and the next
 * begins, where there is room for them. Beside each row is the number of comparisons its merges
 * made. Each row is drawn as one path, so that 1,024 losses stay light to draw.
 */

const HEADER = 18;
const BAR = 28;
const ROW_GAP = 10;

/** The bars of one row as one path: one rectangle for each loss, with gaps between the runs. */
function rowPath(runs: readonly number[][], n: number, width: number, top: number): string {
  if (n === 0) return "";
  const gaps = runs.length - 1;
  let gap = gaps > 0 ? Math.min(4, (width * 0.2) / gaps) : 0;
  if (gap < 1) gap = 0;
  const step = (width - gap * gaps) / n;
  const inner = step > 5 ? 1 : 0;
  const w = Math.max(0.6, step - inner);
  let x = 0;
  const parts: string[] = [];
  runs.forEach((run, r) => {
    for (const v of run) {
      const h = Math.max(1, (v / n) * BAR);
      parts.push(`M${x.toFixed(2)} ${(top + BAR).toFixed(2)}h${w.toFixed(2)}v${(-h).toFixed(2)}h${(-w).toFixed(2)}z`);
      x += step;
    }
    if (r < gaps) x += gap;
  });
  return parts.join("");
}

export function MergeLevels({
  title,
  description,
  size = 16,
  order: initialOrder = "random",
  seed = 1,
}: {
  title: string;
  description: string;
  /** How many losses there are to begin with: 8, 16, 32 and so on up to 1,024. */
  size?: number;
  /** Their order to begin with. */
  order?: Order;
  /** The seed the first shuffle is drawn from. */
  seed?: number;
}) {
  const [ref, boxWidth] = useWidth<HTMLDivElement>();
  const start = SIZES.findIndex((s) => s >= size);
  const [sizeIndex, setSizeIndex] = useState(start < 0 ? SIZES.length - 1 : start);
  const [order, setOrder] = useState<Order>(initialOrder);
  const [shuffle, setShuffle] = useState(seed);
  const n = SIZES[sizeIndex]!;

  const list = useMemo(() => makeList(n, order, shuffle), [n, order, shuffle]);
  const levels = useMemo(() => mergeLevels(list), [list]);
  const total = totalComparisons(levels);

  const labelWidth = boxWidth < 400 ? 52 : 72;
  const plotWidth = Math.max(120, boxWidth - labelWidth - 8);
  const height = HEADER + levels.length * (BAR + ROW_GAP);

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
            className="tabular block max-w-full font-sans"
          >
            <text x={boxWidth - 2} y={12} textAnchor="end" className="fill-ink-muted" fontSize={11}>
              {boxWidth < 400 ? "Compared" : "Comparisons"}
            </text>
            <path
              d={levels.map((_, j) => `M0 ${HEADER + j * (BAR + ROW_GAP) + BAR + 0.5}H${plotWidth}`).join("")}
              className="fill-none stroke-rule"
              strokeWidth={1}
            />
            {levels.map((level, j) => {
              const top = HEADER + j * (BAR + ROW_GAP);
              return (
                <g key={j}>
                  <path d={rowPath(level.runs, n, plotWidth, top)} className="fill-fig-vector" />
                  <text
                    x={boxWidth - 2}
                    y={top + BAR - 6}
                    textAnchor="end"
                    fontSize={13}
                    className={j === 0 ? "fill-ink-muted" : "fill-ink"}
                  >
                    {j === 0 ? "given" : group(level.comparisons)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl
            label="Losses"
            min={0}
            max={SIZES.length - 1}
            step={1}
            value={sizeIndex}
            onChange={setSizeIndex}
            display={group(n)}
          />
          <div role="group" aria-label="Their order to begin with" className="flex flex-wrap gap-2">
            {ORDERS.map((o) => (
              <Button
                key={o.id}
                size="sm"
                variant={o.id === order ? "primary" : "secondary"}
                aria-pressed={o.id === order}
                onClick={() => setOrder(o.id)}
              >
                {o.label}
              </Button>
            ))}
            {order === "random" ? (
              <Button size="sm" variant="ghost" onClick={() => setShuffle((s) => s + 1)}>
                Shuffle again
              </Button>
            ) : null}
          </div>
          <p className="tabular text-sm text-ink" aria-live="polite">
            {levelsWords(n, order, levels)}
          </p>
          <p className="text-sm text-ink-muted">
            Each bar is one loss, as tall as the loss. Gaps between the bars mark where one run ends and the next begins,
            where there is room to draw them.
          </p>
        </>
      }
      table={{
        columns: ["Level", "Runs", "Losses in each run", "Comparisons"],
        rows: [
          ...levels.map((l, j) => [
            j === 0 ? "0, as given" : String(j),
            group(l.runs.length),
            group(l.runs[0]?.length ?? 0),
            j === 0 ? "none" : group(l.comparisons),
          ]),
          ["All levels", "", "", group(total)],
        ],
      }}
    />
  );
}
