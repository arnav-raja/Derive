import type { Exercise } from "@/lib/content/exercise-schema";
import { PHASES, type Attempt, type Json, type PhaseId, type PhaseProgress } from "@/lib/store/types";

/*
 * What the learner has done in a lesson, worked out from their attempts and
 * phase progress. Pure functions, shared by pages, actions and tests.
 */

export type ExerciseState = {
  attempts: number;
  /** The latest answer's correctness, or null when nothing has been checked. */
  correct: boolean | null;
  /** Ever answered correctly. */
  solved: boolean;
  /** Attempted enough to move on: answered, solved, or moved on after trying. */
  done: boolean;
  movedOn: boolean;
  hintsUsed: number;
  lastPayload: Json | null;
  lastAt: string | null;
};

const EMPTY: ExerciseState = {
  attempts: 0,
  correct: null,
  solved: false,
  done: false,
  movedOn: false,
  hintsUsed: 0,
  lastPayload: null,
  lastAt: null,
};

export function isHintAttempt(a: Attempt): boolean {
  const p = a.payload;
  return typeof p === "object" && p !== null && !Array.isArray(p) && "hint" in p;
}

function payloadFlag(a: Attempt, key: string): boolean {
  const p = a.payload;
  return typeof p === "object" && p !== null && !Array.isArray(p) && p[key] === true;
}

/** Kinds that are done after a single answer, right or wrong. */
const ONE_SHOT = new Set(["predict", "recall", "breakit", "explain"]);

export function exerciseState(ex: Pick<Exercise, "id" | "kind">, attempts: Attempt[]): ExerciseState {
  // attempts arrive newest first
  const own = attempts.filter((a) => a.exerciseId === ex.id && a.cardId === null);
  if (own.length === 0) return EMPTY;
  const hints = own.filter(isHintAttempt);
  const answers = own.filter((a) => !isHintAttempt(a));
  const movedOn = answers.some((a) => payloadFlag(a, "movedOn"));
  const graded = answers.filter((a) => !payloadFlag(a, "movedOn"));
  const latest = graded[0] ?? null;
  const solved = graded.some((a) => a.correct === true);
  const done = solved || movedOn || (ONE_SHOT.has(ex.kind) && graded.length > 0);
  return {
    attempts: graded.length,
    correct: latest ? latest.correct : null,
    solved,
    done,
    movedOn,
    hintsUsed: hints.length,
    lastPayload: latest?.payload ?? null,
    lastAt: latest?.createdAt ?? null,
  };
}

/** The hints given on an exercise, oldest first. */
export function hintsFrom(attempts: Attempt[], exerciseId: string) {
  return attempts
    .filter((a) => a.exerciseId === exerciseId && a.cardId === null && isHintAttempt(a))
    .map((a) => {
      const p = a.payload as { hint: number; source?: string; text?: string; message?: string };
      return { rung: Number(p.hint), source: p.source ?? "notes", text: p.text ?? "", message: p.message ?? "" };
    })
    .reverse();
}

export function exerciseStates(exercises: Exercise[], attempts: Attempt[]): Map<string, ExerciseState> {
  return new Map(exercises.map((ex) => [ex.id, exerciseState(ex, attempts)]));
}

export type PhaseState = "locked" | "available" | "started" | "completed";

export type LessonProgress = {
  phases: Record<PhaseId, PhaseState>;
  /** The first phase not yet completed, or null when the lesson is complete. */
  current: PhaseId | null;
  begun: boolean;
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
};

export function lessonProgress(rows: PhaseProgress[]): LessonProgress {
  const byPhase = new Map(rows.map((r) => [r.phase, r]));
  const phases = {} as Record<PhaseId, PhaseState>;
  let previousCompleted = true;
  let current: PhaseId | null = null;
  for (const phase of PHASES) {
    const row = byPhase.get(phase);
    let state: PhaseState;
    if (row?.status === "completed") state = "completed";
    else if (row) state = "started";
    else state = previousCompleted ? "available" : "locked";
    phases[phase] = state;
    if (state !== "completed" && current === null) current = phase;
    previousCompleted = state === "completed";
  }
  const puzzle = byPhase.get("puzzle");
  const explain = byPhase.get("explain");
  return {
    phases,
    current,
    begun: Boolean(puzzle),
    completed: explain?.status === "completed",
    startedAt: puzzle?.startedAt ?? null,
    completedAt: explain?.status === "completed" ? explain.completedAt : null,
  };
}

/** Required exercises in the phase that are not yet done. */
export function outstanding(exercises: Exercise[], phase: PhaseId, states: Map<string, ExerciseState>): Exercise[] {
  return exercises.filter((e) => e.phase === phase && e.required && !states.get(e.id)?.done);
}

export function nextPhase(phase: PhaseId): PhaseId | null {
  const i = PHASES.indexOf(phase);
  return i >= 0 && i < PHASES.length - 1 ? PHASES[i + 1]! : null;
}

export const PHASE_TITLES: Record<PhaseId, string> = {
  puzzle: "Puzzle",
  recall: "Recall",
  explore: "Explore",
  derive: "Derive",
  build: "Build",
  explain: "Explain and connect",
};

export const PHASE_PURPOSE: Record<PhaseId, string> = {
  puzzle: "A concrete question you cannot yet answer. Commit to a prediction and a confidence.",
  recall: "Retrieve what this lesson builds on. A miss opens a short re-teach.",
  explore: "Work with the figures and find the pattern. The formal name comes last.",
  derive: "Derive the key results step by step, each step checked.",
  build: "Build it from scratch against tests, break it on purpose, then compare.",
  explain: "Explain it simply, see what it unlocks, and finish a short mixed check.",
};
