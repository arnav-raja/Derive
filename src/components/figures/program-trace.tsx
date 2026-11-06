"use client";

import { clsx } from "clsx";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { python, type TraceFrame, type TraceResult } from "@/lib/python/client";

import { CodeText, FigureFrame, PredictPanel, RangeControl, type PredictPhase } from "./shell";
import { normalise, sameAnswer } from "./trace-answer";
import { callName, changesBetween, finishedStep, frameHeading, frameMarks, frameStatus, lookupName, MAIN, returnText, runningIn } from "./trace-frames";

/*
 * A program run one line at a time by real Python in the browser. Each step
 * shows the line about to run, every variable as it stands and what has been
 * printed so far, so the learner can predict a value before seeing it. While a
 * function is running, the names of the main program and of every call in
 * progress are shown side by side, each call with its own.
 */

/**
 * A pause before a line runs, the first time or the given time it is reached, to ask for a value:
 * a name's, or an object's attribute, such as `self.count`.
 */
type Stop = { line: number; variable: string; prompt?: string; pass?: number };

/** A value the program reads with input(), which the learner can change and run again. */
type TraceInput = { label: string; value: string; presets?: string[] };

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
  // owner is the function whose own name was asked about, or null for the main program's.
  const [results, setResults] = useState<{ stop: Stop; said: string; actual: string; owner: string | null; later: boolean }[]>([]);
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
    // A line that calls a function finishes only once the call has returned, so the value is read
    // there, while the figure goes on into the call one step at a time.
    const done = finishedStep(steps, step);
    const found = lookupName(steps[done], question.stop.variable);
    const actual = found?.value ?? "(not defined yet)";
    const owner = found && found.owner !== MAIN ? found.owner : null;
    setResults((r) => [...r, { stop: question.stop, said: answer, actual, owner, later: done > step + 1 }]);
    setAsked((a) => new Set(a).add(question.at));
    returnFocus.current = true;
    setQuestion(null);
    setStep(step + 1);
  }

  const frames = current?.stack ?? [];
  const lastResult = results.at(-1);
  const blocked = Boolean(predictOutput) && outPhase === "asking";

  // A list, dict, set or object carries its tag, such as "list 1" or "Config 1", so that two
  // names for one list show the same tag, and a name moved to another list with an equal value
  // shows a new one. An object's value is its attributes.
  const variablesTable = (frame: TraceFrame | undefined, marks: Record<string, "new" | "changed">) =>
    frame && Object.keys(frame.variables).length ? (
      <table className="w-full text-left text-sm">
        <tbody>
          {Object.entries(frame.variables).map(([k, v]) => (
            <tr key={k} className="border-t border-rule first:border-t-0" data-sym={syms[k]}>
              <th scope="row" className="py-1 pr-3 font-mono font-normal text-ink">
                {k}
              </th>
              <td className={clsx("py-1 font-mono wrap-anywhere", marks[k] ? "font-semibold text-accent-strong" : "text-ink")}>
                {v}
                {frame.refs?.[k] ? (
                  <span className="ml-2 inline-block rounded-xs border border-rule-strong px-1 font-sans text-xs font-normal whitespace-nowrap text-ink">
                    <span className="sr-only">, which is </span>
                    {frame.refs[k]}
                  </span>
                ) : null}
                {marks[k] ? <span className="ml-2 font-sans text-xs font-normal text-ink-muted">{marks[k]}</span> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <p className="text-sm text-ink-muted">None yet.</p>
    );

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
          className="flex flex-wrap gap-3 rounded-md"
        >
          {/* The code keeps the width of its longest line, and the variables sit beside it only
              when that leaves them 12rem, so a line is cut only when the figure itself is narrower
              than the line, as on a phone. Otherwise the variables move below the code. */}
          <pre className="w-max max-w-full grow overflow-x-auto rounded-md border border-rule bg-inset py-2 font-mono text-sm leading-6 text-ink">
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
          <div className="flex min-w-0 grow-2 basis-48 flex-col gap-3">
            {trace ? (
              <>
                {frames.length > 1 ? (
                  <ol className="flex flex-col gap-2" aria-label="The main program and the calls in progress, the one running now last">
                    {frames.map((f, i) => {
                      const top = i === frames.length - 1;
                      return (
                        <li
                          key={i}
                          aria-current={top ? "true" : undefined}
                          className={clsx("rounded-md border px-3 py-2", top ? "border-accent/50 bg-accent-soft" : "border-rule bg-surface")}
                        >
                          <p className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-ink-muted">
                            {/* Python names are case-sensitive, so code keeps its case under a capitalised heading. */}
                            <span className="font-semibold tracking-wide uppercase [&_code]:tracking-normal [&_code]:normal-case">
                              <CodeText text={frameHeading(f, i)} />
                            </span>
                            <span>
                              <CodeText text={top ? frameStatus(current) : `waiting for \`${callName(frames[i + 1]!)}\` to return`} />
                            </span>
                          </p>
                          {variablesTable(f, frameMarks(previous, current, i))}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div>
                    <p className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Variables</p>
                    {variablesTable(frames[0], frameMarks(previous, current, 0))}
                  </div>
                )}
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
                  you said <code className="font-mono">{lastResult.said}</code>, and{" "}
                  {lastResult.later ? `once line ${lastResult.stop.line} has finished, ` : ""}
                  <code className="font-mono">{lastResult.stop.variable}</code>
                  {lastResult.owner ? (
                    <>
                      {" "}in <code className="font-mono">{lastResult.owner}</code>
                    </>
                  ) : null}{" "}
                  is <code className="font-mono">{lastResult.actual}</code>.
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
                  {current ? (
                    <>
                      {": "}
                      <CodeText
                        text={
                          current.event === "line"
                            ? `about to run line ${current.line}${runningIn(current) === MAIN ? "" : ` in \`${runningIn(current)}\``}`
                            : returnText(current)
                        }
                      />
                    </>
                  ) : (
                    ""
                  )}
                </p>
              </div>
              {!stopsLeft ? (
                <RangeControl label="Jump to step" min={0} max={Math.max(0, steps.length - 1)} step={1} value={step} onChange={setStep} display={`${step + 1}`} />
              ) : null}
              {trace.error ? (
                <p className="text-sm text-incorrect">
                  {/* StepLimit is the harness's own name for a runaway program, as in ErrorLine. */}
                  {trace.error.type === "StepLimit" ? "Stopped" : trace.error.type}
                  {trace.error.line ? ` on line ${trace.error.line}` : ""}
                  {trace.error.message ? `: ${trace.error.message}` : ""}
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
                const code = s.event === "line" ? `\`${(lines[s.line - 1] ?? "").trim()}\`` : returnText(s);
                const line = s.event === "line" ? s.line : runningIn(s) === MAIN ? "end" : s.line;
                // After a return, what changes is the caller's, as the line that made the call finishes.
                const changes = changesBetween(s, steps[i + 1]);
                const caller = s.event === "return" ? s.stack.at(-2) : undefined;
                return [i + 1, line, code, changes ? (caller ? `${changes}, as line ${caller.line} finishes` : changes) : "none"];
              }),
            }
          : undefined
      }
    />
  );
}
