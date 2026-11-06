import "server-only";

import { lesson as lessonMeta } from "@/lib/curriculum/data";
import { RUNG_NAMES, type Exercise } from "@/lib/content/exercise-schema";
import { readLessonFile } from "@/lib/content/files";
import type { LoadedLesson } from "@/lib/content/lesson";
import { LINK_KINDS } from "@/lib/content/lesson-schema";
import { asAnswerPayload, type AnswerPayload } from "@/lib/learning/payloads";
import { PHASES, type Json } from "@/lib/store/types";

import { tutorText } from "./lesson-text";

/*
 * What the tutor is told. Three parts, kept apart on purpose:
 *
 * - the lesson context: the lesson's text with every reveal removed, its
 *   concepts and links, and the likely misconceptions. It is the same for
 *   every request in a lesson, so it is cached.
 * - the exercise block: only what the learner can see of the exercise, the
 *   checkers' diagnosis of the latest attempt, the learner's work, and the
 *   lesson's hint note for the requested rung.
 * - the private reference: answers and reference solutions. Only the guard
 *   and the grader receive it; the tutor never does.
 */

export const PHASE_NAMES: Record<(typeof PHASES)[number], string> = {
  puzzle: "Puzzle",
  recall: "Recall",
  explore: "Explore",
  derive: "Derive",
  build: "Build",
  explain: "Explain and connect",
};

function conceptName(id: string): string {
  const code = id.split("/")[0] ?? "";
  const file = readLessonFile(code);
  if (file.ok) {
    const c = file.file.concepts.taught.find((t) => t.id === id);
    if (c) return `${c.name} (${code}): ${c.summary}`;
  }
  return id;
}

const contextCache = new Map<string, { key: string; text: string }>();

/** The cached part of every tutor request in a lesson. */
export function lessonContext(lesson: LoadedLesson): string {
  const key = JSON.stringify([lesson.file, lesson.sources, lesson.tutor.misconceptions]);
  const hit = contextCache.get(lesson.code);
  if (hit && hit.key === key) return hit.text;

  const f = lesson.file;
  const lines: string[] = [];
  lines.push(`<lesson code="${lesson.code}">`);
  lines.push(`# ${lesson.code} ${f.title}`, "", f.summary, "");
  lines.push("## Concepts this lesson teaches");
  for (const c of f.concepts.taught) lines.push(`- ${c.name}: ${c.summary}`);
  if (f.concepts.used.length) {
    lines.push("", "## Concepts from earlier lessons that it uses");
    for (const id of f.concepts.used) lines.push(`- ${conceptName(id)}`);
  }
  const links: string[] = [];
  for (const kind of LINK_KINDS) {
    for (const link of f.links[kind]) {
      const title = lessonMeta(link.lesson)?.title ?? link.lesson;
      links.push(`- ${kind} ${link.lesson} (${title}): ${link.bridge}`);
    }
  }
  if (links.length) lines.push("", "## Links to other lessons", ...links);
  if (lesson.tutor.misconceptions.length) {
    lines.push("", "## Likely misconceptions");
    for (const m of lesson.tutor.misconceptions) {
      lines.push(`- Belief: ${m.belief}`, `  Why it is tempting: ${m.why}`, `  Cue that shows it: ${m.cue}`);
    }
  }
  lines.push("", "## The lesson text, phase by phase");
  for (const phase of PHASES) {
    lines.push("", `### Phase: ${PHASE_NAMES[phase]}`, "", tutorText(lesson.sources[phase]));
  }
  lines.push("</lesson>");
  const text = lines.join("\n");
  contextCache.set(lesson.code, { key, text });
  return text;
}

/** What the learner can see of an exercise, in plain text for the tutor. */
export function exerciseBlock(ex: Exercise): string {
  const lines: string[] = [];
  lines.push(`<exercise id="${ex.id}" kind="${ex.kind}" phase="${PHASE_NAMES[ex.phase]}">`);
  if (ex.title) lines.push(`Title: ${ex.title}`);
  lines.push(`Concept: ${conceptName(ex.concept)}`, "", "Prompt:", ex.prompt);
  const a = ex.answer;
  switch (a.type) {
    case "code":
      if (a.starter.trim()) lines.push("", "Starter code given to the learner:", "```python", a.starter.trimEnd(), "```");
      lines.push("", "Tests the learner's code must pass (public):", "```python", a.tests.trimEnd(), "```");
      if (Object.keys(a.files).length) lines.push("", `Files the program can open: ${Object.keys(a.files).join(", ")}`);
      break;
    case "expression":
      if (a.symbols.length) lines.push("", `Symbols: ${a.symbols.map((s) => s.name).join(", ")}`);
      if (a.lhs) lines.push(`The answer box reads: $${a.lhs}$ = [learner's expression]`);
      if (a.form.message) lines.push(`Form required: ${a.form.message}`);
      break;
    case "number":
      if (a.unit) lines.push("", `The answer is a number in ${a.unit}.`);
      if ("factor" in a.tolerance) lines.push(`An estimate within a factor of ${a.tolerance.factor} counts as right.`);
      break;
    case "steps":
      lines.push("", `Start: $${a.start}$`, "Lines, each of which the learner justifies by choosing a rule:");
      a.lines.forEach((l, i) => lines.push(`  Line ${i + 1}: $${l.math}$`));
      lines.push("Rules the learner may choose from:");
      for (const r of a.rules) lines.push(`  - ${r.id}: ${r.label}`);
      break;
    case "text":
      lines.push("", "The written answer is checked against these criteria:");
      for (const r of a.rubric) lines.push(`  - ${r.criterion}`);
      break;
    case "choice":
      lines.push("", "Options:");
      for (const o of a.options) lines.push(`  - ${o.label}`);
      break;
    case "breakit":
      lines.push("", "The change made to the working program:", a.change);
      break;
  }
  lines.push("</exercise>");
  return lines.join("\n");
}

function describeCode(p: Extract<AnswerPayload, { type: "code" }>): string[] {
  const out: string[] = [];
  const failed = p.tests.filter((t) => !t.passed);
  if (p.error && p.tests.length === 0) {
    out.push(`The program stopped with ${p.error.type}${p.error.line ? ` on line ${p.error.line}` : ""}${p.error.message ? `: ${p.error.message}` : ", with no message"}`);
  }
  out.push(`${p.tests.length - failed.length} of ${p.tests.length} tests pass.`);
  for (const t of failed.slice(0, 6)) {
    out.push(`- Fails ${t.name} (${t.description})${t.message ? `: ${t.message}` : ""}`);
  }
  if (p.output.trim()) out.push("Printed output (start):", p.output.slice(0, 600));
  return out;
}

/**
 * The automatic checkers' findings on the latest attempt. These say what is
 * wrong, never what is right: for an estimate only the direction is given.
 */
export function diagnosis(ex: Exercise, latest: Json | null, correct: boolean | null): string {
  const p = asAnswerPayload(latest);
  if (!p) return "The learner has not checked an answer yet.";
  const lines: string[] = [];
  switch (p.type) {
    case "code":
      lines.push("Latest check of the learner's code:", ...describeCode(p));
      break;
    case "expression": {
      const said: Record<string, string> = {
        correct: "The expression is correct.",
        different: "The expression is not equal to what this step needs.",
        form: "The expression has the right value but not the form this step asks for.",
        unparsed: "The checker could not read the expression.",
        "unknown-names": "The expression uses names the step does not define.",
        empty: "The answer box was empty.",
      };
      lines.push(`Latest expression the learner entered: ${p.input}`, said[p.status] ?? p.status);
      if (p.message) lines.push(`Checker's message: ${p.message}`);
      break;
    }
    case "number": {
      lines.push(`Latest number the learner entered: ${p.input}`);
      if (correct === true) lines.push("It is within the accepted range.");
      else if (correct === false && ex.answer.type === "number") {
        const high = p.value > ex.answer.value;
        lines.push(
          `It is outside the accepted range: it is too ${high ? "high" : "low"}. ` +
            "Use the direction only from the fourth rung, and never say by how much.",
        );
      }
      if (p.working) lines.push("The learner's working:", p.working);
      break;
    }
    case "steps":
      lines.push(
        p.wrongLines.length === 0
          ? "Every line cites the right rule."
          : `The rule chosen is wrong on line${p.wrongLines.length > 1 ? "s" : ""} ${p.wrongLines.map((i) => i + 1).join(", ")}. ` +
              "Locate a line only from the fourth rung.",
      );
      break;
    case "text":
      lines.push("Latest written answer, as graded:", p.body);
      if (p.criteria.length) {
        lines.push("Criteria not yet met:");
        const unmet = p.criteria.filter((c) => !c.met).map((c) => c.id);
        lines.push(unmet.length ? unmet.map((id) => `  - ${id}`).join("\n") : "  (none)");
      }
      break;
    default:
      lines.push("The learner has answered.");
  }
  return lines.join("\n");
}

/** A rung's number and name, as the tutor and guard see it. */
export function rungLabel(rung: number): string {
  return `rung ${rung}, "${RUNG_NAMES[rung - 1] ?? "unknown"}"`;
}

/** Everything private about an exercise, for the guard and the grader only. */
export function privateReference(ex: Exercise): string {
  const a = ex.answer;
  const lines: string[] = [`<reference exercise="${ex.id}">`];
  switch (a.type) {
    case "code":
      lines.push("Reference solution:", "```python", a.reference.trimEnd(), "```");
      break;
    case "expression":
      lines.push(`Reference expression (SymPy syntax): ${a.reference}`);
      if (a.accept.length) lines.push(`Also accepted: ${a.accept.join("; ")}`);
      break;
    case "number":
      lines.push(`Answer: ${a.value}${a.unit ? ` ${a.unit}` : ""}`);
      if ("factor" in a.tolerance) lines.push(`Accepted within a factor of ${a.tolerance.factor}.`);
      break;
    case "steps":
      a.lines.forEach((l, i) => {
        const rule = a.rules.find((r) => r.id === l.rule);
        lines.push(`Line ${i + 1} ($${l.math}$) follows by: ${rule?.label ?? l.rule}`);
      });
      break;
    case "text":
      lines.push("Model answer:", a.reference);
      break;
    case "choice": {
      const labels = a.options.filter((o) => a.correct.includes(o.id)).map((o) => o.label);
      lines.push(`Correct option${labels.length > 1 ? "s" : ""}: ${labels.join("; ")}`);
      break;
    }
    case "breakit":
      lines.push("The outcome is found by running the program.");
      break;
  }
  if (ex.explanation) lines.push("", "Explanation shown after the exercise is done:", ex.explanation);
  lines.push("</reference>");
  return lines.join("\n");
}

/** The lesson's authored hint for a rung, which the tutor adapts. */
export function authoredRung(lesson: LoadedLesson, ex: Exercise, rung: number): string | null {
  return lesson.tutor.exercises[ex.id]?.rungs[rung - 1] ?? null;
}

export function exerciseNotes(lesson: LoadedLesson, ex: Exercise): string | null {
  return lesson.tutor.exercises[ex.id]?.notes ?? null;
}
