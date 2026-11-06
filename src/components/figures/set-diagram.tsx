"use client";

import { clsx } from "clsx";
import { useId, useMemo, useState, type PointerEvent } from "react";

import { Button } from "@/components/ui/button";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";
import { Tex } from "@/components/ui/tex";

import { compareShading, listWords, lowerFirst, parseSetExpression, regionName, regionsOf, REGIONS, sameRegions, setTex, spokenSet, type NamedSet, type Region } from "./sets";
import { FigureFrame, useWidth } from "./shell";

/*
 * Two overlapping sets inside a rectangle of every element, a Venn diagram.
 * Each of the four regions is one row of the truth table, and can be shaded by
 * choosing it in the picture or in the list under it. The figure can ask for
 * sets in turn, written with union, intersection and complement, and says
 * whether the shading matches each one.
 */

/** A region in a sentence, quoted, since its name holds a comma: “Short, not in English”. */
const quoted = (name: string) => `“${name}”`;

/** What a set that has just been shaded rightly is made of. */
function madeOf(regions: string[]): string {
  if (regions.length === 0) return "No region is in this set: it is the empty set.";
  if (regions.length === 1) return `${regions[0]} is the only region in this set.`;
  return `${listWords(regions)} make up this set.`;
}

export function SetDiagram({
  title,
  description,
  universe,
  sets,
  tasks = [],
}: {
  title: string;
  description: string;
  /** What every element is, such as "All emails". */
  universe: string;
  /** The two sets, each with its name, the name of the elements outside it, and its letter. */
  sets: [NamedSet, NamedSet];
  /** Sets to shade in turn, such as "S ∩ Eᶜ", in the sets' letters, with U for every element. */
  tasks?: string[];
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [ref, width] = useWidth<HTMLDivElement>();
  const [shaded, setShaded] = useState<Set<Region>>(() => new Set());
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<ReturnType<typeof compareShading> | null>(null);

  const syms = useMemo(() => [sets[0].sym, sets[1].sym] as const, [sets]);
  const asked = useMemo(
    () =>
      tasks.map((text) => {
        const node = parseSetExpression(text, syms);
        return { text, tex: setTex(text), spoken: spokenSet(node, syms), regions: regionsOf(node) };
      }),
    [tasks, syms],
  );
  const task = asked[step];
  const names = useMemo(() => Object.fromEntries(REGIONS.map((r) => [r, regionName(r, sets)])) as Record<Region, string>, [sets]);

  // The picture: a rectangle for every element, and two circles that overlap.
  const height = Math.round(Math.min(260, Math.max(190, width * 0.5)));
  const pad = 8;
  const box = { x: pad, y: pad, w: Math.max(0, width - 2 * pad), h: height - 2 * pad };
  const r = Math.max(36, Math.min(box.h * 0.4, box.w * 0.22));
  const cy = box.y + box.h / 2 + 4;
  const ax = width / 2 - r * 0.62;
  const bx = width / 2 + r * 0.62;

  const regionAt = (x: number, y: number): Region | null => {
    const inA = Math.hypot(x - ax, y - cy) <= r;
    const inB = Math.hypot(x - bx, y - cy) <= r;
    if (inA && inB) return "both";
    if (inA) return "first";
    if (inB) return "second";
    const inBox = x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
    return inBox ? "neither" : null;
  };

  const toggle = (region: Region) => {
    setShaded((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
    setResult(null);
  };

  const onPicture = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const region = regionAt(((e.clientX - rect.left) * width) / rect.width, ((e.clientY - rect.top) * height) / rect.height);
    if (region) toggle(region);
  };

  const check = () => {
    if (task) setResult(compareShading(shaded, task.regions));
  };
  const next = () => {
    setStep((s) => s + 1);
    setShaded(new Set());
    setResult(null);
  };
  const restart = () => {
    setStep(0);
    setShaded(new Set());
    setResult(null);
  };

  // An earlier set with the same regions as this one, which the figure points out once this one is right.
  const twin = result?.ok && task ? asked.slice(0, step).find((t) => sameRegions(t.regions, task.regions)) : undefined;
  const last = step >= asked.length - 1;

  const fill = (region: Region) => (shaded.has(region) ? "fill-fig-vector" : "fill-transparent");
  const ids = { a: `${uid}-a`, outA: `${uid}-out-a`, outB: `${uid}-out-b`, outBoth: `${uid}-out-both` };

  return (
    <FigureFrame
      title={title}
      description={description}
      picture={({ titleId, descId }) => (
        <div ref={ref} className="flex w-full flex-col gap-2">
          <svg
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descId}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            onPointerDown={onPicture}
            className="block max-w-full cursor-pointer touch-manipulation font-serif select-none"
          >
            <defs>
              <clipPath id={ids.a}>
                <circle cx={ax} cy={cy} r={r} />
              </clipPath>
              <mask id={ids.outA}>
                <rect x={0} y={0} width={width} height={height} fill="white" />
                <circle cx={ax} cy={cy} r={r} fill="black" />
              </mask>
              <mask id={ids.outB}>
                <rect x={0} y={0} width={width} height={height} fill="white" />
                <circle cx={bx} cy={cy} r={r} fill="black" />
              </mask>
              <mask id={ids.outBoth}>
                <rect x={0} y={0} width={width} height={height} fill="white" />
                <circle cx={ax} cy={cy} r={r} fill="black" />
                <circle cx={bx} cy={cy} r={r} fill="black" />
              </mask>
            </defs>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={10} className={fill("neither")} fillOpacity={0.3} mask={`url(#${ids.outBoth})`} />
            <circle cx={ax} cy={cy} r={r} className={fill("first")} fillOpacity={0.3} mask={`url(#${ids.outB})`} />
            <circle cx={bx} cy={cy} r={r} className={fill("second")} fillOpacity={0.3} mask={`url(#${ids.outA})`} />
            <circle cx={bx} cy={cy} r={r} className={fill("both")} fillOpacity={0.3} clipPath={`url(#${ids.a})`} />
            <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={10} className="fill-none stroke-rule-strong" strokeWidth={1.5} />
            <circle cx={ax} cy={cy} r={r} className="fill-none stroke-fig-axis" strokeWidth={1.75} />
            <circle cx={bx} cy={cy} r={r} className="fill-none stroke-fig-axis" strokeWidth={1.75} />
            <text x={box.x + 12} y={box.y + 22} className="fill-ink-muted text-[16px] italic">
              U
            </text>
            <text x={ax - r * 0.5} y={cy - r * 0.42} textAnchor="middle" className="fill-ink text-[18px] italic">
              {sets[0].sym}
            </text>
            <text x={bx + r * 0.5} y={cy - r * 0.42} textAnchor="middle" className="fill-ink text-[18px] italic">
              {sets[1].sym}
            </text>
          </svg>
          <p className="text-sm text-ink-muted">
            <span className="font-serif text-ink italic">U</span>: {universe}. <span className="font-serif text-ink italic">{sets[0].sym}</span>:{" "}
            {lowerFirst(sets[0].name)}. <span className="font-serif text-ink italic">{sets[1].sym}</span>: {lowerFirst(sets[1].name)}.
          </p>
        </div>
      )}
      controls={
        <>
          {task ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                Set <span className="tabular">{step + 1}</span> of <span className="tabular">{asked.length}</span>
              </p>
              <p className="text-base text-ink">
                Shade <span className="sr-only">{task.spoken}</span>
                <span aria-hidden="true">
                  <Tex tex={task.tex} />
                </span>
                .
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={check} disabled={result?.ok === true}>
                  Check my shading
                </Button>
                {result?.ok && !last ? (
                  <Button size="sm" variant="secondary" onClick={next}>
                    Next set
                  </Button>
                ) : null}
                {result?.ok && last && asked.length > 1 ? (
                  <Button size="sm" variant="ghost" onClick={restart}>
                    Start again
                  </Button>
                ) : null}
              </div>
              <div role="status" aria-live="polite" className="min-h-5 text-sm text-ink">
                {result ? (
                  result.ok ? (
                    <p className="flex items-start gap-1.5">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-correct" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-correct">Right. </span>
                        {madeOf(REGIONS.filter((x) => task.regions.has(x)).map((x) => quoted(names[x])))}
                        {twin ? (
                          <>
                            {" "}
                            It is the same set as <span className="sr-only">{twin.spoken}</span>
                            <span aria-hidden="true">
                              <Tex tex={twin.tex} />
                            </span>
                            .
                          </>
                        ) : null}
                        {last && asked.length > 1 ? " That was the last set." : ""}
                      </span>
                    </p>
                  ) : (
                    <p className="flex items-start gap-1.5">
                      <CrossIcon className="mt-0.5 size-4 shrink-0 text-incorrect" aria-hidden="true" />
                      <span>
                        <span className="font-semibold text-incorrect">Not yet. </span>
                        {result.right.length === 0 && result.extra.length === 0 ? (
                          "Nothing is shaded yet: choose the regions that make up the set, in the picture or in the list."
                        ) : (
                          <>
                            {result.right.length
                              ? `${listWords(result.right.map((x) => quoted(names[x])))} ${result.right.length === 1 ? "is" : "are"} rightly shaded. `
                              : ""}
                            {result.extra.length
                              ? `${listWords(result.extra.map((x) => quoted(names[x])))} ${result.extra.length === 1 ? "is" : "are"} shaded but not in the set. `
                              : ""}
                            {result.missing.length
                              ? `${listWords(result.missing.map((x) => quoted(names[x])))} ${result.missing.length === 1 ? "is" : "are"} in the set but not shaded.`
                              : ""}
                          </>
                        )}
                      </span>
                    </p>
                  )
                ) : null}
              </div>
            </div>
          ) : null}
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Regions to shade</legend>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  aria-pressed={shaded.has(region)}
                  onClick={() => toggle(region)}
                  className={clsx(
                    "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm",
                    shaded.has(region) ? "border-accent bg-accent-soft text-accent-strong" : "border-rule bg-surface text-ink hover:border-rule-strong",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                      shaded.has(region) ? "border-accent bg-accent text-on-accent" : "border-rule-strong bg-surface",
                    )}
                  >
                    {shaded.has(region) ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span>{names[region]}</span>
                </button>
              ))}
            </div>
          </fieldset>
        </>
      }
    />
  );
}
