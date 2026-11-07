"use client";

import { clsx } from "clsx";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { FigureFrame, RangeControl, useWidth } from "./shell";
import {
  bufferShuffle,
  firstRowWords,
  itemName,
  PER_TOPIC,
  rows,
  stream,
  STREAM_LENGTH,
  TOPICS,
  topicCounts,
  type Item,
} from "./shuffle";

/*
 * A stream of 36 items, 12 about each of three topics, in order, drawn as three rows of 12, and
 * below it the same items in the order a shuffle buffer hands them out, also in rows of 12. A
 * slider sets the buffer's size and a button draws new random choices. Each item is a square in
 * its topic's colour, named by its topic and its number within the topic, so that the colour is
 * never the only sign of the topic. The squares are drawn at the width there is, so that a row of
 * 12 fits a phone.
 */

/** The fill of each topic's squares, in the order A, B, C; their names are in the surface colour. */
const TOPIC_FILLS = ["fill-fig-vector", "fill-fig-gradient", "fill-fig-point"] as const;
const TOPIC_SWATCHES = ["bg-fig-vector", "bg-fig-gradient", "bg-fig-point"] as const;

const GAP = 4;
const CELL = 28;
const LABEL = 20;
const BETWEEN = 16;

/** The height of one grid: its label and its three rows. */
const GRID = LABEL + 3 * CELL + 2 * GAP;

function Grid({ label, items, top, width }: { label: string; items: readonly Item[]; top: number; width: number }) {
  const cell = (width - GAP * (PER_TOPIC - 1)) / PER_TOPIC;
  const font = Math.max(9, Math.min(12, cell * 0.46));
  return (
    <g>
      <text x={0} y={top + 13} fontSize={12} className="fill-ink-muted font-semibold">
        {label}
      </text>
      {rows(items).map((row, r) =>
        row.map((item, c) => {
          const x = c * (cell + GAP);
          const y = top + LABEL + r * (CELL + GAP);
          return (
            <g key={item.place}>
              <rect x={x} y={y} width={cell} height={CELL} rx={3} className={TOPIC_FILLS[item.topic]} />
              <text x={x + cell / 2} y={y + CELL / 2 + font * 0.36} textAnchor="middle" fontSize={font} className="fill-surface font-mono">
                {itemName(item)}
              </text>
            </g>
          );
        }),
      )}
    </g>
  );
}

export function ShuffleBuffer({
  title,
  description,
  size = 4,
  seed = 1,
}: {
  title: string;
  description: string;
  /** The buffer's size to begin with, from 1 to 36. */
  size?: number;
  /** The seed the first random choices are drawn from. */
  seed?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [k, setK] = useState(Math.min(STREAM_LENGTH, Math.max(1, Math.round(size))));
  const [draw, setDraw] = useState(seed);
  const given = useMemo(() => stream(), []);
  const out = useMemo(() => bufferShuffle(given, k, draw), [given, k, draw]);
  const height = 2 * GRID + BETWEEN;

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
            className="tabular block max-w-full font-sans"
          >
            <Grid label="The stream, in the order it arrives" items={given} top={0} width={width} />
            <Grid label={`Handed out by a buffer of ${k}`} items={out} top={GRID + BETWEEN} width={width} />
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl label="Buffer size, k" sym="k" min={1} max={STREAM_LENGTH} step={1} value={k} onChange={(v) => setK(Math.round(v))} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setDraw((d) => d + 1)}>
              Shuffle again
            </Button>
          </div>
          {/* The shuffle's number starts the sentence, so that a new shuffle is announced even when
              the first row's counts come out the same. */}
          <p className="tabular text-sm text-ink" aria-live="polite">
            {`Shuffle ${draw - seed + 1}. ${firstRowWords(out, k)}`}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            {TOPICS.map((t, i) => (
              <li key={t} className="flex items-center gap-2">
                <span aria-hidden="true" className={clsx("size-3.5 shrink-0 rounded-xs", TOPIC_SWATCHES[i])} />
                Topic {t}, items {t}1 to {t}
                {PER_TOPIC}
              </li>
            ))}
          </ul>
        </>
      }
      table={{
        columns: ["Row handed out", "Items", ...TOPICS.map((t) => `About ${t}`)],
        rows: rows(out).map((row, r) => [String(r + 1), row.map(itemName).join(", "), ...topicCounts(row)]),
      }}
    />
  );
}
