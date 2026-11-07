"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { LockIcon } from "@/components/ui/icons";

import { byFirst, choicesWords, groupBySet, letters, maxChosen, orderedChoices, setText } from "./choices";
import { FigureFrame, RangeControl } from "./shell";

/*
 * Every ordered choice of k letters from the first n capital letters, in the order the product
 * rule makes them, a line for each first letter. A switch gathers them by the set of letters each
 * holds, so that each set shows its k! orders together. The switch can stay closed until the
 * exercise it would answer is done.
 */

const MAX_N = 6;

function Chip({ letters: word }: { letters: string[] }) {
  return (
    <span className="tabular rounded-sm border border-rule bg-surface px-1.5 py-0.5 font-mono text-sm leading-5 text-ink">
      {word.join("")}
    </span>
  );
}

export function OrderedChoices({
  title,
  description,
  n: initialN = 4,
  k: initialK = 2,
  maxN = MAX_N,
  groupsLocked = false,
  lockedNote,
}: {
  title: string;
  description: string;
  /** How many letters there are to begin with, from 2 to 6. */
  n?: number;
  /** How many are chosen to begin with. */
  k?: number;
  /** The most letters the control reaches, at most 6. */
  maxN?: number;
  /** Keeps the switch that groups the choices by set closed until the exercise it would answer is done. */
  groupsLocked?: boolean;
  /** Says what opens it. */
  lockedNote?: string;
}) {
  const top = Math.min(MAX_N, Math.max(2, Math.round(maxN)));
  const [n, setN] = useState(Math.min(top, Math.max(2, Math.round(initialN))));
  const [k, setK] = useState(Math.min(maxChosen(n), Math.max(1, Math.round(initialK))));
  const [grouped, setGrouped] = useState(false);
  const showGroups = grouped && !groupsLocked;

  const choices = useMemo(() => orderedChoices(letters(n), k), [n, k]);
  const lines = useMemo(() => byFirst(choices), [choices]);
  const groups = useMemo(() => groupBySet(choices), [choices]);

  const changeN = (next: number) => {
    setK((c) => Math.min(c, maxChosen(next)));
    setN(next);
  };

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div role="img" aria-labelledby={titleId} aria-describedby={descId} className="w-full">
          {showGroups ? (
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <div key={g.set.join("")} className="flex max-w-full flex-col gap-1 rounded-md border border-fig-gradient bg-inset/60 px-2 py-1.5">
                  <span className="text-xs font-semibold text-ink-muted">{setText(g.set)}</span>
                  <span className="flex flex-wrap gap-1">
                    {g.orders.map((c) => (
                      <Chip key={c.join("")} letters={c} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {lines.map((line) => (
                <div key={line.first} className="flex flex-wrap gap-1">
                  {line.choices.map((c) => (
                    <Chip key={c.join("")} letters={c} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      controls={
        <>
          <RangeControl label="Letters" min={2} max={top} step={1} value={n} onChange={changeN} display={`${n}, A to ${letters(n)[n - 1]}`} />
          <RangeControl label="Letters chosen" min={1} max={maxChosen(n)} step={1} value={k} onChange={setK} />
          {groupsLocked ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <LockIcon aria-hidden="true" className="size-4 shrink-0" />
              {lockedNote ?? "Grouping by set opens once you have answered the question below."}
            </p>
          ) : (
            <div>
              <Button size="sm" variant={grouped ? "primary" : "secondary"} aria-pressed={grouped} onClick={() => setGrouped((g) => !g)}>
                Group them by the letters they hold
              </Button>
            </div>
          )}
          <p className="text-sm text-ink" aria-live="polite">
            {choicesWords(n, k, showGroups)}
          </p>
          {showGroups ? (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <span aria-hidden="true" className="size-3.5 shrink-0 rounded-xs border border-fig-gradient bg-inset" />
              One set of letters, with all its orders
            </p>
          ) : (
            <p className="text-sm text-ink-muted">Each line holds the ordered choices with one first letter.</p>
          )}
        </>
      }
      table={
        showGroups
          ? {
              columns: ["Set", "Its orders", "How many"],
              rows: groups.map((g) => [setText(g.set), g.orders.map((c) => c.join("")).join(", "), g.orders.length]),
            }
          : {
              columns: ["First letter", "Ordered choices", "How many"],
              rows: lines.map((l) => [l.first, l.choices.map((c) => c.join("")).join(", "), l.choices.length]),
            }
      }
    />
  );
}
