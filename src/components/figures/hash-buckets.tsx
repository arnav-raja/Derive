"use client";

import { clsx } from "clsx";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

import {
  addKey,
  addWords,
  fit,
  keyCount,
  keysWord,
  KEY_MAX,
  listed,
  lookUp,
  lookWords,
  makeTable,
  MAX_KEYS,
  parseKey,
  randomKeys,
  tableWords,
  type HashTable,
  type Lookup,
} from "./buckets";
import { FigureFrame } from "./shell";
import { group } from "./ties";

/*
 * A hash table of whole-number keys, drawn as a grid of numbered buckets, each holding its keys in
 * the order they were added. The learner adds keys, by hand or at random, looks keys up, which
 * picks out the key's bucket and marks the keys compared, and can switch on doubling, which
 * doubles the buckets whenever a new key would make the keys outnumber them, moving every key.
 */

const RANDOM_BATCH = 5;

/** How many times, in words: "once", "twice", "3 times". */
const timesWord = (t: number) => (t === 1 ? "once" : t === 2 ? "twice" : `${t} times`);

export function HashBuckets({
  title,
  description,
  keys = [3, 11, 19, 27, 13],
  buckets = 8,
}: {
  title: string;
  description: string;
  /** The keys in the table to begin with, whole numbers from 0 to 999. */
  keys?: number[];
  /** How many buckets there are to begin with. */
  buckets?: number;
}) {
  const start = () => makeTable(keys, Math.max(1, Math.round(buckets)));
  const [table, setTable] = useState<HashTable>(start);
  const [doubling, setDoubling] = useState(false);
  const [text, setText] = useState("35");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [said, setSaid] = useState("Type a key, then add it or look it up.");
  const [draws, setDraws] = useState(1);
  const inputId = useId();
  const hintId = useId();

  const n = keyCount(table);
  const m = table.buckets.length;
  const typed = parseKey(text);
  const full = n >= MAX_KEYS;

  const hint =
    typed === null
      ? `Type a whole number from 0 to ${KEY_MAX} to add it or look it up.`
      : full
        ? `The figure holds at most ${MAX_KEYS} keys, so start again to add more. Looking keys up still works.`
        : "A whole number from 0 up is its own hash, so its bucket is its remainder on division by the number of buckets.";

  function add() {
    if (typed === null || full) return;
    const a = addKey(table, typed, doubling);
    setTable(a.table);
    setLookup(null);
    setSaid(addWords(a));
  }

  function addRandom() {
    if (full) return;
    let t = table;
    const added: number[] = [];
    const repeats: number[] = [];
    for (const k of randomKeys(draws, RANDOM_BATCH)) {
      if (keyCount(t) >= MAX_KEYS) break;
      const a = addKey(t, k, doubling);
      t = a.table;
      (a.added ? added : repeats).push(k);
    }
    setDraws((d) => d + 1);
    setTable(t);
    setLookup(null);
    const parts = [`Added ${listed(added.length ? added : repeats)} at random.`];
    if (!added.length) parts[0] = `Drew ${listed(repeats)} at random, but ${repeats.length === 1 ? "it was" : "they were all"} there already.`;
    else if (repeats.length) parts.push(`${listed(repeats)} ${repeats.length === 1 ? "was" : "were"} there already.`);
    if (t.buckets.length > m) {
      const times = Math.round(Math.log2(t.buckets.length / m));
      const moves = t.moves - table.moves;
      parts.push(
        times === 1
          ? `A new key would have made the keys outnumber the ${m} buckets, so they doubled to ${t.buckets.length} ` +
              `first, moving the ${keysWord(moves)} already stored to their new buckets.`
          : `New keys would have made the keys outnumber the buckets, so they doubled ${timesWord(times)}, to ` +
              `${t.buckets.length}, and the keys made ${group(moves)} moves to reach their new buckets.`,
      );
    }
    setSaid(parts.join(" "));
  }

  function look() {
    if (typed === null) return;
    const l = lookUp(table, typed);
    setLookup(l);
    setSaid(lookWords(l, m));
  }

  function toggle() {
    const on = !doubling;
    setDoubling(on);
    setLookup(null);
    if (!on) {
      setSaid("Doubling is off: the buckets stay as they are, however many keys are added.");
      return;
    }
    const f = fit(table);
    if (f.doublings === 0) {
      setSaid("Doubling is on: the buckets double whenever a new key would make the keys outnumber them.");
      return;
    }
    setTable(f.table);
    setSaid(
      `Doubling is on, and the ${keysWord(n)} outnumbered the ${m} buckets, so the buckets doubled ` +
        `${timesWord(f.doublings)}, to ${f.table.buckets.length}, and the keys made ` +
        `${group(f.table.moves - table.moves)} moves to reach their new buckets.`,
    );
  }

  function reset() {
    setTable(start());
    setDoubling(false);
    setLookup(null);
    setDraws(1);
    const first = start().buckets.length;
    setSaid(`Back to the keys the figure began with, in ${first} ${first === 1 ? "bucket" : "buckets"}, with doubling off.`);
  }

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div
          role="img"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="grid w-full grid-cols-[repeat(auto-fill,minmax(4.25rem,1fr))] gap-2"
        >
          {table.buckets.map((b, i) => {
            const picked = lookup?.bucket === i;
            return (
              <div
                key={i}
                className={clsx(
                  "flex min-h-16 flex-col gap-1 rounded-md border px-1.5 py-1",
                  picked ? "border-2 border-fig-gradient bg-inset" : "border-rule bg-surface",
                )}
              >
                <span className="tabular text-xs text-ink-muted">{i}</span>
                <span className="flex flex-wrap gap-1">
                  {b.map((k, p) => {
                    const compared = picked && lookup !== null && p < lookup.compared;
                    const found = compared && lookup.found && p === lookup.compared - 1;
                    return (
                      <span
                        key={k}
                        className={clsx(
                          "tabular rounded-sm border px-1 font-mono text-xs leading-5",
                          found
                            ? "border-fig-gradient bg-fig-gradient text-surface"
                            : compared
                              ? "border-fig-gradient bg-surface text-ink ring-1 ring-fig-gradient"
                              : "border-rule bg-surface text-ink",
                        )}
                      >
                        {k}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </div>
      )}
      controls={
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="text-sm font-semibold text-ink">
              Key, a whole number from 0 to {KEY_MAX}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={inputId}
                inputMode="numeric"
                autoComplete="off"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") add();
                }}
                aria-describedby={hintId}
                aria-invalid={typed === null && text.trim() !== "" ? true : undefined}
                className={clsx(inputClasses, "h-9 w-24 font-mono")}
              />
              <Button size="sm" onClick={add} disabled={typed === null || full}>
                Add it
              </Button>
              <Button size="sm" variant="secondary" onClick={look} disabled={typed === null}>
                Look it up
              </Button>
            </div>
            <p id={hintId} className="text-xs text-ink-muted">
              {hint}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={addRandom} disabled={full}>
              Add {RANDOM_BATCH} keys at random
            </Button>
            <Button size="sm" variant={doubling ? "primary" : "secondary"} aria-pressed={doubling} onClick={toggle}>
              Double the buckets
            </Button>
            <Button size="sm" variant="ghost" onClick={reset}>
              Start again
            </Button>
          </div>
          <p className="tabular text-sm text-ink" aria-live="polite">
            {said}
          </p>
          <p className="tabular text-sm text-ink-muted" aria-live="polite">
            {tableWords(table)} Doubling is {doubling ? "on" : "off"}.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3.5 shrink-0 rounded-xs border-2 border-fig-gradient bg-inset" />
              The bucket a lookup searched
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3.5 shrink-0 rounded-xs border border-fig-gradient bg-surface ring-1 ring-fig-gradient" />
              A key compared
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden="true" className="size-3.5 shrink-0 rounded-xs border border-fig-gradient bg-fig-gradient" />
              The key found
            </li>
          </ul>
        </>
      }
      table={{
        columns: ["Bucket", "Keys", "How many"],
        rows: table.buckets.map((b, i) => [String(i), b.length ? b.map(group).join(", ") : "none", b.length]),
      }}
    />
  );
}
