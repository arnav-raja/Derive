import { z } from "zod";

import { PHASES } from "@/lib/store/types";

import { conceptId } from "./lesson-schema";

/*
 * The schema of content/lessons/<code>/exercises.yaml. Every exercise has a
 * public part, sent to the browser, and a private part (answers, reference
 * solutions, wrong solutions, explanations) that only server code reads.
 * src/lib/content/public.ts draws the line between the two.
 */

export const itemId = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: "Ids are lower-case words joined by hyphens." });

/** Markdown with KaTeX maths ($...$ and $$...$$). */
const md = z.string().trim().min(1);

export const EXERCISE_KINDS = [
  "predict",
  "recall",
  "step",
  "proof",
  "build",
  "breakit",
  "estimate",
  "debug",
  "explain",
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

/** Kinds where the learner produces the idea, which counts as mastery evidence. */
export const PRODUCE_KINDS: ExerciseKind[] = ["step", "proof", "build", "debug"];

/** Kinds that offer the five-rung hint ladder. Predictions and recall never do. */
export const HINT_KINDS: ExerciseKind[] = ["step", "proof", "build", "debug", "estimate"];

const option = z.object({ id: itemId, label: md });

export const choiceAnswer = z.object({
  type: z.literal("choice"),
  options: z.array(option).min(2).max(6),
  /** Private. */
  correct: z.array(itemId).min(1),
  multiple: z.boolean().default(false),
});

export const numberTolerance = z.union([
  z.object({ abs: z.number().nonnegative() }).strict(),
  z.object({ rel: z.number().positive().max(1) }).strict(),
  /** Accepted when value / factor <= answer <= value * factor. */
  z.object({ factor: z.number().min(1.01).max(100) }).strict(),
]);

export const numberAnswer = z.object({
  type: z.literal("number"),
  /** Private. */
  value: z.number(),
  tolerance: numberTolerance.default({ rel: 1e-6 }),
  /** Shown beside the input, for example "s" or "FLOP". */
  unit: z.string().optional(),
});

const symbol = z.object({
  name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/),
  positive: z.boolean().default(false),
  integer: z.boolean().default(false),
});

export const expressionAnswer = z.object({
  type: z.literal("expression"),
  /** The symbols the answer may use, with assumptions for SymPy. */
  symbols: z.array(symbol).default([]),
  /** Private. The expected expression in SymPy syntax. */
  reference: z.string().min(1),
  /** Shown before the input, in TeX, for example "\\log_{10} \\sqrt{LH} =". */
  lhs: z.string().optional(),
  /** Private. Inputs the checker must accept, verified by check:exercises. */
  accept: z.array(z.string().min(1)).default([]),
  /** Private. Inputs the checker must reject, such as restating the previous line. */
  reject: z.array(z.string().min(1)).default([]),
  /** Shape requirements, so restating the previous line does not count. */
  form: z
    .object({
      expanded: z.boolean().optional(),
      factored: z.boolean().optional(),
      /** No division by anything that contains a letter, so an unsimplified fraction does not count. */
      polynomial: z.boolean().optional(),
      /** The named letter appears only inside one squared bracket, as in 3(x - 4)^2 + 14. */
      completedSquare: z.string().optional(),
      /** Subexpressions, in SymPy syntax, that must not appear. */
      forbid: z.array(z.string().min(1)).optional(),
      /** Subexpressions that must appear. */
      require: z.array(z.string().min(1)).optional(),
      /** At most this many operations, counted on the answer as typed, so a fraction left uncancelled does not count. */
      maxOps: z.number().int().positive().optional(),
      /** Said when the shape is wrong but the value is right. */
      message: md.optional(),
    })
    .default({}),
});

export const codeAnswer = z.object({
  type: z.literal("code"),
  starter: z.string().default(""),
  /** Public. Python tests: functions named test_* with a docstring each. */
  tests: z.string().min(1),
  /** Private. Must pass every test. */
  reference: z.string().min(1),
  /** Private. Each must fail at least one test. */
  wrong: z.array(z.object({ code: z.string().min(1), why: md })).min(1),
  /** Files the program can open, by name. */
  files: z.record(z.string().regex(/^[A-Za-z0-9_.-]+$/), z.string()).default({}),
  /** Lines that input() returns, in order. */
  stdin: z.array(z.string()).default([]),
  /** A budget of traced line events, so a loop that never ends is stopped. */
  maxSteps: z.number().int().positive().max(20_000_000).default(2_000_000),
});

export const breakitAnswer = z.object({
  type: z.literal("breakit"),
  /** The working program. */
  code: z.string().min(1),
  /** The same program with one change. */
  broken: z.string().min(1),
  /** The change, in words. */
  change: md,
  /**
   * Possible outcomes. Each `when` is a Python expression evaluated after the
   * broken program runs, with its variables in scope plus `base` (the working
   * run's variables), `error` (the exception's type name, or None) and
   * `output` (what it printed). Exactly one must hold.
   */
  options: z
    .array(z.object({ id: itemId, label: md, when: z.string().min(1) }))
    .min(2)
    .max(6),
});

export const textAnswer = z.object({
  type: z.literal("text"),
  /** Public: what the rubric checks. */
  rubric: z.array(z.object({ id: itemId, criterion: md })).min(2).max(6),
  /** Private. A model answer for the grader, never for the tutor. */
  reference: md,
  minWords: z.number().int().positive().default(40),
  maxWords: z.number().int().positive().default(400),
});

export const stepsAnswer = z.object({
  type: z.literal("steps"),
  /** The rules a step may cite; `name` is a short name for the menu, beside the full label. */
  rules: z.array(z.object({ id: itemId, name: z.string().min(1).max(32).optional(), label: md })).min(2).max(10),
  /** The starting expression, in TeX. */
  start: z.string().min(1),
  /** Each line follows from the one before; the cited rule is private. */
  lines: z.array(z.object({ math: z.string().min(1), rule: itemId })).min(2).max(12),
});

export const answerSchema = z.discriminatedUnion("type", [
  choiceAnswer,
  numberAnswer,
  expressionAnswer,
  codeAnswer,
  breakitAnswer,
  textAnswer,
  stepsAnswer,
]);
export type Answer = z.infer<typeof answerSchema>;
export type AnswerType = Answer["type"];

/** Which answer types each kind may use. */
export const KIND_ANSWERS: Record<ExerciseKind, AnswerType[]> = {
  predict: ["choice", "number"],
  recall: ["choice", "number", "expression"],
  step: ["expression"],
  proof: ["steps", "text"],
  build: ["code"],
  breakit: ["breakit"],
  estimate: ["number"],
  debug: ["code"],
  explain: ["text"],
};

/** A review question: a different question on the same idea each time. */
export const variantSchema = z.object({
  prompt: md,
  answer: z.discriminatedUnion("type", [choiceAnswer, numberAnswer, expressionAnswer, codeAnswer]),
  /** Private until answered. */
  explanation: md.optional(),
});
export type Variant = z.infer<typeof variantSchema>;

export const exerciseSchema = z
  .object({
    id: itemId,
    phase: z.enum(PHASES),
    kind: z.enum(EXERCISE_KINDS),
    concept: conceptId,
    /**
     * Other concepts this exercise also shows, for mastery evidence: an
     * explain-back usually covers the lesson's main ideas, and a build often
     * produces more than one.
     */
    covers: z.array(conceptId).default([]),
    title: z.string().min(3).optional(),
    prompt: md,
    answer: answerSchema,
    /** Private until answered: why the answer is what it is. */
    explanation: md.optional(),
    /** Ask for a confidence before checking. Defaults to on for predictions and estimates. */
    confidence: z.boolean().optional(),
    /** Must be attempted before the phase can be completed. */
    required: z.boolean().default(true),
    /** Turns the exercise into a review card with these variants. */
    review: z.object({ variants: z.array(variantSchema).min(2) }).optional(),
    /** Used by the placement check for this lesson. */
    placement: z.boolean().default(false),
  })
  .superRefine((ex, ctx) => {
    if (!KIND_ANSWERS[ex.kind].includes(ex.answer.type)) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "type"],
        message: `A ${ex.kind} exercise cannot have a ${ex.answer.type} answer.`,
      });
    }
    if (ex.kind === "estimate" && ex.answer.type === "number" && !("factor" in ex.answer.tolerance)) {
      ctx.addIssue({
        code: "custom",
        path: ["answer", "tolerance"],
        message: "An estimate is accepted within a factor, so its tolerance must be { factor }.",
      });
    }
  });
export type Exercise = z.infer<typeof exerciseSchema>;

/** The concepts an exercise is evidence for: its own, then any it also covers. */
export function evidenceConcepts(ex: Pick<Exercise, "concept" | "covers">): string[] {
  return [...new Set([ex.concept, ...(ex.covers ?? [])])];
}

export const exercisesFileSchema = z.object({ exercises: z.array(exerciseSchema).min(1) });
export type ExercisesFile = z.infer<typeof exercisesFileSchema>;

/** The confidence question is asked for predictions and estimates unless turned off. */
export function asksConfidence(ex: Pick<Exercise, "kind" | "confidence">): boolean {
  return ex.confidence ?? (ex.kind === "predict" || ex.kind === "estimate");
}

// tutor.yaml ------------------------------------------------------------------

/** The five rungs, in order: never more than one per request, and no sixth. */
export const RUNG_NAMES = [
  "A question back",
  "A pointer to the past",
  "A smaller case",
  "A located nudge",
  "A parallel example",
] as const;

export const tutorFileSchema = z.object({
  /** Likely misconceptions, for the tutor and the grader. */
  misconceptions: z
    .array(z.object({ id: itemId, belief: md, why: md, cue: md }))
    .default([]),
  /** The five authored rungs for each exercise that offers hints. */
  exercises: z.record(
    itemId,
    z.object({
      rungs: z.tuple([md, md, md, md, md]),
      /** What the checkers' diagnoses usually mean for this exercise. */
      notes: md.optional(),
    }),
  ),
  /** Questions a curious novice would ask in the explain-back. */
  novice: z.array(md).default([]),
});
export type TutorFile = z.infer<typeof tutorFileSchema>;

// checks.json -----------------------------------------------------------------

/**
 * Generated by `npm run check:exercises -- --write` and committed: values of
 * each reference expression at seeded sample points. The browser checks an
 * answer by evaluating it at the same points, so the expression itself never
 * leaves the server.
 */
export const checksFileSchema = z.object({
  version: z.literal(1),
  expressions: z.record(
    z.string(),
    z.object({
      /** A hash of the reference and symbols, to detect stale entries. */
      source: z.string(),
      points: z.array(z.record(z.string(), z.string())).min(1),
      values: z.array(z.string()).min(1),
    }),
  ),
  /**
   * For each build or debug exercise, what the tests report for its first
   * wrong solution. The leak tests use it as a realistic diagnosis.
   */
  runs: z
    .record(
      z.string(),
      z.object({
        tests: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
            passed: z.boolean(),
            message: z.string().nullable(),
          }),
        ),
        error: z.object({ type: z.string(), message: z.string(), line: z.number().nullable().optional() }).nullable(),
        output: z.string(),
      }),
    )
    .default({}),
});
export type ChecksFile = z.infer<typeof checksFileSchema>;

/** The key of an expression in checks.json: the exercise, or one of its variants. */
export function expressionKey(exerciseId: string, variant?: number): string {
  return variant === undefined ? exerciseId : `${exerciseId}#${variant}`;
}
