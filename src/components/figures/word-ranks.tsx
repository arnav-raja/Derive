"use client";

import { useEffect, useMemo, useState } from "react";

import { Mark } from "./complex-plane";
import { FigureFrame, FigureLabel, RangeControl, useWidth } from "./shell";
import { group, loadBook, percent, quoted, rankWords, sliderRanks, type Book } from "./words";

/*
 * Every different word of Alice's Adventures in Wonderland as a dot, across by its rank and up by
 * its count, on axes that go up in tens, with the line on which count times rank is 4,000. A
 * slider picks a rank and marks its word. The counts are worked out in the browser from the book
 * itself, so the figure shows the lesson's own numbers.
 */

const LEFT = 52;
const RIGHT = 16;
const TOP = 16;
const BOTTOM = 40;
/** The axes run from 1 to these. */
const MAX_RANK = 3_000;
const MAX_COUNT = 2_000;
const LINE = 4_000;
const TICKS = [1, 10, 100, 1_000];
/** The ranks the table lists. */
const TABLE_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 50, 100, 200, 500, 1_000, 1_500, 2_000];

export type RankView = { width: number; height: number; x: (rank: number) => number; y: (count: number) => number };

/** Where rank and count land, on axes from 1 to 3,000 and 1 to 2,000 that go up in tens. */
export function rankView(width: number): RankView {
  const height = Math.round(Math.max(240, Math.min(360, width * 0.62)));
  const x = (rank: number) => LEFT + (Math.log10(rank) / Math.log10(MAX_RANK)) * (width - LEFT - RIGHT);
  const y = (count: number) => height - BOTTOM - (Math.log10(count) / Math.log10(MAX_COUNT)) * (height - TOP - BOTTOM);
  return { width, height, x, y };
}

/** One path of small circles, one for each word, leaving out circles that land where one is already drawn. */
export function dotsPath(book: Book, view: RankView, r = 1.8): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  book.ranked.forEach(({ count }, i) => {
    const cx = view.x(i + 1);
    const cy = view.y(count);
    const key = `${Math.round(cx * 2)},${Math.round(cy * 2)}`;
    if (seen.has(key)) return;
    seen.add(key);
    parts.push(`M${(cx - r).toFixed(1)},${cy.toFixed(1)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`);
  });
  return parts.join("");
}

function Axes({ view }: { view: RankView }) {
  const { width, height, x, y } = view;
  const x0 = x(1);
  const y0 = y(1);
  return (
    <g fontSize={11} className="fill-ink-muted">
      {TICKS.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={y(MAX_COUNT)} y2={y0} className="stroke-fig-grid" />
          <line x1={x0} x2={x(MAX_RANK)} y1={y(t)} y2={y(t)} className="stroke-fig-grid" />
          <text x={x(t)} y={y0 + 15} textAnchor="middle">
            {group(t)}
          </text>
          <text x={x0 - 6} y={y(t)} dy="0.32em" textAnchor="end">
            {group(t)}
          </text>
        </g>
      ))}
      <line x1={x0} x2={x(MAX_RANK)} y1={y0} y2={y0} className="stroke-fig-axis" />
      <line x1={x0} x2={x0} y1={y(MAX_COUNT)} y2={y0} className="stroke-fig-axis" />
      <text x={width - RIGHT} y={height - 6} textAnchor="end" className="fill-ink">
        Rank, most common first
      </text>
      <text x={x0 + 6} y={TOP - 4} className="fill-ink">
        Times it appears
      </text>
    </g>
  );
}

export function WordRanks({ title, description, rank = 10 }: { title: string; description: string; rank?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [book, setBook] = useState<Book | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    loadBook().then(
      (b) => live && setBook(b),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, []);

  const stops = useMemo(() => sliderRanks(book?.ranked.length ?? 2_630), [book]);
  const first = Math.max(0, stops.findIndex((s) => s >= rank));
  const [at, setAt] = useState(first);
  const chosen = stops[Math.min(at, stops.length - 1)]!;
  const view = useMemo(() => rankView(Math.max(260, width)), [width]);
  const dots = useMemo(() => (book ? dotsPath(book, view) : ""), [book, view]);

  const lineFrom = LINE / MAX_COUNT;
  const marked = book?.ranked[chosen - 1];
  const mx = view.x(chosen);
  const my = marked ? view.y(marked.count) : 0;
  const labelLeft = mx > view.width * 0.6;
  // Above its dot, a label near the top would run into the axis title, so there it goes below the dot.
  const labelY = my - 10 < TOP + 18 ? my + 18 : my - 10;

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
            width={view.width}
            height={view.height}
            viewBox={`0 0 ${view.width} ${view.height}`}
            className="tabular block max-w-full font-sans"
          >
            <Axes view={view} />
            <path
              d={`M${view.x(lineFrom)},${view.y(MAX_COUNT)}L${view.x(MAX_RANK)},${view.y(LINE / MAX_RANK)}`}
              className="fill-none stroke-fig-gradient"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            {book ? <path d={dots} className="fill-fig-vector" /> : null}
            {marked ? (
              <g>
                <line x1={mx} x2={mx} y1={my} y2={view.y(1)} className="stroke-fig-point" strokeWidth={1.5} strokeDasharray="3 3" />
                <circle cx={mx} cy={my} r={6} className="fill-fig-point stroke-surface" strokeWidth={2} />
                <Mark x={labelLeft ? mx - 10 : mx + 10} y={labelY} anchor={labelLeft ? "end" : "start"} className="fill-fig-point">
                  {`${quoted(marked.word)}, ${group(marked.count)}`}
                </Mark>
              </g>
            ) : null}
            {!book ? (
              <text x={view.width / 2} y={view.height / 2} textAnchor="middle" fontSize={13} className="fill-ink-muted">
                {failed ? "The book could not be read. Reload the page to try again." : "Reading the book…"}
              </text>
            ) : null}
          </svg>
        </div>
      )}
      controls={
        <>
          <RangeControl
            label="Rank"
            min={0}
            max={stops.length - 1}
            step={1}
            value={Math.min(at, stops.length - 1)}
            onChange={(v) => setAt(Math.round(v))}
            display={group(chosen)}
          />
          <div className="tabular flex min-h-16 flex-col gap-1 text-sm text-ink" aria-live="polite">
            {book ? rankWords(book, chosen).map((s, i) => <p key={i}>{s}</p>) : <p>{failed ? "The book could not be read." : "Reading the book…"}</p>}
          </div>
          <p className="text-sm text-ink-muted">
            <FigureLabel text="Each dot is one word. The dashed line is where count times rank is 4,000. The slider stops at every rank up to 38, then at ranks about 4% apart, and at the last." />
          </p>
        </>
      }
      table={{
        columns: ["Rank", "Word", "Times it appears", "Count × rank", "Share of the book up to this rank"],
        rows: book
          ? [...TABLE_RANKS, book.ranked.length].map((r) => {
              const { word, count } = book.ranked[r - 1]!;
              return [group(r), word, group(count), group(count * r), percent(book.before[r]!, book.before.at(-1)!)];
            })
          : [],
      }}
    />
  );
}
