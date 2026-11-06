"use client";

import { clsx } from "clsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { python, type TraceResult, type TraceStep } from "@/lib/python/client";

import { CodeText, FigureFrame, PredictPanel, RangeControl, type PredictPhase } from "./shell";
import { normalise, sameAnswer } from "./trace-answer";

/*
 * A program run one line at a time by real Python in the browser. Each step
 * shows the line about to run, every variable as it stands and what has been
 * printed so far, so the learner can predict a value before seeing it.
 */

/** A pause before a line runs, the first time or the given time it is reached, to ask for a value. */
type Stop = { line: number; variable: string; prompt?: string; pass?: number };

/** A value the program reads with input(), which the learner can change and run again. */
type TraceInput = { label: string; value: string; presets?: string[] };

function topVariables(step: TraceStep | undefined): Record<string, string> {
  return step?.stack.at(-1)?.variables ?? {};
}

function lookup(step: TraceStep | undefined, name: string): string | undefined {
  if (!step) return undefined;
  for (let i = step.stack.length - 1; i >= 0; i--) {
    const v = step.stack[i]!.variables[name];
    if (v !== undefined) return v;
  }
  return undefined;
}

export function ProgramTrace({
  title,
  description,
  code,
  stdin,
  predict = [],
  predictOutput,
  inputs,
  syms = {},
  maxSteps = 400,
}: {
  title: string;
  description: string;
  code: string;
  stdin?: string[];
  /** Pauses before these lines run (the first time, or the time `pass` names) to ask for a variable's next value. */
  predict?: Stop[];
  /** Values typed at the program's input() calls, in order, which the learner can change. */
  inputs?: TraceInput[];
  /** Asks what the whole program prints before it runs. */
  predictOutput?: string;
  /** Links variables to the same symbol elsewhere in the lesson. */
  syms?: Record<string, string>;
  maxSteps?: number;
}) {
  const uid = useId();
  const lines = useMemo(() => code.replace(/\s+$/, "").split("\n"), [code]);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(0);
  const [asked, setAsked] = useState<Set<number>>(new Set());
  const [question, setQuestion] = useState<{ stop: Stop; at: number } | null>(null);
  const [answer, setAnswer] = useState("");
  const [results, setResults] = useState<{ stop: Stop; said: string; actual: string }[]>([]);
  const [outPhase, setOutPhase] = useState<PredictPhase>("asking");
  const [outGuess, setOutGuess] = useState("");
  const [typed, setTyped] = useState<string[]>(() => (inputs ?? []).map((i) => i.value));
  const [ranWith, setRanWith] = useState<string[] | null>(null);

  // Keyboard and screen-reader users keep their place at a stop: the question takes focus when it
  // appears, and once it is answered focus goes back to what they were stepping with.
  const groupRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef<HTMLInputElement>(null);
  const steppedWith = useRef<"keys" | "button">("button");
  const returnFocus = useRef(false);
  useEffect(() => {
    if (question) {
      stopRef.current?.focus();
    } else if (returnFocus.current) {
      returnFocus.current = false;
      const next = groupRef.current?.closest("figure")?.querySelector<HTMLButtonElement>("[data-next-line]");
      (steppedWith.current === "keys" || !next || next.disabled ? groupRef.current : next)?.focus();
    }
  }, [question]);

  const steps = trace?.steps ?? [];
  const current = steps[step];
  const previous = step > 0 ? steps[step - 1] : undefined;

  async function run() {
    setRunning(true);
    setError(null);
    try {
      const typedLines = inputs ? typed.map((t) => t.trim()) : stdin;
      const t = await python().trace({ code, stdin: typedLines, maxEvents: maxSteps });
      setTrace(t);
      setRanWith(inputs ? [...typed] : null);
      setStep(0);
      setAsked(new Set());
      setResults([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Python could not run the program.");
    } finally {
      setRunning(false);
    }
  }

  function forward(from: "keys" | "button" = "button") {
    if (!trace || step >= steps.length - 1) return;
    steppedWith.current = from;
    const s = steps[step]!;
    const reached = (line: number) => steps.slice(0, step + 1).filter((t) => t.event === "line" && t.line === line).length;
    const stopIndex = predict.findIndex(
      (p, i) => !asked.has(i) && s.event === "line" && s.line === p.line && reached(p.line) === (p.pass ?? 1),
    );
    if (stopIndex >= 0 && !question) {
      setQuestion({ stop: predict[stopIndex]!, at: stopIndex });
      setAnswer("");
      return;
    }
    setStep(step + 1);
  }

  function answerStop() {
    if (!question) return;
    const actual = lookup(steps[step + 1], question.stop.variable) ?? "(not defined yet)";
    setResults((r) => [...r, { stop: question.stop, said: answer, actual }]);
    setAsked((a) => new Set(a).add(question.at));
    returnFocus.current = true;
    setQuestion(null);
    setStep(step + 1);
  }

  const vars = topVariables(current);
  const before = topVariables(previous);
  const frames = current?.stack ?? [];
  const lastResult = results.at(-1);
  const blocked = Boolean(predictOutput) && outPhase === "asking";

  const changed = (name: string) => previous !== undefined && before[name] !== vars[name];

  // A stop still to come, in this run: until every one has been answered, the learner steps
  // line by line, so a jump cannot carry them past a question.
  const stopsLeft = predict.some(
    (p, i) => !asked.has(i) && steps.filter((t) => t.event === "line" && t.line === p.line).length >= (p.pass ?? 1),
  );

  return (
    <FigureFrame
      title={title}
      description={description}
      label="Program trace"
      predict={
        predictOutput ? (
          <PredictPanel
            prompt={predictOutput}
            phase={outPhase}
            canLock={outGuess.trim().length > 0}
            onLock={() => setOutPhase("locked")}
            onReveal={() => {
              setOutPhase("revealed");
              if (!trace) void run();
            }}
            onReset={() => {
              setOutPhase("asking");
              setOutGuess("");
            }}
            input={
              <div className="flex flex-col gap-1">
                <label htmlFor={`${uid}-out`} className="text-sm font-medium text-ink">
                  What it prints
                </label>
                <textarea
                  id={`${uid}-out`}
                  rows={3}
                  value={outGuess}
                  readOnly={outPhase !== "asking"}
                  onChange={(e) => setOutGuess(e.target.value)}
                  className={clsx(inputClasses, "resize-y py-2 font-mono text-sm")}
                />
              </div>
            }
            verdict={
              trace ? (
                <p>
                  {normalise(trace.output) === normalise(outGuess)
                    ? "It prints exactly what you predicted."
                    : "It prints something different from your prediction. Step through to find the line where your picture of the program and the real one part."}
                </p>
              ) : (
                <p>Running it now.</p>
              )
            }
          />
        ) : null
      }
      picture={({ titleId, descId }) => (
        <div
          ref={groupRef}
          role="group"
          aria-labelledby={titleId}
          aria-describedby={descId}
          tabIndex={trace ? 0 : -1}
          onKeyDown={(e) => {
            if (!trace || question) return;
            if (e.key === "ArrowRight") {
              e.preventDefault();
              forward("keys");
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              setStep((s) => Math.max(0, s - 1));
            }
          }}
          className="grid gap-3 rounded-md md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
        >
          <pre className="overflow-x-auto rounded-md border border-rule bg-inset py-2 font-mono text-sm leading-6 text-ink">
            {lines.map((l, i) => {
              const here = current?.line === i + 1 && current.event === "line";
              return (
                <div
                  key={i}
                  aria-current={here ? "step" : undefined}
                  className={clsx("flex gap-3 px-3", here && "bg-accent-soft")}
                >
                  <span className="w-6 shrink-0 text-right text-ink-faint select-none">{i + 1}</span>
                  <span className={clsx("whitespace-pre", here && "font-semibold text-accent-strong")}>{l || " "}</span>
                  {here ? <span className="sr-only">(about to run)</span> : null}
                </div>
              );
            })}
          </pre>
          <div className="flex min-w-0 flex-col gap-3">
            {trace ? (
              <>
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    {frames.length > 1 ? `Variables in ${frames.at(-1)?.function}` : "Variables"}
                  </p>
                  {Object.keys(vars).length ? (
                    <table className="w-full text-left text-sm">
                      <tbody>
                        {Object.entries(vars).map(([k, v]) => (
                          <tr key={k} className="border-t border-rule first:border-t-0" data-sym={syms[k]}>
                            <th scope="row" className="py-1 pr-3 font-mono font-normal text-ink">
                              {k}
                            </th>
                            <td className={clsx("py-1 font-mono break-all", changed(k) ? "font-semibold text-accent-strong" : "text-ink")}>
                              {v}
                              {changed(k) ? <span className="ml-2 font-sans text-xs font-normal text-ink-muted">changed</span> : null}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-ink-muted">None yet.</p>
                  )}
                </div>
                {frames.length > 1 ? (
                  <p className="text-sm text-ink-muted">
                    Calls in progress: {frames.map((f) => f.function).join(" → ")}
                  </p>
                ) : null}
                <div>
                  <p className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Printed so far</p>
                  <pre className="max-h-32 overflow-auto rounded-md border border-rule bg-surface px-2 py-1 font-mono text-sm whitespace-pre-wrap text-ink">
                    {current?.output || " "}
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                {blocked ? "Lock in your prediction of the output first, then run it." : "Run the program to step through it one line at a time."}
              </p>
            )}
          </div>
        </div>
      )}
      controls={
        <>
          {inputs?.length ? (
            <div className="flex flex-col gap-3">
              {inputs.map((input, i) => (
                <div key={input.label} className="flex flex-col gap-1">
                  <label htmlFor={`${uid}-in-${i}`} className="text-sm font-medium text-ink">
                    <CodeText text={input.label} />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      id={`${uid}-in-${i}`}
                      value={typed[i] ?? ""}
                      onChange={(e) => setTyped((t) => t.map((v, j) => (j === i ? e.target.value : v)))}
                      autoComplete="off"
                      spellCheck={false}
                      className={clsx(inputClasses, "h-9 w-32 font-mono")}
                    />
                    {input.presets?.length ? (
                      <div className="flex flex-wrap gap-2" role="group" aria-label={`${input.label.replace(/`/g, "")}: values to try`}>
                        {input.presets.map((p) => (
                          <Button
                            key={p}
                            size="sm"
                            variant={p === (typed[i] ?? "").trim() ? "primary" : "secondary"}
                            aria-pressed={p === (typed[i] ?? "").trim()}
                            onClick={() => setTyped((t) => t.map((v, j) => (j === i ? p : v)))}
                          >
                            <span className="font-mono">{p}</span>
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
              {trace && ranWith && ranWith.some((v, i) => v !== typed[i]) ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="sm" onClick={() => void run()} disabled={running}>
                    {running ? "Running" : "Run it again with these values"}
                  </Button>
                  <p className="text-sm text-ink-muted">The trace is still from typing {ranWith.join(", ")}.</p>
                </div>
              ) : null}
            </div>
          ) : null}
          {!trace ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" onClick={() => void run()} disabled={running || blocked}>
                {running ? "Starting Python" : "Run it, one line at a time"}
              </Button>
              {running ? <p className="text-sm text-ink-muted">The first run takes a few seconds while Python starts.</p> : null}
            </div>
          ) : (
            <>
              {question ? (
                <div className="flex flex-col gap-2 rounded-md border border-accent/40 bg-accent-soft px-3 py-3">
                  <label htmlFor={`${uid}-stop`} className="text-sm text-ink">
                    <span className="font-semibold">Predict first. </span>
                    <CodeText text={question.stop.prompt ?? `Line ${question.stop.line} is about to run. What will \`${question.stop.variable}\` be afterwards?`} />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      ref={stopRef}
                      id={`${uid}-stop`}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && answer.trim()) answerStop();
                      }}
                      autoComplete="off"
                      spellCheck={false}
                      className={clsx(inputClasses, "h-9 max-w-xs font-mono")}
                    />
                    <Button size="sm" onClick={answerStop} disabled={!answer.trim()}>
                      Run the line
                    </Button>
                  </div>
                </div>
              ) : null}
              {lastResult ? (
                <p role="status" className={clsx("text-sm", sameAnswer(lastResult.said, lastResult.actual) ? "text-correct" : "text-ink")}>
                  {sameAnswer(lastResult.said, lastResult.actual) ? "Right: " : "Not quite: "}
                  you said <code className="font-mono">{lastResult.said}</code>, and <code className="font-mono">{lastResult.stop.variable}</code> is{" "}
                  <code className="font-mono">{lastResult.actual}</code>.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="secondary" onClick={() => setStep(0)} disabled={step === 0 || Boolean(question)}>
                  First
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || Boolean(question)}>
                  Back
                </Button>
                <Button size="sm" data-next-line="" onClick={() => forward("button")} disabled={step >= steps.length - 1 || Boolean(question)}>
                  Next line
                </Button>
                <p className="tabular text-sm text-ink-muted" aria-live="polite">
                  Step {step + 1} of {steps.length}
                  {current
                    ? current.event === "line"
                      ? `: about to run line ${current.line}`
                      : (frames.at(-1)?.function ?? "(main program)") === "(main program)"
                        ? ": the program has finished"
                        : `: returning from ${frames.at(-1)?.function}`
                    : ""}
                </p>
              </div>
              {!stopsLeft ? (
                <RangeControl label="Jump to step" min={0} max={Math.max(0, steps.length - 1)} step={1} value={step} onChange={setStep} display={`${step + 1}`} />
              ) : null}
              {trace.error ? (
                <p className="text-sm text-incorrect">
                  {trace.error.type}
                  {trace.error.line ? ` on line ${trace.error.line}` : ""}: {trace.error.message}
                </p>
              ) : null}
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-incorrect">
              {error}
            </p>
          ) : null}
        </>
      }
      table={
        trace
          ? {
              columns: ["Step", "Line", "Code", "Changed by this line"],
              caption: stopsLeft
                ? "The lines run so far. The rest are listed once every question in this run is answered."
                : undefined,
              // While a stop is still to come, list only the lines already run, so the table cannot
              // answer the question ahead. Each row shows what its own line changed: the names as
              // they stand at the next step, against the names as they stood at this one.
              rows: steps.slice(0, stopsLeft ? step : 200).map((s, i) => {
                const now = topVariables(s);
                const after = topVariables(steps[i + 1]);
                const diff = Object.entries(after)
                  .filter(([k, v]) => now[k] !== v)
                  .map(([k, v]) => `\`${k} = ${v}\``)
                  .join(", ");
                const fn = s.stack.at(-1)?.function ?? "(main program)";
                const code =
                  s.event === "line"
                    ? `\`${(lines[s.line - 1] ?? "").trim()}\``
                    : fn === "(main program)"
                      ? "the program has finished"
                      : `returning from \`${fn}\``;
                return [i + 1, s.event === "line" ? s.line : "end", code, diff || "none"];
              }),
            }
          : undefined
      }
    />
  );
}
