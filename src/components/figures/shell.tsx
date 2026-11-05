"use client";

import { clsx } from "clsx";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";

import { Button } from "@/components/ui/button";

/*
 * The frame every figure shares: a title, the picture, its controls, a
 * description in words and the numbers behind it in a table. The picture is
 * an image to assistive technology; everything interactive is an ordinary
 * control outside it, so the figure works from the keyboard.
 */

/** The width of an element, kept up to date, so figures draw at real size. */
export function useWidth<T extends HTMLElement>(fallback = 640): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && Math.abs(w - width) > 1) setWidth(Math.round(w));
    });
    ro.observe(el);
    setWidth(Math.round(el.getBoundingClientRect().width) || fallback);
    return () => ro.disconnect();
    // width is read only to skip tiny changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback]);
  return [ref, width];
}

export type DataTable = { columns: string[]; rows: (string | number)[][]; caption?: string };

export function FigureFrame({
  title,
  description,
  picture,
  controls,
  predict,
  table,
  label = "Figure",
}: {
  title: string;
  description: string;
  /** Renders the picture, given the ids it should reference. */
  picture: (ids: { titleId: string; descId: string }) => ReactNode;
  controls?: ReactNode;
  predict?: ReactNode;
  table?: DataTable;
  label?: string;
}) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  return (
    <figure aria-labelledby={titleId} className="not-prose my-8 flex flex-col gap-4 rounded-lg border border-rule bg-surface p-4 font-sans sm:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p id={titleId} className="text-base font-semibold text-ink">
          {title}
        </p>
        <span className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</span>
      </div>
      {predict}
      <div className="min-w-0">{picture({ titleId, descId })}</div>
      {controls ? <div className="flex flex-col gap-3">{controls}</div> : null}
      <figcaption id={descId} className="text-sm leading-relaxed text-ink-muted">
        {description}
      </figcaption>
      {table ? <NumbersTable table={table} /> : null}
    </figure>
  );
}

/** A figure's label, in which ^x or ^{...} is drawn as a superscript, so "2^x" reads as 2 to the power x. */
export function FigureLabel({ text }: { text: string }) {
  const parts = text.split(/\^(\{[^}]*\}|[A-Za-z0-9.\u2212-]+)/);
  // A screen reader reads a superscript as plain digits, so 0.9 with 99 above it would sound like
  // 0.999; the hidden words say that it is a power.
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <sup key={i}>
            <span className="sr-only">to the power </span>
            {p.replace(/^\{|\}$/g, "")}
          </sup>
        ) : (
          p
        ),
      )}
    </>
  );
}

function NumbersTable({ table }: { table: DataTable }) {
  return (
    <details className="group rounded-md border border-rule">
      <summary className="cursor-pointer list-none rounded-md px-3 py-2 text-sm font-medium text-accent hover:text-accent-strong">
        <span className="group-open:hidden">Show the numbers</span>
        <span className="hidden group-open:inline">Hide the numbers</span>
      </summary>
      <div className="max-h-80 overflow-auto border-t border-rule">
        <table className="tabular w-full border-collapse text-left text-sm">
          {table.caption ? <caption className="px-3 py-2 text-left text-xs text-ink-muted">{table.caption}</caption> : null}
          <thead className="sticky top-0 bg-inset">
            <tr>
              {table.columns.map((c) => (
                <th key={c} scope="col" className="px-3 py-1.5 font-semibold text-ink">
                  <FigureLabel text={c} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="border-t border-rule">
                {r.map((cell, j) =>
                  j === 0 ? (
                    <th key={j} scope="row" className="px-3 py-1.5 font-normal text-ink">
                      {cell}
                    </th>
                  ) : (
                    <td key={j} className="px-3 py-1.5 text-ink">
                      {cell}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export type PredictPhase = "asking" | "locked" | "revealed";

/**
 * Predict first: the figure keeps its answer back until the learner commits.
 * The figure supplies the input; this panel supplies the prompt and the steps.
 */
export function PredictPanel({
  prompt,
  phase,
  onLock,
  onReveal,
  onReset,
  canLock,
  input,
  verdict,
}: {
  prompt: string;
  phase: PredictPhase;
  onLock: () => void;
  onReveal: () => void;
  onReset: () => void;
  canLock: boolean;
  input?: ReactNode;
  verdict?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-md border px-3 py-3",
        phase === "revealed" ? "border-rule bg-inset" : "border-accent/40 bg-accent-soft",
      )}
    >
      <p className="text-sm text-ink">
        <span className="font-semibold">Predict first. </span>
        {prompt}
      </p>
      {phase !== "revealed" && input ? <div>{input}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        {phase === "asking" ? (
          <Button size="sm" onClick={onLock} disabled={!canLock}>
            Lock in my prediction
          </Button>
        ) : null}
        {phase === "locked" ? (
          <Button size="sm" onClick={onReveal}>
            Show what really happens
          </Button>
        ) : null}
        {phase === "revealed" ? (
          <Button size="sm" variant="ghost" onClick={onReset}>
            Predict again
          </Button>
        ) : null}
        {phase === "locked" ? <p className="text-sm text-ink-muted">Locked in. Now look.</p> : null}
      </div>
      {phase === "revealed" && verdict ? (
        <div role="status" className="text-sm text-ink">
          {verdict}
        </div>
      ) : null}
    </div>
  );
}

/** A labelled range input, the standard control for a figure's parameter. */
export function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  sym,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display?: string;
  sym?: string;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[10rem_minmax(0,1fr)_6rem]">
      <label htmlFor={id} className="text-sm font-medium text-ink" data-sym={sym}>
        {label}
      </label>
      <output htmlFor={id} className="tabular text-right text-sm text-ink sm:order-last">
        {display ?? value}
      </output>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={display ?? String(value)}
        className="col-span-2 w-full accent-[var(--accent)] sm:col-span-1"
      />
    </div>
  );
}
