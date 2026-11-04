import "server-only";

import { z } from "zod";

import type { Answer } from "@/lib/content/exercise-schema";

import { checkChoice, checkNumber, checkSteps, parseNumber } from "./check";
import { trimPayload, type AnswerPayload } from "./payloads";

/*
 * Turns what the browser sends into a checked, recordable answer. Choices,
 * numbers and steps are checked here against the private key. Code, break-it
 * and expression answers arrive already checked by the Python harness in the
 * browser; Derive has one learner, so the result is recorded as reported.
 */

const testSchema = z.object({
  name: z.string().max(200),
  description: z.string().max(2000),
  passed: z.boolean(),
  message: z.string().max(4000).nullable(),
});

const errorSchema = z
  .object({ type: z.string().max(200), message: z.string().max(4000), line: z.number().nullable().optional() })
  .nullable();

export const answerInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("choice"), selected: z.array(z.string().max(80)).max(10) }),
  z.object({ type: z.literal("number"), input: z.string().max(200), working: z.string().max(4000).optional() }),
  z.object({
    type: z.literal("expression"),
    input: z.string().max(2000),
    status: z.enum(["correct", "different", "form", "unparsed", "unknown-names", "empty"]),
    message: z.string().max(1000).optional(),
  }),
  z.object({
    type: z.literal("code"),
    code: z.string().max(50_000),
    passed: z.boolean(),
    tests: z.array(testSchema).max(100),
    error: errorSchema,
    output: z.string().max(20_000),
  }),
  z.object({ type: z.literal("breakit"), selected: z.string().max(80), matches: z.array(z.string().max(80)).max(10) }),
  z.object({ type: z.literal("steps"), rules: z.array(z.string().max(80)).max(20) }),
]);
export type AnswerInput = z.infer<typeof answerInputSchema>;

export type CheckedAnswer = {
  correct: boolean;
  payload: AnswerPayload;
  /** Shown to the learner straight away. */
  message: string | null;
  /** For estimates: how far off, as a factor, shown once the item is done. */
  ratio?: number;
};

export function checkInput(answer: Answer, input: AnswerInput): CheckedAnswer | { error: string } {
  if (answer.type !== input.type) return { error: "That answer does not fit this question." };
  switch (input.type) {
    case "choice": {
      if (answer.type !== "choice") break;
      const ids = new Set(answer.options.map((o) => o.id));
      if (input.selected.length === 0) return { error: "Choose an option first." };
      if (input.selected.some((s) => !ids.has(s))) return { error: "That option is not in the question." };
      const r = checkChoice(answer, input.selected);
      return { correct: r.correct, payload: { type: "choice", selected: input.selected }, message: null };
    }
    case "number": {
      if (answer.type !== "number") break;
      const value = parseNumber(input.input);
      if (!Number.isFinite(value)) {
        return { error: "That is not a number Derive can read. Try forms like 3e23, 3 × 10^23 or 300000." };
      }
      const r = checkNumber(answer, value);
      const ratio = typeof r.detail?.ratio === "number" ? r.detail.ratio : undefined;
      return {
        correct: r.correct,
        payload: trimPayload({ type: "number", input: input.input, value, working: input.working }),
        message: null,
        ratio,
      };
    }
    case "steps": {
      if (answer.type !== "steps") break;
      if (input.rules.length !== answer.lines.length) return { error: "Choose a rule for every line." };
      const r = checkSteps(answer, input.rules);
      const wrong = (r.detail?.wrongLines as number[] | undefined) ?? [];
      const right = answer.lines.length - wrong.length;
      return {
        correct: r.correct,
        payload: { type: "steps", rules: input.rules, wrongLines: wrong },
        message: r.correct ? null : `${right} of ${answer.lines.length} lines cite the rule that justifies them.`,
      };
    }
    case "expression":
      if (answer.type !== "expression") break;
      return {
        correct: input.status === "correct",
        payload: trimPayload({ type: "expression", input: input.input, status: input.status, message: input.message }),
        message: null,
      };
    case "code":
      if (answer.type !== "code") break;
      return {
        correct: input.passed,
        payload: trimPayload({
          type: "code",
          code: input.code,
          passed: input.passed,
          tests: input.tests,
          error: input.error ?? null,
          output: input.output,
        }),
        message: null,
      };
    case "breakit": {
      if (answer.type !== "breakit") break;
      const ids = new Set(answer.options.map((o) => o.id));
      if (!ids.has(input.selected)) return { error: "That option is not in the question." };
      return {
        correct: input.matches.length === 1 && input.matches[0] === input.selected,
        payload: { type: "breakit", selected: input.selected },
        message: null,
      };
    }
  }
  return { error: "That answer does not fit this question." };
}

/** A plain statement of the correct answer, for review payloads and the Socratic tutor. */
export function answerText(answer: Answer): string {
  switch (answer.type) {
    case "choice":
      return answer.options
        .filter((o) => answer.correct.includes(o.id))
        .map((o) => o.label)
        .join("; ");
    case "number":
      return `${answer.value}${answer.unit ? ` ${answer.unit}` : ""}`;
    case "expression":
      return `an expression equivalent to ${answer.reference}`;
    default:
      return "(see the explanation)";
  }
}

/** What the learner answered, in words, for review payloads. */
export function inputText(answer: Answer, input: AnswerInput): string {
  switch (input.type) {
    case "choice":
      return answer.type === "choice"
        ? answer.options
            .filter((o) => input.selected.includes(o.id))
            .map((o) => o.label)
            .join("; ")
        : input.selected.join(", ");
    case "number":
    case "expression":
      return input.input;
    case "code":
      return input.code.slice(0, 3000) || "(no code)";
    case "breakit":
      return input.selected;
    case "steps":
      return input.rules.join(", ");
  }
}
