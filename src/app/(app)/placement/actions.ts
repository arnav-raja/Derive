"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getStore } from "@/lib/auth";
import { answerInputSchema, answerText, checkInput, inputText, type AnswerInput } from "@/lib/learning/answer";
import { finishPlacement, isCurrentQuestion, placementCourses } from "@/lib/learning/placement";

import type { ActionResult, AnswerOutcome } from "../lessons/actions";

/*
 * Placement answers. Each is checked on the server like any other answer and
 * recorded as a placement attempt; nothing is revealed, because the questions
 * are a test of what is already known.
 */

export async function answerPlacement(
  course: string,
  cardId: string,
  variant: number,
  raw: AnswerInput,
  confidence: number | null,
  durationMs: number | null,
): Promise<AnswerOutcome> {
  if (!placementCourses().includes(course)) return { ok: false, error: "That placement check is not available." };
  const store = await getStore();
  const learner = await store.learner();
  if (learner.placement?.[course]) return { ok: false, error: "This placement check is already finished." };
  const q = await isCurrentQuestion(store, course, cardId, variant);
  if (!q) return { ok: false, error: "This question has moved on. Reload the page for the current one." };
  const v = q.ex.review?.variants[variant];
  if (!v) return { ok: false, error: "That question was not found." };
  const parsed = answerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That answer could not be read." };
  const checked = checkInput(v.answer, parsed.data);
  if ("error" in checked) return { ok: false, error: checked.error };
  await store.recordAttempt({
    lessonCode: q.lesson.code,
    exerciseId: q.ex.id,
    cardId,
    kind: "placement",
    correct: checked.correct,
    confidence: confidence === null ? null : Math.max(0, Math.min(100, Math.round(confidence))),
    payload: { variant, ...checked.payload, answerText: inputText(v.answer, parsed.data), correctText: answerText(v.answer) },
    durationMs: durationMs === null ? null : Math.max(0, Math.min(86_400_000, Math.round(durationMs))),
  });
  refresh();
  return { ok: true, correct: checked.correct, message: null, done: true, ratio: null };
}

/** Ends the check, at the end or whenever the learner says so, and records what it found. */
export async function endPlacement(course: string): Promise<ActionResult> {
  if (!placementCourses().includes(course)) return { ok: false, error: "That placement check is not available." };
  const store = await getStore();
  const learner = await store.learner();
  if (!learner.placement?.[course]) await finishPlacement(store, course);
  redirect(`/placement?course=${course}`);
}
