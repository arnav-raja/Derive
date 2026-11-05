"use client";

import { clsx } from "clsx";
import { useId, useMemo, useState } from "react";

import { FigureFrame, PredictPanel, useWidth, type PredictPhase } from "./shell";

/*
 * A rule drawn as arrows from inputs to outputs. Whether it is a function,
 * one-to-one or onto is worked out from the arrows themselves, and the
 * elements that decide it are pointed out.
 */

type Property = "function" | "injective" | "surjective" | "bijective";

/** What the verdict says when the property holds, and when it does not. */
const VERDICTS: Record<Property, [string, string]> = {
  function: ["It is a function: every input has exactly one output.", "It is not a function."],
  injective: ["It is one-to-one: no two inputs share an output.", "It is not one-to-one."],
  surjective: ["It is onto: every output is reached.", "It is not onto."],
  bijective: ["It is one-to-one and onto, so it can be undone.", "It is not both one-to-one and onto, so it cannot be undone."],
};

export type Analysis = {
  isFunction: boolean;
  injective: boolean;
  surjective: boolean;
  noOutput: number[];
  manyOutputs: number[];
  shared: number[];
  unreached: number[];
};

export function analyse(fromCount: number, toCount: number, arrows: [number, number][]): Analysis {
  const out = Array.from({ length: fromCount }, () => new Set<number>());
  const into = Array.from({ length: toCount }, () => new Set<number>());
  for (const [a, b] of arrows) {
    out[a]?.add(b);
    into[b]?.add(a);
  }
  const noOutput = out.flatMap((s, i) => (s.size === 0 ? [i] : []));
  const manyOutputs = out.flatMap((s, i) => (s.size > 1 ? [i] : []));
  const shared = into.flatMap((s, i) => (s.size > 1 ? [i] : []));
  const unreached = into.flatMap((s, i) => (s.size === 0 ? [i] : []));
  const isFunction = noOutput.length === 0 && manyOutputs.length === 0;
  return { isFunction, injective: isFunction && shared.length === 0, surjective: unreached.length === 0, noOutput, manyOutputs, shared, unreached };
}

function holds(a: Analysis, p: Property): boolean {
  if (p === "function") return a.isFunction;
  if (p === "injective") return a.injective;
  if (p === "surjective") return a.isFunction && a.surjective;
  return a.injective && a.surjective;
}

function list(labels: string[], idx: number[]): string {
  const names = idx.map((i) => labels[i]!);
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function MappingDiagram({
  title,
  description,
  from,
  to,
  arrows: initial,
  fromLabel = "Inputs",
  toLabel = "Outputs",
  editable = false,
  properties = true,
  predict,
  syms,
}: {
  title: string;
  description: string;
  from: string[];
  to: string[];
  /** Pairs of positions: [input, output]. */
  arrows: [number, number][];
  fromLabel?: string;
  toLabel?: string;
  /** Let the learner add and remove arrows. */
  editable?: boolean;
  /** List whether the rule is a function, one-to-one and onto; off where that would answer a question. */
  properties?: boolean;
  predict?: { prompt: string; property: Property };
  syms?: { from?: (string | null)[]; to?: (string | null)[] };
}) {
  const uid = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [arrows, setArrows] = useState<[number, number][]>(initial);
  const [selected, setSelected] = useState<{ side: "from" | "to"; i: number } | null>(null);
  const [phase, setPhase] = useState<PredictPhase>("asking");
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const a = useMemo(() => analyse(from.length, to.length, arrows), [from.length, to.length, arrows]);

  const rows = Math.max(from.length, to.length);
  const rowH = 36;
  const height = rows * rowH + 56;
  const leftX = Math.max(90, width * 0.22);
  const rightX = width - Math.max(90, width * 0.22);
  const yOf = (i: number, n: number) => 44 + (i + 0.5) * ((rows * rowH) / n);
  const revealed = !predict || phase === "revealed";

  const toggle = (i: number, j: number) =>
    setArrows((prev) => (prev.some(([x, y]) => x === i && y === j) ? prev.filter(([x, y]) => !(x === i && y === j)) : [...prev, [i, j]]));

  const choose = (side: "from" | "to", i: number) => {
    if (editable && side === "to" && selected?.side === "from") {
      toggle(selected.i, i);
      return;
    }
    setSelected(selected?.side === side && selected.i === i ? null : { side, i });
  };

  const lit = (i: number, j: number) => selected && ((selected.side === "from" && selected.i === i) || (selected.side === "to" && selected.i === j));
  const marker = `${uid}-arrow`.replace(/[^a-zA-Z0-9_-]/g, "");

  // The marks on the elements that decide the properties are hidden with the properties themselves.
  const evidence = new Set<string>(
    revealed && properties
      ? [...a.noOutput.map((i) => `f${i}`), ...a.manyOutputs.map((i) => `f${i}`), ...a.shared.map((i) => `t${i}`), ...a.unreached.map((i) => `t${i}`)]
      : [],
  );

  const findings = [
    a.noOutput.length ? `${list(from, a.noOutput)} ${a.noOutput.length === 1 ? "has" : "have"} no output` : null,
    a.manyOutputs.length ? `${list(from, a.manyOutputs)} ${a.manyOutputs.length === 1 ? "has" : "have"} more than one output` : null,
    a.shared.length ? `${list(to, a.shared)} ${a.shared.length === 1 ? "is" : "are"} reached from more than one input` : null,
    a.unreached.length ? `${list(to, a.unreached)} ${a.unreached.length === 1 ? "is" : "are"} never reached` : null,
  ].filter(Boolean) as string[];

  const outputsOf = (i: number) => arrows.filter(([x]) => x === i).map(([, y]) => to[y]!);

  return (
    <FigureFrame
      title={title}
      description={description}
      predict={
        predict ? (
          <PredictPanel
            prompt={predict.prompt}
            phase={phase}
            canLock={answer !== null}
            onLock={() => setPhase("locked")}
            onReveal={() => setPhase("revealed")}
            onReset={() => {
              setPhase("asking");
              setAnswer(null);
            }}
            input={
              <fieldset className="flex gap-2">
                <legend className="sr-only">Your prediction</legend>
                {(["yes", "no"] as const).map((v) => (
                  <label key={v} className={clsx("cursor-pointer rounded-md border px-3 py-1 text-sm", answer === v ? "border-accent bg-surface text-accent-strong" : "border-rule bg-surface text-ink")}>
                    <input type="radio" name={`${uid}-predict`} className="sr-only" checked={answer === v} disabled={phase !== "asking"} onChange={() => setAnswer(v)} />
                    {v === "yes" ? "Yes, it is" : "No, it is not"}
                  </label>
                ))}
              </fieldset>
            }
            verdict={
              <p>
                {VERDICTS[predict.property][holds(a, predict.property) ? 0 : 1]}{" "}
                {(answer === "yes") === holds(a, predict.property) ? "Your prediction was right." : "Your prediction was not."}{" "}
                {findings.length ? `The evidence: ${findings.join("; ")}.` : "No input or output breaks the rule."}
              </p>
            }
          />
        ) : null
      }
      picture={({ titleId, descId }) => (
        <div ref={ref} className="w-full">
          <svg role="img" aria-labelledby={titleId} aria-describedby={descId} width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block max-w-full font-sans">
            <defs>
              <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="fill-fig-axis" />
              </marker>
            </defs>
            <text x={leftX} y={18} textAnchor="middle" className="fill-ink text-[13px] font-semibold">
              {fromLabel}
            </text>
            <text x={rightX} y={18} textAnchor="middle" className="fill-ink text-[13px] font-semibold">
              {toLabel}
            </text>
            <rect x={leftX - 70} y={30} width={140} height={rows * rowH + 20} rx={24} className="fill-inset stroke-rule" />
            <rect x={rightX - 70} y={30} width={140} height={rows * rowH + 20} rx={24} className="fill-inset stroke-rule" />
            {arrows.map(([i, j], k) => {
              const y1 = yOf(i, from.length);
              const y2 = yOf(j, to.length);
              const x1 = leftX + 40;
              const x2 = rightX - 44;
              const on = lit(i, j);
              return (
                <path
                  key={`${i}-${j}-${k}`}
                  d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
                  className={clsx("fill-none", on ? "stroke-accent" : "stroke-fig-axis")}
                  strokeWidth={on ? 2.5 : 1.5}
                  markerEnd={`url(#${marker})`}
                />
              );
            })}
            {from.map((label, i) => (
              <g key={`f${i}`} data-sym={syms?.from?.[i] ?? undefined} onPointerDown={() => choose("from", i)} className="cursor-pointer">
                <circle cx={leftX + 40} cy={yOf(i, from.length)} r={5} className={selected?.side === "from" && selected.i === i ? "fill-accent" : "fill-fig-vector"} />
                <text x={leftX + 30} y={yOf(i, from.length)} dy="0.32em" textAnchor="end" className={clsx("text-[13px]", evidence.has(`f${i}`) ? "fill-warning font-semibold" : "fill-ink")}>
                  {label}
                  {evidence.has(`f${i}`) ? " !" : ""}
                </text>
              </g>
            ))}
            {to.map((label, j) => (
              <g key={`t${j}`} data-sym={syms?.to?.[j] ?? undefined} onPointerDown={() => choose("to", j)} className="cursor-pointer">
                <circle cx={rightX - 40} cy={yOf(j, to.length)} r={5} className={selected?.side === "to" && selected.i === j ? "fill-accent" : "fill-fig-mass"} />
                <text x={rightX - 30} y={yOf(j, to.length)} dy="0.32em" className={clsx("text-[13px]", evidence.has(`t${j}`) ? "fill-warning font-semibold" : "fill-ink")}>
                  {label}
                  {evidence.has(`t${j}`) ? " !" : ""}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
      controls={
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["from", "to"] as const).map((side) => (
              <div key={side} className="flex flex-col gap-1">
                <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{side === "from" ? fromLabel : toLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {(side === "from" ? from : to).map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={selected?.side === side && selected.i === i}
                      onClick={() => choose(side, i)}
                      className={clsx(
                        "rounded-md border px-2 py-0.5 text-sm",
                        selected?.side === side && selected.i === i ? "border-accent bg-accent-soft text-accent-strong" : "border-rule text-ink hover:border-rule-strong",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="min-h-5 text-sm text-ink" aria-live="polite">
            {selected
              ? selected.side === "from"
                ? `${from[selected.i]} goes to ${outputsOf(selected.i).join(" and ") || "nothing"}.${editable ? " Now choose an output to add or remove an arrow." : ""}`
                : `${to[selected.i]} comes from ${arrows.filter(([, y]) => y === selected.i).map(([x]) => from[x]).join(" and ") || "nothing"}.`
              : editable
                ? "Choose an input, then an output, to add or remove an arrow."
                : "Choose an input or an output to follow its arrows."}
          </p>
          {revealed && properties ? (
            <ul className="flex flex-col gap-0.5 text-sm text-ink">
              <li>
                <span className="font-semibold">A function: </span>
                {a.isFunction ? "yes" : "no"}
              </li>
              <li>
                <span className="font-semibold">One-to-one: </span>
                {a.isFunction ? (a.injective ? "yes" : "no") : "only a function can be"}
              </li>
              <li>
                <span className="font-semibold">Onto: </span>
                {a.surjective ? "yes" : "no"}
              </li>
              {findings.length ? <li className="text-ink-muted">{findings.join("; ")}.</li> : null}
            </ul>
          ) : null}
        </>
      }
      table={{
        columns: [fromLabel, toLabel],
        rows: from.map((label, i) => [label, outputsOf(i).join(", ") || "(none)"]),
      }}
    />
  );
}
