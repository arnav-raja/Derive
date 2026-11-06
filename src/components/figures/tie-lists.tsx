"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

import { FigureFrame, RangeControl, useWidth } from "./shell";
import { drawLists, group, listWords, repeated, tieWords, TOPS } from "./ties";

/*
 * Many random lists of whole numbers at once, one square for each list, filled and marked with an
 * equals sign when two of its numbers are equal. The learner sets how many numbers each list has
 * and how large they may be, picks a list to read, and draws new lists, and sees how rarely a wide
 * range makes a tie, and how often a narrow one does.
 */

const COLUMNS = 10;
const MAX_SIDE = 360;

export function TieLists({
  title,
  description,
  count = 100,
  length: initialLength = 10,
  top: initialTop = 1_000_000,
  seed: initialSeed = 1,
  maxLength = 20,
}: {
  title: string;
  description: string;
  /** How many lists are drawn. */
  count?: number;
  /** How many numbers each list has, to begin with. */
  length?: number;
  /** The largest number a list may hold, to begin with: 10, 100, 1,000, 10,000, 100,000 or 1,000,000. */
  top?: number;
  /** The seed the first lists are drawn from. */
  seed?: number;
  /** The most numbers a list can be given. */
  maxLength?: number;
}) {
  const [ref, boxWidth] = useWidth<HTMLDivElement>();
  const [length, setLength] = useState(Math.min(maxLength, Math.max(2, Math.round(initialLength))));
  const startTop = TOPS.findIndex((t) => t >= initialTop);
  const [topIndex, setTopIndex] = useState(startTop < 0 ? TOPS.length - 1 : startTop);
  const [seed, setSeed] = useState(initialSeed);
  const [shown, setShown] = useState(0);
  const top = TOPS[topIndex]!;

  const lists = useMemo(() => drawLists(seed, count, length, top), [seed, count, length, top]);
  const tied = lists.map((l) => repeated(l) !== null);

  const rows = Math.ceil(count / COLUMNS);
  const side = Math.max(160, Math.min(MAX_SIDE, boxWidth - 4));
  const cell = side / COLUMNS;
  const gap = Math.max(2, cell * 0.12);
  const x0 = Math.max(0, Math.floor((boxWidth - side) / 2));
  const height = rows * cell + 4;

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
            {lists.map((_, k) => {
              const x = x0 + (k % COLUMNS) * cell + gap / 2;
              const y = 2 + Math.floor(k / COLUMNS) * cell + gap / 2;
              const s = cell - gap;
              return (
                <g key={k}>
                  <rect
                    x={x}
                    y={y}
                    width={s}
                    height={s}
                    rx={Math.min(4, s / 6)}
                    className={tied[k] ? "fill-fig-gradient stroke-fig-gradient" : "fill-surface stroke-ink-faint"}
                    strokeWidth={1}
                  />
                  {tied[k] ? (
                    <text x={x + s / 2} y={y + s / 2 + s * 0.17} textAnchor="middle" className="fill-surface font-semibold" fontSize={s * 0.5}>
                      =
                    </text>
                  ) : null}
                  {k === shown ? (
                    <rect
                      x={x - gap / 2 + 0.75}
                      y={y - gap / 2 + 0.75}
                      width={cell - 1.5}
                      height={cell - 1.5}
                      rx={Math.min(5, cell / 6)}
                      className="fill-none stroke-ink"
                      strokeWidth={1.5}
                    />
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl
            label="Numbers in each list"
            min={2}
            max={maxLength}
            step={1}
            value={length}
            onChange={setLength}
          />
          <RangeControl
            label="Largest number"
            min={0}
            max={TOPS.length - 1}
            step={1}
            value={topIndex}
            onChange={setTopIndex}
            display={group(top)}
          />
          <RangeControl label="List shown" min={1} max={count} step={1} value={shown + 1} onChange={(v) => setShown(v - 1)} />
          <div>
            <Button size="sm" variant="secondary" onClick={() => setSeed((s) => s + 1)}>
              Draw new lists
            </Button>
          </div>
          <p className="text-sm text-ink" aria-live="polite">
            {tieWords(lists, top)}
          </p>
          <p className="tabular text-sm break-words text-ink" aria-live="polite">
            {listWords(shown, lists[shown] ?? [])}
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
                <rect x={0.5} y={0.5} width={13} height={13} rx={2.5} className="fill-fig-gradient stroke-fig-gradient" />
                <text x={7} y={10.6} textAnchor="middle" className="fill-surface font-semibold" fontSize={9}>
                  =
                </text>
              </svg>
              A list with two equal numbers
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
                <rect x={0.5} y={0.5} width={13} height={13} rx={2.5} className="fill-surface stroke-ink-faint" />
              </svg>
              A list with no two equal
            </li>
            <li className="flex items-center gap-2">
              <svg aria-hidden="true" width={14} height={14} viewBox="0 0 14 14" className="shrink-0">
                <rect x={3.5} y={3.5} width={7} height={7} rx={1.5} className="fill-surface stroke-ink-faint" />
                <rect x={0.75} y={0.75} width={12.5} height={12.5} rx={3} className="fill-none stroke-ink" strokeWidth={1.5} />
              </svg>
              The list shown
            </li>
          </ul>
        </>
      }
    />
  );
}
