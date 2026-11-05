"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { Dialog } from "radix-ui";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { answerExercise, moveOn } from "@/app/(app)/lessons/actions";
import { answerPlacement } from "@/app/(app)/placement/actions";
import { answerCheck, answerReview } from "@/app/(app)/review/actions";
import { TutorThread, useTutor, type TutorEntry } from "@/components/tutor/tutor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MathText, Tex } from "@/components/ui/tex";
import { inputClasses } from "@/components/ui/field";
import { CheckIcon, CollapseIcon, HintIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import type { AnswerPayload } from "@/lib/learning/payloads";
import { python, type BreakitResult, type ExpressionResult, type RunResult, type RuntimeStatus } from "@/lib/python/client";

import { BreakitInput, CodeWorkbench } from "./inputs/code";
import { ChoiceInput, NumberInput, StepsInput } from "./inputs/simple";
import { KIND_ICONS } from "./kind-icons";
import { KIND_LABELS, type ExerciseView } from "./types";

/*
 * One exercise, wherever it appears: in a lesson phase, on the Review page or
 * in the mixed check. The browser runs code and SymPy checks; the server
 * checks everything else and decides what is revealed.
 */

type Outcome = { correct: boolean; message: string | null; ratio: number | null } | null;

type Grading = {
  passed: boolean;
  criteria: { id: string; met: boolean; evidence: string }[];
  feedbackHtml: string;
  questionHtml: string;
};

const IDLE: RuntimeStatus = { state: "idle" };

function usePythonStatus(): RuntimeStatus {
  return useSyncExternalStore(
    (cb) => python().subscribe(cb),
    () => python().getStatus(),
    () => IDLE,
  );
}

const noSubscription = () => () => {};

function readDraft(key: string): string | null {
  try {
    return window.localStorage.getItem(`derive:draft:${key}`);
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: string) {
  try {
    window.localStorage.setItem(`derive:draft:${key}`, value);
  } catch {
    // Drafts are a convenience; private windows may refuse storage.
  }
}

function lastPayload(view: ExerciseView): AnswerPayload | null {
  const p = view.state.lastPayload;
  return p && typeof p === "object" && !Array.isArray(p) && "type" in p ? (p as unknown as AnswerPayload) : null;
}

function wordCount(s: string): number {
  return s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

function ConfidenceSlider({ id, value, onChange, disabled }: { id: string; value: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-rule bg-inset/50 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          How sure are you?
        </label>
        <span className="tabular text-sm font-semibold text-accent">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--accent)]"
        aria-valuetext={`${value} percent`}
      />
      <p className="text-xs text-ink-muted">Committing to a confidence first is how you find out what you really know.</p>
    </div>
  );
}

function StateBadge({ view }: { view: ExerciseView }) {
  const s = view.state;
  if (s.solved)
    return (
      <Badge tone="correct" icon={<CheckIcon className="size-3" strokeWidth={2.25} />}>
        Solved
      </Badge>
    );
  if (s.movedOn) return <Badge tone="hint">Moved on, comes back later</Badge>;
  if (s.done) return <Badge tone="neutral">Answered</Badge>;
  return <Badge tone="outline">{view.required ? "To do" : "Optional"}</Badge>;
}

export function ExerciseCard({ view }: { view: ExerciseView }) {
  const uid = useId();
  const router = useRouter();
  const tutor = useTutor();
  const status = usePythonStatus();
  const [pending, startTransition] = useTransition();
  const startedAt = useRef<number>(0);
  const card = useRef<HTMLElement>(null);

  const a = view.answer;
  const prior = lastPayload(view);
  const done = view.state.done;
  const oneShot = ["predict", "recall", "breakit", "explain"].includes(view.kind) || view.target.mode !== "lesson";
  const locked = done && oneShot;

  const [selected, setSelected] = useState<string[]>(prior?.type === "choice" ? prior.selected : []);
  const [number, setNumber] = useState(prior?.type === "number" ? prior.input : "");
  const [working, setWorking] = useState(prior?.type === "number" ? (prior.working ?? "") : "");
  const [expression, setExpression] = useState(prior?.type === "expression" ? prior.input : "");
  const [rules, setRules] = useState<string[]>(prior?.type === "steps" ? prior.rules : a.type === "steps" ? a.lines.map(() => "") : []);
  // Code and written answers keep an unsaved draft in this browser.
  const draft = useSyncExternalStore(
    noSubscription,
    () => (a.type === "code" || a.type === "text" ? readDraft(view.key) : null),
    () => null,
  );
  const [codeEdit, setCode] = useState<string | null>(null);
  const code = codeEdit ?? (a.type === "code" ? draft : null) ?? (prior?.type === "code" ? prior.code : a.type === "code" ? a.starter : "");
  const [breakChoice, setBreakChoice] = useState(prior?.type === "breakit" ? prior.selected : "");
  const [textEdit, setText] = useState<string | null>(null);
  const text = textEdit ?? (a.type === "text" ? draft : null) ?? (prior?.type === "text" ? prior.body : "");
  const [confidence, setConfidence] = useState(50);
  // Code can be worked on in a full-screen split view, the prompt beside the editor.
  const [expanded, setExpanded] = useState(false);

  const [run, setRun] = useState<RunResult | null>(null);
  const [exprResult, setExprResult] = useState<ExpressionResult | null>(null);
  const [breakResult, setBreakResult] = useState<BreakitResult | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [grading, setGrading] = useState<Grading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Set when the grader cannot mark a written answer, so the lesson can still go on.
  const [graderDown, setGraderDown] = useState(false);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Start Python when a card that needs it comes into view. Expressions are checked with SymPy,
  // and some programs import it as the library version, so those warm it up too.
  const needsPython = a.type === "code" || a.type === "breakit" || a.type === "expression";
  const sympySource = a.type === "code" ? `${a.starter}\n${a.tests}` : a.type === "breakit" ? `${a.code}\n${a.broken}` : "";
  const needsSympy = a.type === "expression" || /\b(?:import|from)\s+sympy\b/.test(sympySource);
  useEffect(() => {
    if (!needsPython || !card.current || locked) return;
    const el = card.current;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        void python().warm({ sympy: needsSympy });
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [needsPython, needsSympy, locked]);

  // The tutor reads the learner's current work with a hint request.
  const readWork = (): string | null => {
    switch (a.type) {
      case "code":
        return code;
      case "expression":
        return expression;
      case "number":
        return [number && `Answer: ${number}`, working && `Working: ${working}`].filter(Boolean).join("\n") || null;
      case "steps":
        return rules.map((r, i) => `Line ${i + 1}: ${r || "(no rule chosen)"}`).join("\n");
      case "text":
        return text || null;
      default:
        return null;
    }
  };
  const workRef = useRef<() => string | null>(() => null);
  useEffect(() => {
    workRef.current = readWork;
  });
  const log = useMemo<TutorEntry[]>(
    () =>
      view.hintLog.flatMap((h) => [
        ...(h.messageHtml ? [{ role: "learner" as const, html: h.messageHtml }] : []),
        { role: "tutor" as const, html: h.html, rung: h.rung, rungName: h.rungName, source: h.source },
      ]),
    [view.hintLog],
  );
  const register = tutor?.register;
  useEffect(() => {
    if (!register || view.target.mode !== "lesson") return;
    return register({
      key: view.key,
      exerciseId: view.target.exerciseId,
      title: view.title ?? KIND_LABELS[view.kind],
      hints: view.hints,
      solved: view.state.solved,
      log,
      ladderLeft: view.ladderLeft,
      getWork: () => workRef.current(),
    });
  }, [register, view.key, view.target, view.title, view.kind, view.hints, view.state.solved, log, view.ladderLeft]);

  const duration = () => (startedAt.current ? Date.now() - startedAt.current : null);

  function submit(input: Parameters<typeof answerExercise>[2]) {
    setError(null);
    const conf = view.asksConfidence ? confidence : null;
    startTransition(async () => {
      const t = view.target;
      const res =
        t.mode === "lesson"
          ? await answerExercise(t.lessonCode, t.exerciseId, input, conf, duration())
          : t.mode === "review"
            ? await answerReview(t.cardId, t.variant, input, conf, duration())
            : t.mode === "check"
              ? await answerCheck(t.lessonCode, t.cardId, t.variant, input, conf, duration())
              : await answerPlacement(t.course, t.cardId, t.variant, input, conf, duration());
      if (!res.ok) setError(res.error);
      else {
        setOutcome({ correct: res.correct, message: res.message, ratio: res.ratio });
        // A review leaves the queue once answered; the page keeps it on screen with its answer.
        if (t.mode === "review") router.replace(`/review?last=${encodeURIComponent(t.cardId)}`, { scroll: false });
      }
    });
  }

  async function check() {
    setError(null);
    setOutcome(null);
    try {
      switch (a.type) {
        case "choice":
          if (selected.length === 0) return setError("Choose an option first.");
          return submit({ type: "choice", selected });
        case "number":
          if (!number.trim()) return setError("Enter a number first.");
          return submit({ type: "number", input: number, working: working || undefined });
        case "steps":
          if (rules.some((r) => !r)) return setError("Choose a rule for every line.");
          return submit({ type: "steps", rules });
        case "expression": {
          if (!expression.trim()) return setError("Enter an expression first.");
          setBusy(status.state === "ready" ? "Checking" : "Starting SymPy, which takes a few seconds the first time");
          const r = await python().checkExpression({
            input: expression,
            symbols: a.symbols,
            points: a.points,
            values: a.values,
            form: a.form,
          });
          setBusy(null);
          setExprResult(r);
          if (r.status === "unparsed" || r.status === "empty" || r.status === "unknown-names") {
            // Nothing to record: the expression could not be compared.
            return setError(r.message ?? "The expression could not be read.");
          }
          return submit({ type: "expression", input: expression, status: r.status, message: r.message });
        }
        case "code": {
          setBusy(status.state === "ready" ? "Running the tests" : "Starting Python, which takes a few seconds the first time");
          const r = await python().run({ code, tests: a.tests, maxSteps: a.maxSteps, stdin: a.stdin, files: a.files });
          setBusy(null);
          setRun(r);
          writeDraft(view.key, code);
          return submit({
            type: "code",
            code,
            passed: r.passed,
            tests: r.tests.map((t) => ({ name: t.name, description: t.description, passed: t.passed, message: t.message })),
            error: r.error ? { type: r.error.type, message: r.error.message, line: r.error.line ?? null } : null,
            output: r.output,
          });
        }
        case "breakit": {
          if (!breakChoice) return setError("Choose what you expect first.");
          setBusy(status.state === "ready" ? "Running the changed program" : "Starting Python, which takes a few seconds the first time");
          const r = await python().breakit({ code: a.code, broken: a.broken, options: a.options.map((o) => ({ id: o.id, when: o.when })) });
          setBusy(null);
          setBreakResult(r);
          return submit({ type: "breakit", selected: breakChoice, matches: r.matches });
        }
        default:
          return;
      }
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "Something went wrong while checking.");
    }
  }

  async function runOnly() {
    if (a.type !== "code") return;
    setError(null);
    setBusy(status.state === "ready" ? "Running" : "Starting Python, which takes a few seconds the first time");
    try {
      const r = await python().run({ code, maxSteps: a.maxSteps, stdin: a.stdin, files: a.files });
      setRun(r);
      writeDraft(view.key, code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The code could not run.");
    } finally {
      setBusy(null);
    }
  }

  async function submitText() {
    if (view.target.mode !== "lesson") return;
    const target = view.target;
    setError(null);
    writeDraft(view.key, text);
    setBusy("Reading your answer. This takes up to a minute.");
    try {
      const res = await fetch("/api/tutor/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lesson: target.lessonCode, exercise: target.exerciseId, body: text, durationMs: duration() }),
      });
      const body = (await res.json()) as ({ ok: true } & Grading) | { ok: false; error: string };
      if (!body.ok) {
        setError(body.error);
        if (res.status === 503 || res.status === 409 || res.status === 502) setGraderDown(true);
      } else {
        setGrading(body);
        router.refresh();
      }
    } catch {
      setError("The grader could not be reached. Your text is kept here.");
      setGraderDown(true);
    } finally {
      setBusy(null);
    }
  }

  function skip() {
    if (view.target.mode !== "lesson") return;
    const t = view.target;
    startTransition(async () => {
      const res = await moveOn(t.lessonCode, t.exerciseId);
      if (!res.ok) setError(res.error);
    });
  }

  // After a reload, a one-shot item still says how it went.
  const shown: Outcome =
    outcome ?? (done && oneShot && view.state.correct !== null ? { correct: view.state.correct, message: null, ratio: null } : null);
  // Lesson files write maths between dollar signs, so the message is rendered with them.
  const failMessage = shown?.message ?? (a.type === "expression" ? exprResult?.message : undefined) ?? null;

  const titleId = `${uid}-title`;
  const working_ = pending || busy !== null;
  const words = wordCount(text);
  const canMoveOn =
    view.target.mode === "lesson" && !done && (view.state.attempts > 0 || view.state.hintsUsed > 0 || graderDown);

  const KindIcon = KIND_ICONS[view.kind];
  const heading = view.title ?? KIND_LABELS[view.kind];
  const hintButton =
    view.hints && tutor && view.target.mode === "lesson" ? (
      <Button
        variant="ghost"
        onClick={() => tutor.openFor(view.key)}
        aria-label={view.state.solved ? "Talk it through with the tutor" : "Ask the tutor for a hint"}
      >
        <HintIcon className="size-4" />
        {view.state.solved ? "Talk it through" : view.ladderLeft === 5 ? "Hint" : `Hint (${5 - view.ladderLeft} of 5 used)`}
      </Button>
    ) : null;
  const workbench = (fill: boolean) =>
    a.type === "code" ? (
      <CodeWorkbench
        view={a}
        label={`Code for ${heading}`}
        code={code}
        onCode={(v) => {
          setCode(v);
          writeDraft(view.key, v);
        }}
        readOnly={working_}
        onRun={() => void runOnly()}
        onCheck={locked ? null : () => void check()}
        status={status.state}
        busy={busy ?? (pending ? "Saving" : null)}
        run={run}
        fill={fill}
        onExpand={fill ? undefined : () => setExpanded(true)}
        onCollapse={fill ? () => setExpanded(false) : undefined}
        onReset={
          code !== a.starter
            ? () => {
                setCode(a.starter);
                writeDraft(view.key, a.starter);
              }
            : undefined
        }
      />
    ) : null;

  const outcomeNotice =
    shown && a.type !== "text" ? (
      <Notice tone={shown.correct ? "correct" : "incorrect"} title={shown.correct ? "Correct" : oneShot ? "Not this time" : "Not yet"} role="status">
        {shown.correct
          ? view.kind === "estimate" && shown.ratio
            ? `Within range: your estimate is ${formatRatio(shown.ratio)} the answer.`
            : a.type === "code"
              ? "Every test passes."
              : null
          : failMessage
            ? <MathText text={failMessage} />
            : oneShot
              ? null
              : a.type === "code"
                ? "Read the message under the first failing test, change that line, and run the tests again."
                : "Look again, or ask for a hint."}
      </Notice>
    ) : null;

  const errorNotice = error ? (
    <Notice tone="warning" title="Check" role="alert">
      {error}
    </Notice>
  ) : null;

  return (
    <section
      ref={card}
      aria-labelledby={titleId}
      className={clsx(
        "not-prose my-10 flex flex-col overflow-hidden rounded-xl border bg-surface font-sans shadow-xs",
        view.state.solved ? "border-correct/40" : "border-rule",
      )}
      data-exercise={view.key}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule bg-inset/40 px-4 py-3 sm:px-5">
        <h3 id={titleId} className="flex min-w-0 items-center gap-3">
          <span
            className={clsx(
              "flex size-8 shrink-0 items-center justify-center rounded-md",
              view.state.solved ? "bg-correct-soft text-correct" : "bg-accent-soft text-accent",
            )}
          >
            <KindIcon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold text-ink-muted">{KIND_LABELS[view.kind]}</span>
            {view.title ? <span className="text-base leading-snug font-semibold text-ink">{view.title}</span> : null}
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {view.state.hintsUsed > 0 ? (
            <Badge tone="hint" icon={<HintIcon className="size-3" />}>
              <span className="tabular">{view.state.hintsUsed}</span> {view.state.hintsUsed === 1 ? "hint" : "hints"}
            </Badge>
          ) : null}
          <StateBadge view={view} />
        </div>
      </header>

      <div className="flex flex-col gap-5 px-4 py-5 sm:px-5">
        <div className="prose-derive max-w-none text-base [&_.katex]:text-[1.05em]">{view.prompt}</div>

        {a.type === "choice" ? (
          <ChoiceInput view={a} name={`${uid}-choice`} selected={selected} onChange={setSelected} disabled={locked || working_} />
        ) : null}
        {a.type === "number" ? (
          <NumberInput
            view={a}
            id={uid}
            value={number}
            onChange={setNumber}
            working={working}
            onWorking={setWorking}
            disabled={locked || working_ || (done && view.kind === "estimate")}
            estimate={view.kind === "estimate"}
          />
        ) : null}
        {a.type === "steps" ? <StepsInput view={a} id={uid} rules={rules} onChange={setRules} disabled={locked || working_ || view.state.solved} /> : null}
        {a.type === "expression" ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-expr`} className="text-sm font-semibold text-ink">
              Your expression
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {a.lhs ? <span className="text-base text-ink">{a.lhs}</span> : null}
              <input
                id={`${uid}-expr`}
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                disabled={locked || working_ || view.state.solved}
                autoComplete="off"
                spellCheck={false}
                className={clsx(inputClasses, "h-11 max-w-md flex-1 font-mono")}
              />
            </div>
            <p className="text-xs text-ink-muted">
              Type <code className="font-mono">*</code> to multiply, <code className="font-mono">/</code> to divide,{" "}
              <code className="font-mono">^</code> or <code className="font-mono">**</code> for a power, and functions such as{" "}
              <code className="font-mono">sqrt( )</code> for a square root.
              {a.symbols.length ? ` Symbols: ${a.symbols.map((s) => s.name).join(", ")}.` : ""}
            </p>
            {exprResult?.latex ? (
              <p className="flex flex-wrap items-baseline gap-2 rounded-md bg-inset px-3 py-2 text-sm text-ink-muted">
                Read as: <Tex tex={exprResult.latex} className="text-base text-ink" />
              </p>
            ) : null}
          </div>
        ) : null}
        {a.type === "code" ? (
          expanded ? (
            <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-rule-strong bg-inset/50 px-4 py-5">
              <p className="text-sm text-ink-muted">This exercise is open in the full-screen editor.</p>
              <Button variant="secondary" size="sm" onClick={() => setExpanded(false)}>
                <CollapseIcon className="size-4" />
                Bring it back here
              </Button>
            </div>
          ) : (
            workbench(false)
          )
        ) : null}
        {a.type === "breakit" ? (
          <BreakitInput
            view={a}
            name={`${uid}-breakit`}
            selected={breakChoice}
            onSelect={setBreakChoice}
            disabled={locked || working_}
            result={breakResult}
          />
        ) : null}
        {a.type === "text" ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-rule bg-inset/50 px-4 py-3 text-sm text-ink">
              <p className="mb-1.5 font-semibold">What a good answer shows</p>
              <ul className="flex list-disc flex-col gap-1 pl-5">
                {a.rubric.map((r) => (
                  <li key={r.id}>{r.criterion}</li>
                ))}
              </ul>
            </div>
            <label htmlFor={`${uid}-text`} className="text-sm font-semibold text-ink">
              Your answer
            </label>
            <textarea
              id={`${uid}-text`}
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                writeDraft(view.key, e.target.value);
              }}
              disabled={working_}
              className={clsx(inputClasses, "resize-y py-3 font-serif text-lg leading-8")}
            />
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex h-1 max-w-48 flex-1 overflow-hidden rounded-full bg-inset">
                <span
                  className={clsx("h-full rounded-full", words > a.maxWords ? "bg-incorrect" : words >= a.minWords ? "bg-correct" : "bg-accent")}
                  style={{ width: `${Math.min(100, (100 * words) / a.maxWords)}%` }}
                />
              </span>
              <p className={clsx("tabular text-xs", words > a.maxWords ? "text-incorrect" : "text-ink-muted")}>
                {words} words; between {a.minWords} and {a.maxWords}.
              </p>
            </div>
          </div>
        ) : null}

        {view.asksConfidence && !locked && !done ? (
          <ConfidenceSlider id={`${uid}-confidence`} value={confidence} onChange={setConfidence} disabled={working_} />
        ) : null}

        {errorNotice}
        {outcomeNotice}

        {grading ? (
          <div className="flex flex-col gap-3">
            <Notice tone={grading.passed ? "correct" : "incorrect"} title={grading.passed ? "Meets every point" : "Not yet"} role="status">
              <div className="[&_p+p]:mt-2" dangerouslySetInnerHTML={{ __html: grading.feedbackHtml }} />
            </Notice>
            {a.type === "text" ? (
              <ul className="flex flex-col gap-1.5 text-sm">
                {a.rubric.map((r) => {
                  const c = grading.criteria.find((x) => x.id === r.id);
                  return (
                    <li key={r.id} className="flex gap-2">
                      <span className={clsx("shrink-0 font-semibold", c?.met ? "text-correct" : "text-incorrect")}>{c?.met ? "Shown:" : "Not yet:"}</span>
                      <span className="text-ink">{r.criterion}</span>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            <div className="rounded-lg border border-hint/30 bg-hint-soft px-4 py-3 text-sm">
              <p className="mb-1 text-xs font-semibold text-hint">A curious beginner asks</p>
              <div dangerouslySetInnerHTML={{ __html: grading.questionHtml }} />
            </div>
          </div>
        ) : null}

        {view.reveal ? (
          <div className="rounded-lg border border-rule bg-inset/60 px-4 py-4 sm:px-5">
            <p className="mb-2 text-xs font-semibold tracking-wide text-ink-muted uppercase">
              {view.state.solved || view.state.correct ? "Why" : "The answer, and why"}
            </p>
            <div className="prose-derive max-w-none text-base">{view.reveal}</div>
          </div>
        ) : null}
      </div>

      {a.type === "code" && !hintButton && !canMoveOn ? null : (
        <footer className="flex flex-wrap items-center gap-2 border-t border-rule bg-inset/30 px-4 py-3 sm:px-5">
          {a.type === "text" ? (
            <Button onClick={() => void submitText()} disabled={working_ || words < a.minWords || words > a.maxWords}>
              {view.state.attempts > 0 ? "Submit again" : "Submit"}
            </Button>
          ) : a.type !== "code" && !locked && !view.state.solved ? (
            <Button onClick={() => void check()} disabled={working_}>
              {a.type === "breakit" ? "Run it and see" : "Check"}
            </Button>
          ) : null}
          {hintButton}
          {canMoveOn ? (
            <Button variant="ghost" onClick={skip} disabled={working_}>
              Move on for now
            </Button>
          ) : null}
          {a.type !== "code" && (busy || pending) ? (
            <p className="text-sm text-ink-muted" role="status">
              {busy ?? "Saving"}
            </p>
          ) : null}
        </footer>
      )}

      {a.type === "code" ? (
        <Dialog.Root open={expanded} onOpenChange={setExpanded}>
          <Dialog.Portal>
            <Dialog.Content aria-describedby={undefined} className="fixed inset-0 z-50 flex flex-col bg-paper font-sans">
              <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-rule bg-surface px-3 sm:px-4">
                <Dialog.Title className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
                    <KindIcon className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-xs font-semibold text-ink-muted">{KIND_LABELS[view.kind]}</span>
                    <span className="truncate text-sm font-semibold text-ink">{heading}</span>
                  </span>
                </Dialog.Title>
                <div className="flex shrink-0 items-center gap-2">
                  <StateBadge view={view} />
                  <Dialog.Close asChild>
                    <Button variant="secondary" size="sm">
                      <CollapseIcon className="size-4" />
                      <span className="hidden sm:inline">Back to the lesson</span>
                      <span className="sr-only sm:hidden">Back to the lesson</span>
                    </Button>
                  </Dialog.Close>
                </div>
              </div>
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,2fr)_minmax(0,3fr)] lg:grid-cols-[minmax(22rem,30rem)_minmax(0,1fr)] lg:grid-rows-1">
                <section aria-label="Instructions" className="flex min-h-0 flex-col overflow-y-auto border-b border-rule bg-surface lg:border-r lg:border-b-0">
                  <div className="flex flex-col gap-5 px-5 py-5">
                    <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Instructions</p>
                    <div className="prose-derive max-w-none text-base [&_.katex]:text-[1.05em]">{view.prompt}</div>
                    {errorNotice}
                    {outcomeNotice}
                    {canMoveOn ? (
                      <div>
                        <Button variant="ghost" size="sm" onClick={skip} disabled={working_}>
                          Move on for now
                        </Button>
                      </div>
                    ) : null}
                  </div>
                  {view.hints && tutor && view.target.mode === "lesson" ? (
                    <div className="mt-auto border-t border-rule bg-inset/40 px-5 py-4">
                      <TutorThread forKey={view.key} />
                    </div>
                  ) : null}
                </section>
                <div className="min-h-0 p-2 sm:p-4">{expanded ? workbench(true) : null}</div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      ) : null}
    </section>
  );
}

function formatRatio(r: number): string {
  if (r >= 0.95 && r <= 1.05) return "about equal to";
  return r > 1 ? `${r.toFixed(1)} times` : `${(1 / r).toFixed(1)} times smaller than`;
}
