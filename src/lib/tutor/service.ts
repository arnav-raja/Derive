import "server-only";

import { HINT_KINDS, type Exercise, type Variant } from "@/lib/content/exercise-schema";
import type { LoadedLesson } from "@/lib/content/lesson";
import { hintsGiven, recordHint } from "@/lib/learning/service";
import { exerciseStates } from "@/lib/learning/state";
import type { Store, TutorMode as StoredMode } from "@/lib/store/types";

import { modelClient, type ModelClient } from "./anthropic";
import { tutorBudget, type Budget } from "./budget";
import { addUsage } from "./config";
import { authoredRung, diagnosis, exerciseNotes } from "./context";
import { rungName, tutorReply, type TutorMode, type TutorResult, type Turn } from "./reply";

/*
 * The tutor as the pages use it: picks the rung, keeps to the daily budget,
 * records every hint (they count against mastery evidence) and the cost of
 * every call.
 */

export type TutorAnswer = {
  ok: true;
  text: string;
  source: "tutor" | "notes";
  rung: number | null;
  rungName: string | null;
  /** Rungs still to climb on this exercise. */
  ladderLeft: number | null;
  /** Said beside the reply, for example when the budget is spent. */
  note: string | null;
  budget: { spentUsd: number; limitUsd: number };
};

export type TutorFailure = { ok: false; error: string };

export const NO_SIXTH_RUNG =
  "That was the last rung: there is no sixth. Keep at it, or move on. The item stays unmastered for now and comes back later as a different question.";

const BUDGET_NOTE = "Today's tutor budget is spent, so this comes from the lesson's own notes. It resets at midnight.";
const OFFLINE_NOTE = "The tutor is not connected, so this comes from the lesson's own notes.";
const FALLBACK_NOTE = "This comes from the lesson's own notes.";

function budgetView(b: Budget, extra = 0) {
  return { spentUsd: b.spentUsd + extra, limitUsd: b.limitUsd };
}

async function recordCost(
  store: Store,
  mode: StoredMode,
  lesson: LoadedLesson | null,
  ex: Exercise | null,
  rung: number | null,
  result: TutorResult,
) {
  const usage = addUsage(result.tutorUsage, result.guardUsage);
  if (result.costUsd === 0 && usage.inputTokens === 0 && usage.outputTokens === 0) return;
  await store.recordTutorSession({
    lessonCode: lesson?.code ?? null,
    exerciseId: ex?.id ?? null,
    mode,
    rung,
    summary: null,
    ...usage,
    costUsd: result.costUsd,
    guardBlocked: result.blocked,
  });
}

/** Unsolved exercises of a lesson: what the guard must keep hidden. */
async function unsolved(store: Store, lesson: LoadedLesson, except?: string): Promise<Exercise[]> {
  const attempts = await store.attempts({ lessonCode: lesson.code, limit: 1000 });
  const states = exerciseStates(lesson.exercises, attempts);
  return lesson.exercises.filter((e) => e.id !== except && !states.get(e.id)?.solved);
}

/** The next rung for an exercise: one more than the highest given so far. */
export function nextRung(given: { rung: number }[]): number | null {
  const highest = given.reduce((m, h) => Math.max(m, h.rung), 0);
  return highest >= 5 ? null : highest + 1;
}

export async function giveHint(
  store: Store,
  lesson: LoadedLesson,
  ex: Exercise,
  input: { message: string; work: string | null },
  client: ModelClient | null = modelClient(),
  now = new Date(),
): Promise<TutorAnswer | TutorFailure> {
  if (!HINT_KINDS.includes(ex.kind)) return { ok: false, error: "This exercise has no hints." };
  const [attempts, given, budget] = await Promise.all([
    store.attempts({ lessonCode: lesson.code, exerciseId: ex.id, limit: 200 }),
    hintsGiven(store, lesson.code, ex.id),
    tutorBudget(store, now),
  ]);
  const state = exerciseStates([ex], attempts).get(ex.id);
  if (state?.solved) return { ok: false, error: "You have solved this one. Ask about it instead." };

  const rung = nextRung(given);
  if (rung === null) {
    return {
      ok: true,
      text: NO_SIXTH_RUNG,
      source: "notes",
      rung: null,
      rungName: null,
      ladderLeft: 0,
      note: null,
      budget: budgetView(budget),
    };
  }
  const authored = authoredRung(lesson, ex, rung) ?? "Look again at what the exercise asks, and at what your work does now.";

  let result: TutorResult | null = null;
  let note: string | null = null;
  if (!client) note = OFFLINE_NOTE;
  else if (budget.exhausted) note = BUDGET_NOTE;
  else {
    const history: Turn[] = [];
    for (const h of given) {
      if (h.message) history.push({ role: "learner", text: h.message });
      history.push({ role: "tutor", text: h.text });
    }
    result = await tutorReply(client, {
      mode: "hint",
      lesson,
      exercise: ex,
      rung,
      message: input.message,
      work: input.work,
      diagnosis: diagnosis(ex, state?.lastPayload ?? null, state?.correct ?? null),
      history,
      note: authored,
      notes: exerciseNotes(lesson, ex),
      protect: [ex],
      fallback: authored,
      fallbackRung: rung,
    });
    if (result.source === "notes") note = FALLBACK_NOTE;
    await recordCost(store, "hint", lesson, ex, result.rung, result);
  }

  const text = result?.text ?? authored;
  const source = result?.source ?? "notes";
  const delivered = result?.rung ?? rung;
  await recordHint(store, lesson, ex, { rung: delivered, source, text, message: input.message });
  return {
    ok: true,
    text,
    source,
    rung: delivered,
    rungName: rungName(delivered),
    ladderLeft: 5 - Math.max(delivered, ...given.map((g) => g.rung)),
    note,
    budget: budgetView(budget, result?.costUsd ?? 0),
  };
}

/** A free conversation: about a solved exercise, about the lesson's text, or after a missed review. */
export async function talk(
  store: Store,
  input: {
    mode: Exclude<TutorMode, "hint">;
    lesson: LoadedLesson;
    exercise: Exercise | null;
    message: string;
    history: Turn[];
    extra?: string;
    protect?: Exercise[];
  },
  client: ModelClient | null = modelClient(),
  now = new Date(),
): Promise<TutorAnswer | TutorFailure> {
  const budget = await tutorBudget(store, now);
  if (!client) return { ok: false, error: "The tutor is not connected yet." };
  if (budget.exhausted) return { ok: false, error: "Today's tutor budget is spent. It resets at midnight." };
  const protect = input.protect ?? (await unsolved(store, input.lesson, input.exercise?.id));
  const history = input.history.slice(-12).map((t) => ({ role: t.role, text: t.text.slice(0, 3000) }));
  const result = await tutorReply(client, {
    mode: input.mode,
    lesson: input.lesson,
    exercise: input.exercise,
    rung: null,
    message: input.message.slice(0, 3000),
    work: null,
    diagnosis: null,
    history,
    note: null,
    notes: null,
    extra: input.extra,
    protect,
    fallback: "I could not write a reply to that which keeps the lesson's answers hidden. Try asking it another way.",
  });
  const stored: StoredMode = input.mode === "socratic" ? "socratic" : "hint";
  await recordCost(store, stored, input.lesson, input.exercise, null, result);
  return {
    ok: true,
    text: result.text,
    source: result.source,
    rung: null,
    rungName: null,
    ladderLeft: null,
    note: null,
    budget: budgetView(budget, result.costUsd),
  };
}

/** A review variant as an exercise of its own, so the guard can protect it. */
export function variantExercise(ex: Exercise, index: number): Exercise | null {
  const v = ex.review?.variants[index];
  if (!v) return null;
  return {
    ...ex,
    id: `${ex.id}-variant-${index + 1}`,
    prompt: v.prompt,
    answer: v.answer,
    explanation: v.explanation,
    review: undefined,
  };
}

/** The review question, the learner's answer and the explanation, for Socratic mode. */
export function reviewContext(
  variant: Variant,
  learnerAnswer: string,
  correctAnswer: string,
): string {
  return [
    "The review question:",
    variant.prompt,
    "",
    `The learner answered: ${learnerAnswer}`,
    `The correct answer: ${correctAnswer}`,
    variant.explanation ? `The explanation the learner has seen:\n${variant.explanation}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
