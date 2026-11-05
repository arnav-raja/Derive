"use client";

import { clsx } from "clsx";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";

import {
  combineValues,
  evaluate,
  exprText,
  formatValue,
  parseExpr,
  parseLooseNumber,
  parseUnit,
  roundSig,
  sigText,
  unitOf,
  unitText,
  type ExprNode,
  type Notation,
  type Unit,
} from "./expr";
import { FigureFrame, PredictPanel, useWidth, type PredictPhase } from "./shell";

/*
 * An expression drawn as the tree it really is: leaves are numbers and
 * symbols, and each operation combines what is below it. Values and units are
 * computed node by node, so a mismatch of units shows exactly where it starts.
 */

type TreeNode = {
  id: number;
  node: ExprNode;
  label: string;
  children: TreeNode[];
  depth: number;
  x: number;
  text: string;
  value: number;
  unit: { ok: true; unit: Unit } | { ok: false; message: string } | null;
};

const OP_LABEL = {
  maths: { "+": "+", "-": "−", "*": "×", "/": "÷", "//": "//", "%": "%", "^": "power" },
  python: { "+": "+", "-": "-", "*": "*", "/": "/", "//": "//", "%": "%", "^": "**" },
} as const;
const NONE: Record<string, never> = {};
const NODE_W = 72;
const LEVEL_H = 84;
/** A wide tree is shrunk to fit its column, but never below this, so its text stays readable; past it, the figure scrolls. */
const MIN_FIT = 0.75;

const SUPERSCRIPT: Record<string, string> = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };

/** "FLOP^2/s" as "FLOP²/s", for display. */
function prettyUnit(text: string): string {
  return text.replace(/\^(-?\d+)/g, (_, d: string) => [...d].map((c) => SUPERSCRIPT[c] ?? c).join(""));
}

function build(
  root: ExprNode,
  scope: Record<string, number>,
  units: Record<string, Unit> | null,
  sigfigs: number | undefined,
  notation: Notation,
) {
  let nextId = 0;
  let leaf = 0;
  const order: TreeNode[] = [];
  const walk = (node: ExprNode, depth: number): TreeNode => {
    const kids: ExprNode[] =
      node.kind === "bin" ? [node.left, node.right] : node.kind === "neg" ? [node.arg] : node.kind === "call" ? node.args : [];
    const children = kids.map((k) => walk(k, depth + 1));
    const x = children.length ? children.reduce((s, c) => s + c.x, 0) / children.length : leaf++;
    let value = Number.NaN;
    try {
      // A rounding calculator rounds every result before the next operation uses it.
      value = sigfigs
        ? roundSig(combineValues(node, children.map((c) => c.value), scope), sigfigs)
        : evaluate(node, scope);
    } catch {
      value = Number.NaN;
    }
    const label =
      node.kind === "num" ? node.text : node.kind === "var" ? node.name : node.kind === "const" ? (node.name === "pi" ? "π" : "e") : node.kind === "neg" ? "negate" : node.kind === "call" ? node.fn : OP_LABEL[notation][node.op];
    const t: TreeNode = {
      id: nextId++,
      node,
      label,
      children,
      depth,
      x,
      text: exprText(node, notation),
      value,
      unit: units ? unitOf(node, units, scope) : null,
    };
    order.push(t);
    return t;
  };
  const tree = walk(root, 0);
  return { tree, order, leaves: leaf };
}

function flatten(t: TreeNode, out: TreeNode[] = []): TreeNode[] {
  out.push(t);
  for (const c of t.children) flatten(c, out);
  return out;
}

function subtreeIds(t: TreeNode, out = new Set<number>()): Set<number> {
  out.add(t.id);
  for (const c of t.children) subtreeIds(c, out);
  return out;
}

export function ExpressionTree({
  title,
  description,
  expr,
  values = NONE,
  units,
  syms = NONE,
  stepwise = false,
  sigfigs,
  predict,
  notation = "maths",
}: {
  title: string;
  description: string;
  /** In the figure language: 6*N*D, C/R/(3600*24*365). */
  expr: string;
  values?: Record<string, number>;
  /** Units of the symbols, such as { C: "FLOP", R: "FLOP/s" }. */
  units?: Record<string, string>;
  /** Links a symbol to the same symbol elsewhere, if its data-sym differs from its name. */
  syms?: Record<string, string>;
  /** Reveal values one operation at a time. */
  stepwise?: boolean;
  /** Act as a calculator that keeps this many significant figures, rounding every result. */
  sigfigs?: number;
  /** Ask for the value (or the unit) at the top before showing it. */
  predict?: { prompt: string; ask?: "value" | "unit"; options?: string[] };
  /** Write the operations as on paper, or as Python writes them (** for a power, // and %). */
  notation?: Notation;
}) {
  const inputId = useId();
  const [ref, width] = useWidth<HTMLDivElement>();
  const parsedUnits = useMemo(
    () => (units ? Object.fromEntries(Object.entries(units).map(([k, v]) => [k, parseUnit(v)])) : null),
    [units],
  );
  const { tree, order, leaves } = useMemo(
    () => build(parseExpr(expr), values, parsedUnits, sigfigs, notation),
    [expr, values, parsedUnits, sigfigs, notation],
  );
  const show = (v: number) => (sigfigs ? sigText(v, sigfigs) : formatValue(v));
  const ops = order.filter((n) => n.children.length > 0);
  const [step, setStep] = useState(stepwise ? 0 : ops.length);
  const [hover, setHover] = useState<number | null>(null);
  const [phase, setPhase] = useState<PredictPhase>("asking");
  const [answer, setAnswer] = useState("");

  const concealed = predict && phase !== "revealed";
  const shownOps = new Set(ops.slice(0, concealed ? 0 : step).map((n) => n.id));
  const isShown = (n: TreeNode) => n.children.length === 0 || shownOps.has(n.id);
  const current = !concealed && stepwise && step > 0 ? ops[step - 1] : undefined;

  const all = flatten(tree);
  const depth = Math.max(...all.map((n) => n.depth));
  // Each node shows its name, its value and its unit on three lines. Every node
  // is as wide as the longest line any node will show, so nothing spills out.
  const unitLine = (n: TreeNode) =>
    n.unit?.ok && Object.keys(n.unit.unit).length ? prettyUnit(unitText(n.unit.unit)) : "";
  const rawValueLine = (n: TreeNode) =>
    n.unit && !n.unit.ok
      ? "units clash"
      : sigfigs && n.node.kind === "num" && Number(n.node.text) === n.value
        ? n.node.text
        : sigfigs
          ? sigText(n.value, sigfigs)
          : formatValue(n.value, 3);
  // A number at a leaf that reads the same as its value is written once.
  const plainLeaf = (n: TreeNode) => n.node.kind === "num" && !unitLine(n) && rawValueLine(n) === n.label;
  const valueLine = (n: TreeNode) => (plainLeaf(n) ? "" : rawValueLine(n));
  const nodeW = Math.max(
    NODE_W,
    ...all.map((n) => Math.max(n.label.length * 7.8, valueLine(n).length * 6.4, unitLine(n).length * 6.4) + 16),
  );
  const natural = Math.max(1, leaves) * (nodeW + 8);
  const fit = width <= 0 || natural <= width ? 1 : Math.max(MIN_FIT, width / natural);
  const spacing = Math.max(nodeW + 8, width / fit / Math.max(1, leaves));
  const svgW = Math.max(width / fit, leaves * spacing);
  const svgH = (depth + 1) * LEVEL_H + 16;
  const px = (n: TreeNode) => (n.x + 0.5) * spacing + (svgW - leaves * spacing) / 2;
  const py = (n: TreeNode) => 32 + n.depth * LEVEL_H;
  const highlight = hover !== null ? subtreeIds(all.find((n) => n.id === hover)!) : current ? subtreeIds(current) : null;
  const focus = hover !== null ? all.find((n) => n.id === hover) : current;

  const ask = predict?.ask ?? "value";
  const guess = parseLooseNumber(answer);
  const rootUnit = tree.unit?.ok ? unitText(tree.unit.unit) : null;

  const describe = (n: TreeNode) => {
    const u = n.unit ? (n.unit.ok ? `, unit ${unitText(n.unit.unit)}` : `. Units do not match: ${n.unit.message}`) : "";
    return `${n.text} = ${isShown(n) ? show(n.value) : "?"}${isShown(n) ? u : ""}`;
  };

  return (
    <FigureFrame
      title={title}
      description={description}
      predict={
        predict ? (
          <PredictPanel
            prompt={predict.prompt}
            phase={phase}
            canLock={ask === "value" ? Number.isFinite(guess) : answer !== ""}
            onLock={() => setPhase("locked")}
            onReveal={() => {
              setPhase("revealed");
              setStep(stepwise ? 0 : ops.length);
            }}
            onReset={() => {
              setPhase("asking");
              setAnswer("");
            }}
            input={
              ask === "value" ? (
                <div className="flex flex-col gap-1">
                  <label htmlFor={inputId} className="text-sm font-medium text-ink">
                    Your prediction for {tree.text}
                  </label>
                  <input
                    id={inputId}
                    value={answer}
                    onChange={(e) => phase === "asking" && setAnswer(e.target.value)}
                    readOnly={phase !== "asking"}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={sigfigs ? "for example 2.50" : "a number"}
                    className={clsx(inputClasses, "tabular h-9 max-w-xs font-mono")}
                  />
                </div>
              ) : (
                <fieldset className="flex flex-wrap gap-2">
                  <legend className="mb-1 text-sm font-medium text-ink">The unit of {tree.text}</legend>
                  {(predict.options ?? []).map((o) => (
                    <label
                      key={o}
                      className={clsx(
                        "cursor-pointer rounded-md border px-3 py-1 text-sm",
                        answer === o ? "border-accent bg-surface text-accent-strong" : "border-rule bg-surface text-ink",
                      )}
                    >
                      <input type="radio" name={inputId} value={o} checked={answer === o} disabled={phase !== "asking"} onChange={() => setAnswer(o)} className="sr-only" />
                      {o}
                    </label>
                  ))}
                </fieldset>
              )
            }
            verdict={
              ask === "value" && sigfigs ? (
                <p>
                  The calculator shows <span className="tabular font-semibold">{show(tree.value)}</span>. You predicted {answer.trim()}
                  {Number.isFinite(guess) && roundSig(guess, sigfigs) === tree.value ? ", which is right." : "."}
                </p>
              ) : ask === "value" ? (
                <p>
                  The value is <span className="tabular font-semibold">{formatValue(tree.value)}</span>. You predicted {formatValue(guess)}
                  {Number.isFinite(guess) && tree.value !== 0
                    ? `: off by a factor of ${formatValue(Math.max(guess / tree.value, tree.value / guess), 2)}.`
                    : "."}
                </p>
              ) : (
                <p>
                  The unit is <span className="font-semibold">{rootUnit ?? "not defined, because the units do not combine"}</span>. You chose {answer}
                  {rootUnit && answer.replace(/\s/g, "") === rootUnit.replace(/\s/g, "") ? ", which is right." : "."}
                </p>
              )
            }
          />
        ) : null
      }
      picture={({ titleId, descId }) => (
        <div ref={ref} className="w-full overflow-x-auto">
          <svg
            role="img"
            aria-labelledby={titleId}
            aria-describedby={descId}
            width={svgW * fit}
            height={svgH * fit}
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="block font-sans"
          >
            {all.flatMap((n) =>
              n.children.map((c) => (
                <line
                  key={`${n.id}-${c.id}`}
                  x1={px(n)}
                  y1={py(n) + 26}
                  x2={px(c)}
                  y2={py(c) - 24}
                  className={highlight?.has(c.id) && highlight.has(n.id) ? "stroke-accent" : "stroke-fig-grid"}
                  strokeWidth={highlight?.has(c.id) && highlight.has(n.id) ? 2 : 1.5}
                />
              )),
            )}
            {all.map((n) => {
              const leaf = n.children.length === 0;
              const bad = n.unit && !n.unit.ok;
              const shown = isShown(n);
              const lit = highlight?.has(n.id);
              const sym = n.node.kind === "var" ? (syms[n.node.name] ?? n.node.name) : undefined;
              return (
                <g key={n.id} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)} data-sym={sym}>
                  <rect
                    x={px(n) - nodeW / 2}
                    y={py(n) - 24}
                    width={nodeW}
                    height={50}
                    rx={leaf ? 22 : 6}
                    className={clsx(
                      bad && shown ? "fill-warning-soft stroke-warning" : lit ? "fill-accent-soft stroke-accent" : leaf ? "fill-inset stroke-rule-strong" : "fill-surface stroke-rule-strong",
                    )}
                    strokeWidth={lit || (bad && shown) ? 2 : 1}
                  />
                  <text
                    x={px(n)}
                    y={plainLeaf(n) ? py(n) + 5 : py(n) - 7}
                    textAnchor="middle"
                    className={clsx("text-[13px]", leaf ? "fill-ink font-mono" : "fill-ink font-semibold")}
                  >
                    {n.label}
                  </text>
                  {plainLeaf(n) ? null : (
                    <text x={px(n)} y={py(n) + 8} textAnchor="middle" className={clsx("text-[11px]", bad && shown ? "fill-warning font-semibold" : "fill-ink-muted")}>
                      {shown ? valueLine(n) : "?"}
                    </text>
                  )}
                  {shown && unitLine(n) ? (
                    <text x={px(n)} y={py(n) + 21} textAnchor="middle" className="fill-ink-muted text-[11px]">
                      {unitLine(n)}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      controls={
        <>
          <p className="min-h-5 text-sm text-ink" aria-live="polite">
            {focus ? describe(focus) : <span className="text-ink-muted">Point at a box to see what it computes.</span>}
          </p>
          {stepwise && !concealed ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                Back
              </Button>
              <Button size="sm" onClick={() => setStep((s) => Math.min(ops.length, s + 1))} disabled={step === ops.length}>
                {step === 0 ? "Start evaluating" : "Next operation"}
              </Button>
              <p className="tabular text-sm text-ink-muted">
                {step} of {ops.length} operations done
              </p>
            </div>
          ) : null}
        </>
      }
      table={{
        columns: ["Step", "Expression", "Value", ...(units ? ["Unit"] : [])],
        rows: ops.map((n, i) => {
          const hidden = concealed ? "after you predict" : "not worked out yet";
          return [
            i + 1,
            n.text,
            isShown(n) ? show(n.value) : hidden,
            ...(units
              ? [isShown(n) ? (n.unit ? (n.unit.ok ? unitText(n.unit.unit) : `clash: ${n.unit.message}`) : "") : hidden]
              : []),
          ];
        }),
      }}
    />
  );
}
