import "server-only";

import type {
  AnswerView,
  ExerciseStateView,
  ExerciseTarget,
  ExerciseView,
  HintLogEntry,
} from "@/components/exercise/types";
import type { ExerciseState } from "@/lib/learning/state";

import {
  HINT_KINDS,
  RUNG_NAMES,
  asksConfidence,
  expressionKey,
  type Answer,
  type ChecksFile,
  type Exercise,
} from "./exercise-schema";
import { labelToText } from "./plain-tex";
import type { LoadedLesson } from "./lesson";
import { renderInline, renderMarkdown, renderMarkdownHtml } from "./markdown";

/*
 * Builds what the browser may see of an exercise. This is the one place where
 * the line between public and private is drawn: answers, reference solutions,
 * wrong solutions, accepted and rejected inputs, and explanations stay here.
 */

function tex(source: string) {
  return renderInline(`$${source}$`);
}

/** An option's label, with the plain text that names it when the label holds maths. */
export function optionView(id: string, label: string) {
  return /\$[^$]+\$/.test(label) ? { id, label: renderInline(label), text: labelToText(label) } : { id, label: renderInline(label) };
}

export function publicAnswer(answer: Answer, checks: ChecksFile, key: string): AnswerView {
  switch (answer.type) {
    case "choice":
      return {
        type: "choice",
        multiple: answer.multiple,
        options: answer.options.map((o) => optionView(o.id, o.label)),
      };
    case "number":
      return {
        type: "number",
        unit: answer.unit,
        factor: "factor" in answer.tolerance ? answer.tolerance.factor : undefined,
      };
    case "expression": {
      const entry = checks.expressions[key];
      return {
        type: "expression",
        symbols: answer.symbols,
        lhs: answer.lhs ? tex(answer.lhs) : undefined,
        form: answer.form,
        points: entry?.points ?? [],
        values: entry?.values ?? [],
      };
    }
    case "code":
      return {
        type: "code",
        starter: answer.starter,
        tests: answer.tests,
        maxSteps: answer.maxSteps,
        files: answer.files,
        stdin: answer.stdin,
      };
    case "breakit":
      return {
        type: "breakit",
        code: answer.code,
        broken: answer.broken,
        change: renderMarkdown(answer.change),
        options: answer.options.map((o) => ({ ...optionView(o.id, o.label), when: o.when })),
      };
    case "text":
      return {
        type: "text",
        rubric: answer.rubric.map((r) => ({ id: r.id, criterion: renderInline(r.criterion) })),
        minWords: answer.minWords,
        maxWords: answer.maxWords,
      };
    case "steps":
      return {
        type: "steps",
        rules: answer.rules.map((r) => ({
          id: r.id,
          name: r.name ?? null,
          label: renderInline(r.label),
          text: r.name ?? labelToText(r.label),
        })),
        start: tex(answer.start),
        lines: answer.lines.map((l) => ({ math: tex(l.math) })),
      };
  }
}

function stateView(state: ExerciseState | undefined): ExerciseStateView {
  return {
    attempts: state?.attempts ?? 0,
    correct: state?.correct ?? null,
    solved: state?.solved ?? false,
    done: state?.done ?? false,
    movedOn: state?.movedOn ?? false,
    hintsUsed: state?.hintsUsed ?? 0,
    lastPayload: state?.lastPayload ?? null,
  };
}

/** The correct answer, said plainly, for the reveal after a one-shot item. */
function answerLine(answer: Answer): string | null {
  switch (answer.type) {
    case "choice": {
      const labels = answer.options.filter((o) => answer.correct.includes(o.id)).map((o) => o.label);
      return labels.length ? `**Answer:** ${labels.join("; ")}` : null;
    }
    case "number":
      return `**Answer:** ${formatNumber(answer.value)}${answer.unit ? ` ${answer.unit}` : ""}`;
    default:
      return null;
  }
}

export function formatNumber(value: number): string {
  if (value !== 0 && (Math.abs(value) >= 1e6 || Math.abs(value) < 1e-3)) {
    const [mantissa, exponent] = value.toExponential(3).split("e");
    // An exact whole number such as 1,048,576 keeps all its digits, which four figures would lose.
    if (Number.isInteger(value) && Math.abs(value) < 1e15 && Number(value.toExponential(3)) !== value) {
      return value.toLocaleString("en-GB");
    }
    const m = Number(mantissa).toString();
    return `$${m} \\times 10^{${Number(exponent)}}$`;
  }
  return value.toLocaleString("en-GB", { maximumFractionDigits: 6 });
}

function revealFor(ex: Exercise, state: ExerciseState | undefined) {
  if (!state?.done) return undefined;
  const parts: string[] = [];
  // Items that are answered once show the answer; items the learner builds or
  // derives show only the explanation, and only after they are done.
  if (["predict", "recall", "estimate"].includes(ex.kind)) {
    const line = answerLine(ex.answer);
    if (line) parts.push(line);
  }
  if (ex.explanation) parts.push(ex.explanation);
  return parts.length ? renderMarkdown(parts.join("\n\n")) : undefined;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** The hints given so far, as the tutor panel shows them. */
export function hintLogView(hints: { rung: number; source: string; text: string; message: string }[]): HintLogEntry[] {
  return hints.map((h) => ({
    rung: h.rung,
    rungName: RUNG_NAMES[h.rung - 1] ?? "Hint",
    html: renderMarkdownHtml(h.text),
    messageHtml: h.message ? `<p>${escapeHtml(h.message).replace(/\n/g, "<br>")}</p>` : null,
    source: h.source === "tutor" ? "tutor" : "notes",
  }));
}

export function exerciseView(
  lesson: LoadedLesson,
  ex: Exercise,
  state: ExerciseState | undefined,
  hints: { rung: number; source: string; text: string; message: string }[] = [],
): ExerciseView {
  const target: ExerciseTarget = { mode: "lesson", lessonCode: lesson.code, exerciseId: ex.id };
  const highest = hints.reduce((m, h) => Math.max(m, h.rung), 0);
  return {
    key: `${lesson.code}/${ex.id}`,
    target,
    kind: ex.kind,
    phase: ex.phase,
    title: ex.title,
    prompt: renderMarkdown(ex.prompt),
    answer: publicAnswer(ex.answer, lesson.checks, expressionKey(ex.id)),
    asksConfidence: asksConfidence(ex),
    hints: HINT_KINDS.includes(ex.kind),
    required: ex.required,
    state: stateView(state),
    reveal: revealFor(ex, state),
    hintLog: hintLogView(hints),
    ladderLeft: HINT_KINDS.includes(ex.kind) ? Math.max(0, 5 - highest) : 0,
  };
}

/** A review variant, as shown on the Review page or in the mixed check. */
export function variantView(
  lesson: LoadedLesson,
  ex: Exercise,
  variant: number,
  target: ExerciseTarget,
  revealed: { done: boolean; correct: boolean | null } | null = null,
): ExerciseView | null {
  const v = ex.review?.variants[variant];
  if (!v) return null;
  const done = revealed?.done ?? false;
  const reveal = done
    ? renderMarkdown(
        [answerLine(v.answer), v.explanation].filter((s): s is string => Boolean(s)).join("\n\n") ||
          "Checked.",
      )
    : undefined;
  return {
    key: `${lesson.code}/${ex.id}#${variant}`,
    target,
    kind: "recall",
    title: undefined,
    prompt: renderMarkdown(v.prompt),
    answer: publicAnswer(v.answer, lesson.checks, expressionKey(ex.id, variant)),
    asksConfidence: v.answer.type === "choice" || v.answer.type === "number",
    hints: false,
    required: true,
    state: {
      attempts: done ? 1 : 0,
      correct: revealed?.correct ?? null,
      solved: revealed?.correct === true,
      done,
      movedOn: false,
      hintsUsed: 0,
      lastPayload: null,
    },
    reveal,
    hintLog: [],
    ladderLeft: 0,
  };
}
