"use client";

import { clsx } from "clsx";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

import { FigureFrame, useWidth } from "./shell";
import { drawNext, followers, generator, group, loadBook, mostLikely, percent, quoted, times, tokens, writerWords, type Book } from "./words";

/*
 * A writer that works from the next-word counts of Alice's Adventures in Wonderland. The picture
 * shows the words that most often follow the last word written, each with a bar in proportion to
 * its count, the commonest filling the width, and a line under the bars for the words not shown.
 * One button adds the commonest next word, another draws one at random in proportion to the
 * counts, from all the words that follow, and the text written so far is shown below, with a
 * sentence that says which word was added and when the text has started to go round a loop. The
 * counts are worked out in the browser from the book itself.
 */

/** The bars drawn: the commonest next words, at most this many. */
const BARS = 8;
const ROW = 26;
/** The longest text the figure writes. */
const MOST = 200;
/** The words the table lists. */
const TABLE_ROWS = 20;

export function NextWords({ title, description, start = "the", seed = 1 }: { title: string; description: string; start?: string; seed?: number }) {
  const uid = useId();
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

  const [typed, setTyped] = useState(start);
  const [written, setWritten] = useState<string[]>([start]);
  const [commonest, setCommonest] = useState<boolean[]>([false]);
  /** The word the last press added, which the live sentence names; null after a start. */
  const [added, setAdded] = useState<string | null>(null);
  // The draws go on from where they were after Start again, so that a new start writes new words.
  const random = useRef(generator(seed));

  const asked = tokens(typed);
  const startWord = asked.length === 1 ? asked[0]! : null;
  const known = book && startWord ? book.follows.has(startWord) || book.ranked.some((x) => x.word === startWord) : false;
  const last = written.at(-1)!;
  const next = book ? followers(book.follows, last) : [];
  const total = next.reduce((s, x) => s + x.count, 0);
  const full = written.length >= MOST;
  const canAdd = Boolean(book) && next.length > 0 && !full;

  const restart = (word: string) => {
    setWritten([word]);
    setCommonest([false]);
    setAdded(null);
  };
  const add = (how: "commonest" | "random") => {
    if (!book) return;
    const word = how === "commonest" ? mostLikely(book.follows, last) : drawNext(book.follows, last, random.current());
    if (word === null) return;
    setWritten((w) => [...w, word]);
    setCommonest((c) => [...c, how === "commonest"]);
    setAdded(word);
  };

  const shown = next.slice(0, BARS);
  /** The commonest next word's count, which fills the width the bars have. */
  const most = shown[0]?.count ?? 1;
  // The label column is as wide as the longest word shown needs, up to almost half the width.
  const longest = Math.max(0, ...shown.map((x) => Array.from(x.word).length));
  const labelW = Math.min(width * 0.45, Math.max(80, 12 + longest * 7.6));
  const barMax = Math.max(60, width - labelW - 96);
  const otherWords = next.length - shown.length;
  const others =
    otherWords > 0
      ? `and ${group(otherWords)} other ${otherWords === 1 ? "word" : "words"}, ${times(total - shown.reduce((s, x) => s + x.count, 0))}`
      : null;
  // The line for the words not shown starts under the bars when it fits there, and at the left edge when not.
  const othersX = others && labelW + others.length * 6.6 <= width ? labelW : 0;
  // One row more than the bars, kept for that line, so that the figure keeps its height as words are added.
  const height = 4 + (BARS + 1) * ROW;
  const atStart = written.length === 1 && written[0] === (startWord ?? start);

  let note: string;
  if (failed) note = "The book could not be read. Reload the page to try again.";
  else if (!book) note = "Reading the book…";
  else if (startWord === null) note = "Type one word to start from.";
  else if (!known) note = `${quoted(startWord)} is not in the book, so the writer cannot start from it. Try another word.`;
  else
    note =
      (added ? `Added ${quoted(added)}. ` : "") +
      writerWords(book, written, commonest) +
      (full ? ` That is the most this figure writes; start again to write more.` : "");

  let heading: string;
  if (failed) heading = "The book could not be read";
  else if (!book) heading = "Reading the book…";
  else if (total === 0) heading = known ? `Nothing in the book comes after ${quoted(last)}` : `${quoted(last)} is not in the book`;
  else if (next.length === 1) heading = `After ${quoted(last)}: ${times(total)}, ${total === 1 ? "" : "always "}${quoted(next[0]!.word)}`;
  else heading = `After ${quoted(last)}: ${times(total)}, ${group(next.length)} different words`;

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div ref={ref} className="flex w-full flex-col gap-2">
          <p className="tabular text-sm font-semibold text-ink">{heading}</p>
          <svg
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descId}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="tabular block max-w-full font-sans"
          >
            {shown.map((x, i) => {
              const y = i * ROW;
              const len = Math.max(2, (x.count / most) * barMax);
              return (
                <g key={x.word}>
                  <text x={labelW - 8} y={y + ROW / 2} dy="0.32em" textAnchor="end" fontSize={13} className="fill-ink">
                    {x.word}
                  </text>
                  <rect x={labelW} y={y + 4} width={len} height={ROW - 8} rx={3} className={i === 0 ? "fill-fig-gradient" : "fill-fig-vector"} />
                  <text x={labelW + len + 6} y={y + ROW / 2} dy="0.32em" fontSize={12} className="fill-ink-muted">
                    {`${group(x.count)}, ${percent(x.count, total)}`}
                  </text>
                </g>
              );
            })}
            {others ? (
              <text x={othersX} y={shown.length * ROW + ROW / 2} dy="0.32em" fontSize={12} className="fill-ink-muted">
                {others}
              </text>
            ) : null}
          </svg>
        </div>
      )}
      controls={
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={`${uid}-start`} className="text-sm font-medium text-ink">
                Start from the word
              </label>
              <input
                id={`${uid}-start`}
                value={typed}
                onChange={(e) => {
                  setTyped(e.target.value);
                  const w = tokens(e.target.value);
                  if (w.length === 1) restart(w[0]!);
                }}
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
                className={clsx(inputClasses, "h-9 w-40 font-mono")}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => startWord && restart(startWord)} disabled={!book || !known || atStart}>
              Start again
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => add("commonest")} disabled={!canAdd || !known}>
              Add the commonest next word
            </Button>
            <Button size="sm" variant="secondary" onClick={() => add("random")} disabled={!canAdd || !known}>
              Add a random next word
            </Button>
          </div>
          <p className="rounded-md bg-surface px-3 py-2 font-mono text-sm leading-relaxed text-ink">{written.join(" ")}</p>
          <p className="tabular text-sm text-ink" aria-live="polite">
            {note}
          </p>
          <p className="text-sm text-ink-muted">
            The bars show the commonest next words, at most eight, the commonest first and in its own colour. Each bar is in proportion
            to the count of its word, and beside it are that count and its share of all the words that follow; a line under the bars
            counts the words not shown. A random word is drawn from all the words that follow, not only those shown, with a chance in
            proportion to its count.
          </p>
        </>
      }
      table={{
        caption:
          book && total > 0
            ? next.length === 1
              ? `The only word that follows ${quoted(last)}.`
              : next.length <= TABLE_ROWS
                ? `The ${group(next.length)} words that follow ${quoted(last)}, the commonest first.`
                : `The ${group(TABLE_ROWS)} words that most often follow ${quoted(last)}, of ${group(next.length)}.`
            : undefined,
        columns: ["Next word", "Times", "Share"],
        rows: next.slice(0, TABLE_ROWS).map((x) => [x.word, group(x.count), percent(x.count, total)]),
      }}
    />
  );
}
