"use client";

import { clsx } from "clsx";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

import { formatValue, superscript } from "./expr";
import {
  add,
  compare,
  divide,
  exactDecimal,
  exactValue,
  groupDecimal,
  nextDown,
  nextUp,
  parseLiteral,
  powerOfTwo,
  pythonRepr,
  subtract,
  toNumber,
  type Ratio,
} from "./floats";
import { FigureFrame, useWidth } from "./shell";

/*
 * A close-up of the number line, so close that the floats show as separate
 * ticks. A typed decimal is marked where it really is, and the float Python
 * stores for it is marked on its tick. With a sum, the exact sum of the two
 * stored floats is marked too, with the float Python rounds it to. Every
 * value is exact: JavaScript's numbers are the same floats as Python's.
 */

const MARGIN = 20;
const NEIGHBOURS = 3;
const HEIGHT = 150;
const AXIS_Y = 76;

type Reading = { ok: true; text: string; value: Ratio; float: number } | { ok: false; message: string };

function read(text: string): Reading {
  const value = parseLiteral(text);
  if (!value) return { ok: false, message: "Type one number, as Python writes it, such as 0.1, 2.5e-3 or 1e16." };
  const float = Number(text.trim().replaceAll("_", ""));
  if (!Number.isFinite(float)) return { ok: false, message: "That is too big for a float: Python gives inf, short for infinity." };
  if (float === 0 && value.num !== 0n) return { ok: false, message: "That is too small for a float: Python stores 0.0." };
  return { ok: true, text: text.trim(), value, float };
}

/** A whole number with its digits grouped, or a fraction over a power of two: 3,602,879,701,896,397 / 2⁵⁵. */
function fractionText(r: Ratio): string {
  const top = groupDecimal(r.num.toString());
  if (r.den === 1n) return top;
  return `${top} / 2${superscript(powerOfTwo(r.den) ?? 0)}`;
}

/** An exact decimal, grouped, and shortened when it is very long. */
function longDecimal(r: Ratio): string {
  const text = exactDecimal(r);
  const [, fraction = ""] = text.split(".");
  if (fraction.length <= 120) return groupDecimal(text);
  const cut = text.slice(0, text.indexOf(".") + 61);
  return `${groupDecimal(cut)}… (${groupDecimal(String(fraction.length))} digits after the point in all)`;
}

/** The floats around x, with their places on the line measured in gaps above x. */
function neighbours(x: number) {
  const below: number[] = [];
  const above: number[] = [];
  let lo = x;
  let hi = x;
  for (let i = 0; i < NEIGHBOURS; i++) {
    lo = nextDown(lo);
    hi = nextUp(hi);
    below.unshift(lo);
    above.push(hi);
  }
  const gap = nextUp(x) - x;
  const floats = [...below, x, ...above].filter((v) => Number.isFinite(v));
  // Neighbouring floats differ by an exact power of two, so these places are exact.
  return { gap, ticks: floats.map((v) => ({ v, at: (v - x) / gap })) };
}

/** Where an exact value sits, in gaps from x. */
function placeOf(value: Ratio, x: number, gap: number): number {
  return toNumber(divide(subtract(value, exactValue(x)), exactValue(gap)));
}

/** How many floats lie between a and b, counting b: the number of steps up or down from a. */
function floatSteps(a: number, b: number): number | null {
  if (a === b) return 0;
  if (Math.sign(a) !== Math.sign(b) || a === 0 || b === 0) return null;
  const view = new DataView(new ArrayBuffer(16));
  view.setFloat64(0, Math.abs(a));
  view.setFloat64(8, Math.abs(b));
  const steps = Number(view.getBigUint64(8) - view.getBigUint64(0));
  return a < 0 ? -steps : steps;
}

function count(n: number, one: string, many: string) {
  return `${n === 1 ? "one" : groupDecimal(String(n))} ${n === 1 ? one : many}`;
}

type Mark = { at: number; label: string; kind: "written" | "float" | "exact" | "compare" };

function NumberLine({
  width,
  ticks,
  marks,
  gapLabel,
  titleId,
  descId,
}: {
  width: number;
  ticks: { v: number; at: number }[];
  marks: Mark[];
  gapLabel?: string;
  titleId: string;
  descId: string;
}) {
  const lo = Math.min(...ticks.map((t) => t.at), ...marks.map((m) => m.at)) - 0.6;
  const hi = Math.max(...ticks.map((t) => t.at), ...marks.map((m) => m.at)) + 0.6;
  const inner = Math.max(200, width - 2 * MARGIN);
  const xOf = (at: number) => MARGIN + ((at - lo) / (hi - lo)) * inner;
  const clampLabel = (x: number, w: number, anchor: "middle" | "start" | "end") => {
    const left = anchor === "middle" ? x - w / 2 : anchor === "start" ? x : x - w;
    const shift = Math.max(MARGIN / 2 - left, 0) + Math.min(MARGIN / 2 + inner + MARGIN / 2 - (left + w), 0);
    return x + shift;
  };
  const above = marks.filter((m) => m.kind === "written" || m.kind === "exact");
  const below = marks.filter((m) => m.kind === "float" || m.kind === "compare");
  const textW = (s: string) => s.length * 6.6;
  const [first, second] = below;
  const together = first && second && Math.abs(first.at - second.at) < 1e-12;

  return (
    <svg
      role="img"
      aria-labelledby={titleId}
      aria-describedby={descId}
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className="block max-w-full font-sans"
    >
      <line x1={MARGIN / 2} x2={MARGIN * 1.5 + inner} y1={AXIS_Y} y2={AXIS_Y} className="stroke-fig-axis" strokeWidth={1.5} />
      {ticks.map((t) => (
        <line key={t.v} x1={xOf(t.at)} x2={xOf(t.at)} y1={AXIS_Y - 9} y2={AXIS_Y + 9} className="stroke-fig-axis" strokeWidth={1.5} />
      ))}
      {gapLabel && ticks.some((t) => t.at === 1) ? (
        <g>
          <path
            d={`M${xOf(0)},${AXIS_Y + 50} v-6 H${xOf(1)} v6`}
            className="fill-none stroke-ink-muted"
            strokeWidth={1}
            transform={`translate(0 ${-6})`}
          />
          <text
            x={clampLabel((xOf(0) + xOf(1)) / 2, textW(gapLabel), "middle")}
            y={AXIS_Y + 62}
            textAnchor="middle"
            className="tabular fill-ink-muted text-[12px]"
          >
            {gapLabel}
          </text>
        </g>
      ) : null}
      {above.map((m) => {
        const x = xOf(m.at);
        return (
          <g key={m.label}>
            <line x1={x} x2={x} y1={30} y2={AXIS_Y - 12} className="stroke-ink" strokeWidth={1.5} />
            <path d={`M${x},${AXIS_Y - 4} l-5,-9 h10 z`} className="fill-ink" />
            <text
              x={clampLabel(x, textW(m.label), "middle")}
              y={20}
              textAnchor="middle"
              paintOrder="stroke"
              strokeWidth={4}
              strokeLinejoin="round"
              className="tabular fill-ink stroke-surface text-[12px] font-semibold"
            >
              {m.label}
            </text>
          </g>
        );
      })}
      {below.map((m, i) => {
        const x = xOf(m.at);
        // Two labels one gap apart are written away from each other, so they never overlap.
        const other = below[1 - i];
        const anchor: "middle" | "start" | "end" =
          together || !other ? "middle" : m.at < other.at ? "end" : "start";
        const tx = anchor === "end" ? x + 6 : anchor === "start" ? x - 6 : x;
        const label = together && i === 0 ? `${m.label}, ${second!.label}` : m.label;
        if (together && i === 1) return null;
        return (
          <g key={m.label}>
            {m.kind === "float" ? (
              <circle cx={x} cy={AXIS_Y} r={6} className="fill-accent stroke-surface" strokeWidth={1.5} />
            ) : (
              <rect x={x - 5.5} y={AXIS_Y - 5.5} width={11} height={11} className="fill-fig-gradient stroke-surface" strokeWidth={1.5} />
            )}
            <text
              x={clampLabel(tx, textW(label), anchor)}
              y={AXIS_Y + 28}
              textAnchor={anchor}
              paintOrder="stroke"
              strokeWidth={4}
              strokeLinejoin="round"
              className={clsx("tabular stroke-surface text-[12px] font-semibold", m.kind === "float" ? "fill-accent-strong" : "fill-fig-gradient")}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function FloatLine({
  title,
  description,
  value = "0.1",
  presets = [],
  sum,
  compare: compareTo,
}: {
  title: string;
  description: string;
  /** The number shown first, written as in Python. */
  value?: string;
  /** Numbers offered as buttons, written as in Python. */
  presets?: string[];
  /** Show a sum instead: the two numbers that are added, written as in Python. */
  sum?: [string, string];
  /** With a sum, the decimal that the result is compared with. */
  compare?: string;
}) {
  const uid = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [text, setText] = useState(value);
  const [aText, setA] = useState(sum?.[0] ?? "0.1");
  const [bText, setB] = useState(sum?.[1] ?? "0.2");
  const [cText, setC] = useState(compareTo ?? "0.3");

  if (sum) {
    const a = read(aText);
    const b = read(bText);
    const c = read(cText);
    const problem = [a, b, c].find((r) => !r.ok) as { ok: false; message: string } | undefined;
    let line: { ticks: { v: number; at: number }[]; marks: Mark[] } | null = null;
    let words = null;
    let rows: (string | number)[][] = [];
    if (!problem && a.ok && b.ok && c.ok) {
      const exactSum = add(exactValue(a.float), exactValue(b.float));
      const result = a.float + b.float;
      if (!Number.isFinite(result)) {
        words = <p>The sum is too big for a float, so Python gives inf.</p>;
      } else {
        const { gap, ticks } = neighbours(result);
        const sumAt = placeOf(exactSum, result, gap);
        const steps = floatSteps(result, c.float);
        const cAt = (c.float - result) / gap;
        const rounded = compare(exactSum, exactValue(result)) !== 0;
        const lower = nextDown(result);
        const tie =
          rounded &&
          compare(subtract(exactSum, exactValue(lower)), subtract(exactValue(result), exactSum)) === 0;
        const tieUp =
          rounded &&
          compare(subtract(exactValue(nextUp(result)), exactSum), subtract(exactSum, exactValue(result))) === 0;
        const expression = `${a.text} + ${b.text}`;
        const marks: Mark[] = [
          { at: 0, label: `${expression} in Python`, kind: "float" },
          ...(Math.abs(cAt) <= NEIGHBOURS + 0.5 ? [{ at: cAt, label: `${c.text} as a float`, kind: "compare" as const }] : []),
        ];
        if (rounded) marks.push({ at: sumAt, label: "the exact sum", kind: "exact" });
        line = { ticks, marks };
        words = (
          <>
            <p>
              The floats for {a.text} and {b.text} add up exactly to{" "}
              <span className="font-mono break-words">{longDecimal(exactSum)}</span>
              {rounded ? (
                <>
                  , which is not a float. Python stores the nearest float
                  {tie || tieUp ? ", and this sum lies exactly halfway between two, so it takes the one whose last binary digit is 0" : ""}:{" "}
                  <span className="font-mono break-words">{longDecimal(exactValue(result))}</span>.
                </>
              ) : (
                <>, which is itself a float, so nothing is rounded.</>
              )}{" "}
              <code className="font-mono">print({expression})</code> shows <code className="font-mono">{pythonRepr(result)}</code>.
            </p>
            <p>
              {steps === 0 ? (
                <>
                  That is the very float Python stores for {c.text}, so <code className="font-mono">{expression} == {c.text}</code> is{" "}
                  <code className="font-mono">True</code>.
                </>
              ) : (
                <>
                  The float for {c.text} is <span className="font-mono break-words">{longDecimal(exactValue(c.float))}</span>
                  {steps === null
                    ? ", on the other side of 0"
                    : `, ${count(Math.abs(steps), "float", "floats")} ${steps < 0 ? "below" : "above"}`}
                  , so <code className="font-mono">{expression} == {c.text}</code> is <code className="font-mono">False</code>.
                </>
              )}
            </p>
          </>
        );
        rows = [
          ["The exact sum of the two floats", longDecimal(exactSum), groupDecimal(sumAt.toFixed(2))],
          [`${expression} in Python`, longDecimal(exactValue(result)), "0"],
          [`${c.text} as a float`, longDecimal(exactValue(c.float)), Math.abs(cAt) < 1e6 ? groupDecimal(cAt.toFixed(2)) : "far off the line"],
        ];
      }
    }
    return (
      <FigureFrame
        title={title}
        description={description}
        picture={({ titleId, descId }) => (
          <div ref={ref} className="w-full">
            {line ? (
              <NumberLine width={width} ticks={line.ticks} marks={line.marks} titleId={titleId} descId={descId} />
            ) : (
              <p className="py-6 text-sm text-ink-muted">The line appears once all three numbers can be read.</p>
            )}
          </div>
        )}
        controls={
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["First number", aText, setA],
                  ["Second number", bText, setB],
                  ["Compared with", cText, setC],
                ] as const
              ).map(([label, v, set], i) => (
                <div key={label} className="flex flex-col gap-1">
                  <label htmlFor={`${uid}-${i}`} className="text-sm font-medium text-ink">
                    {label}
                  </label>
                  <input
                    id={`${uid}-${i}`}
                    value={v}
                    onChange={(e) => set(e.target.value)}
                    inputMode="decimal"
                    autoComplete="off"
                    spellCheck={false}
                    className={clsx(inputClasses, "h-9 font-mono")}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink" aria-live="polite">
              {problem ? <p>{problem.message}</p> : words}
            </div>
          </>
        }
        table={
          rows.length
            ? {
                columns: ["Point", "Exact value", "Place on the line, in gaps from the result"],
                rows,
              }
            : undefined
        }
      />
    );
  }

  const r = read(text);
  let line: { ticks: { v: number; at: number }[]; marks: Mark[]; gapLabel: string } | null = null;
  let words = null;
  let rows: (string | number)[][] = [];
  if (r.ok) {
    const stored = exactValue(r.float);
    const exact = compare(stored, r.value) === 0;
    const { gap, ticks } = neighbours(r.float);
    const writtenAt = placeOf(r.value, r.float, gap);
    const off = toNumber(subtract(stored, r.value));
    const isInt = !/[.eE]/.test(r.text);
    line = {
      ticks,
      marks: [
        { at: writtenAt, label: exact ? `${r.text} as written, held exactly` : `${r.text} as written`, kind: "written" },
        { at: 0, label: "the float Python stores", kind: "float" },
      ],
      gapLabel: `neighbouring floats: ${formatValue(gap)} apart`,
    };
    words = (
      <>
        <p>
          {exact ? (
            <>
              <code className="font-mono">{r.text}</code> is held exactly. The float is {fractionText(stored)}
              {stored.den === 1n ? ", a whole number." : ", a whole number divided by a power of two."}
            </>
          ) : (
            <>
              <code className="font-mono">{r.text}</code> cannot be held exactly. The nearest float is {fractionText(stored)}, which is exactly{" "}
              <span className="font-mono break-words">{longDecimal(stored)}</span>, about {formatValue(Math.abs(off))} {off > 0 ? "more" : "less"}{" "}
              than {r.text}.
            </>
          )}{" "}
          Neighbouring floats here are {formatValue(gap)} apart.
        </p>
        <p>
          <code className="font-mono">print({r.text})</code> shows <code className="font-mono">{pythonRepr(r.float)}</code>
          {exact ? "." : ", the shortest decimal that leads back to this float."}
          {isInt ? ` Written without a point or an e, ${r.text} is an int in Python, which is always exact; the figure shows it as a float.` : ""}
        </p>
      </>
    );
    rows = [
      [`${r.text} as written`, groupDecimal(exactDecimal(r.value)), groupDecimal(writtenAt.toFixed(2))],
      ...ticks.map((t) => [
        t.at === 0 ? "The float Python stores" : t.at < 0 ? "A float below" : "A float above",
        longDecimal(exactValue(t.v)),
        groupDecimal(t.at.toFixed(2)),
      ]),
    ];
  }

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div ref={ref} className="w-full">
          {line ? (
            <NumberLine width={width} ticks={line.ticks} marks={line.marks} gapLabel={line.gapLabel} titleId={titleId} descId={descId} />
          ) : (
            <p className="py-6 text-sm text-ink-muted">The line appears once the number can be read.</p>
          )}
        </div>
      )}
      controls={
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${uid}-in`} className="text-sm font-medium text-ink">
              A number, written as in Python
            </label>
            <input
              id={`${uid}-in`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={!r.ok}
              className={clsx(inputClasses, "h-9 max-w-xs font-mono")}
            />
          </div>
          {presets.length ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Numbers to try">
              {presets.map((p) => (
                <Button key={p} size="sm" variant={p === text.trim() ? "primary" : "secondary"} onClick={() => setText(p)} aria-pressed={p === text.trim()}>
                  <span className="font-mono">{p}</span>
                </Button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-col gap-2 text-sm leading-relaxed text-ink" aria-live="polite">
            {r.ok ? words : <p>{r.message}</p>}
          </div>
        </>
      }
      table={
        rows.length
          ? { columns: ["Point", "Exact value", "Place on the line, in gaps from the float"], rows }
          : undefined
      }
    />
  );
}
