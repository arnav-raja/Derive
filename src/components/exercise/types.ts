import type { ReactNode } from "react";

import type { ExerciseKind } from "@/lib/content/exercise-schema";
import type { Json, PhaseId } from "@/lib/store/types";

/*
 * What the browser receives about an exercise: its public part, with Markdown
 * already rendered on the server. Answers, reference solutions, wrong
 * solutions and tutor notes are never part of a view.
 */

export type SymbolSpec = { name: string; positive?: boolean; integer?: boolean };

export type ChoiceView = {
  type: "choice";
  multiple: boolean;
  options: { id: string; label: ReactNode }[];
};

export type NumberView = { type: "number"; unit?: string; factor?: number };

export type ExpressionView = {
  type: "expression";
  symbols: SymbolSpec[];
  lhs?: ReactNode;
  form: Record<string, unknown>;
  points: Record<string, string>[];
  values: string[];
};

export type CodeView = {
  type: "code";
  starter: string;
  tests: string;
  maxSteps: number;
  files: Record<string, string>;
  stdin: string[];
};

export type BreakitView = {
  type: "breakit";
  code: string;
  broken: string;
  change: ReactNode;
  options: { id: string; label: ReactNode; when: string }[];
};

export type TextView = {
  type: "text";
  rubric: { id: string; criterion: ReactNode }[];
  minWords: number;
  maxWords: number;
};

export type StepsView = {
  type: "steps";
  /** `text` is the short name, or else the label as plain text, for a <select>. */
  rules: { id: string; name: string | null; label: ReactNode; text: string }[];
  start: ReactNode;
  lines: { math: ReactNode }[];
};

export type AnswerView = ChoiceView | NumberView | ExpressionView | CodeView | BreakitView | TextView | StepsView;

export type ExerciseStateView = {
  attempts: number;
  correct: boolean | null;
  solved: boolean;
  done: boolean;
  movedOn: boolean;
  hintsUsed: number;
  lastPayload: Json | null;
};

/** Where an answer goes: a lesson exercise, a review card or the mixed check. */
export type ExerciseTarget =
  | { mode: "lesson"; lessonCode: string; exerciseId: string }
  | { mode: "review"; cardId: string; variant: number }
  | { mode: "check"; cardId: string; variant: number; lessonCode: string }
  | { mode: "placement"; cardId: string; variant: number; course: string };

export type ExerciseView = {
  key: string;
  target: ExerciseTarget;
  kind: ExerciseKind;
  phase?: PhaseId;
  title?: string;
  prompt: ReactNode;
  answer: AnswerView;
  asksConfidence: boolean;
  hints: boolean;
  required: boolean;
  state: ExerciseStateView;
  /** Rendered on the server only once the exercise is done. */
  reveal?: ReactNode;
  /** Hints given so far, oldest first, rendered on the server. */
  hintLog: HintLogEntry[];
  /** Rungs of the ladder still to climb. */
  ladderLeft: number;
};

export type HintLogEntry = {
  rung: number;
  rungName: string;
  html: string;
  /** What the learner asked with the hint, as HTML. */
  messageHtml: string | null;
  source: "tutor" | "notes";
};

export const KIND_LABELS: Record<ExerciseKind, string> = {
  predict: "Predict",
  recall: "Recall",
  step: "Derivation step",
  proof: "Proof",
  build: "Build",
  breakit: "Break it",
  estimate: "Estimate",
  debug: "Debug",
  explain: "Explain",
};
