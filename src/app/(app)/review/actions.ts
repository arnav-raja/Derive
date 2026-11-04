"use server";

import { refresh } from "next/cache";

import { getStore } from "@/lib/auth";
import { loadLesson, readyLesson } from "@/lib/content/lesson";
import { answerInputSchema, answerText, checkInput, inputText, type AnswerInput } from "@/lib/learning/answer";
import { storedCheck } from "@/lib/learning/mixed-check";
import { TIME_ZONE, parseCardId, recordReview } from "@/lib/learning/service";
import { addDays, localDate, startOfLocalDay } from "@/lib/learning/time";
import type { Store } from "@/lib/store/types";

import type { AnswerOutcome } from "../lessons/actions";

/*
 * Answers to review cards, on the Review page and in a lesson's mixed check.
 * A review updates the card's schedule; a mixed-check answer does not, but a
 * miss brings that card back by tomorrow.
 */

function clampConfidence(c: number | null): number | null {
  return c === null ? null : Math.max(0, Math.min(100, Math.round(c)));
}

function clampDuration(d: number | null): number | null {
  return d === null ? null : Math.max(0, Math.min(86_400_000, Math.round(d)));
}

async function findCard(store: Store, cardId: string, variant: number) {
  const ref = parseCardId(cardId);
  const lesson = ref ? loadLesson(ref.lessonCode) : null;
  const ex = ref && lesson ? lesson.byId.get(ref.exerciseId) : undefined;
  const v = Number.isInteger(variant) ? ex?.review?.variants[variant] : undefined;
  if (!ref || !lesson || !ex?.review || !v) return null;
  const card = (await store.cards({ lessonCode: ref.lessonCode })).find((c) => c.cardId === cardId);
  return card ? { lesson, ex, variants: ex.review.variants.length, v, card } : null;
}

/** Answers the review card that is due, with the variant the page showed. */
export async function answerReview(
  cardId: string,
  variant: number,
  raw: AnswerInput,
  confidence: number | null,
  durationMs: number | null,
): Promise<AnswerOutcome> {
  const store = await getStore();
  const found = await findCard(store, cardId, variant);
  if (!found) return { ok: false, error: "That review was not found." };
  const { card, v, variants } = found;
  const now = new Date();
  if (new Date(card.due) > now) return { ok: false, error: "This review is not due; it may already be answered." };
  if (card.nextVariant % variants !== variant) {
    return { ok: false, error: "This question has changed since the page loaded. Reload for the current one." };
  }
  const parsed = answerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That answer could not be read." };
  const checked = checkInput(v.answer, parsed.data);
  if ("error" in checked) return { ok: false, error: checked.error };

  await recordReview(
    store,
    card,
    {
      correct: checked.correct,
      confidence: clampConfidence(confidence),
      variant,
      payload: { ...checked.payload, answerText: inputText(v.answer, parsed.data), correctText: answerText(v.answer) },
      durationMs: clampDuration(durationMs),
    },
    now,
  );
  return { ok: true, correct: checked.correct, message: checked.message, done: true, ratio: checked.ratio ?? null };
}

/** Answers one question of a lesson's mixed check. */
export async function answerCheck(
  lessonCode: string,
  cardId: string,
  variant: number,
  raw: AnswerInput,
  confidence: number | null,
  durationMs: number | null,
): Promise<AnswerOutcome> {
  const lesson = readyLesson(lessonCode);
  if (!lesson) return { ok: false, error: "That lesson is not available." };
  const store = await getStore();
  const row = (await store.progress(lesson.code)).find((r) => r.phase === "explain");
  if (!row) return { ok: false, error: "Start this phase first." };
  const items = storedCheck(row.state) ?? [];
  if (!items.some((i) => i.cardId === cardId && i.variant === variant)) {
    return { ok: false, error: "That question is not part of this check." };
  }
  const prior = await store.attempts({ lessonCode: lesson.code, kinds: ["check"], limit: 200 });
  if (prior.some((a) => a.cardId === cardId)) return { ok: false, error: "This question is already answered." };
  const found = await findCard(store, cardId, variant);
  if (!found) return { ok: false, error: "That question was not found." };
  const parsed = answerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That answer could not be read." };
  const checked = checkInput(found.v.answer, parsed.data);
  if ("error" in checked) return { ok: false, error: checked.error };

  const now = new Date();
  await store.recordAttempt({
    lessonCode: lesson.code,
    exerciseId: null,
    cardId,
    kind: "check",
    correct: checked.correct,
    confidence: clampConfidence(confidence),
    payload: {
      variant,
      ...checked.payload,
      answerText: inputText(found.v.answer, parsed.data),
      correctText: answerText(found.v.answer),
    },
    durationMs: clampDuration(durationMs),
  });
  if (!checked.correct) {
    // A miss is a sign the idea is slipping: its card comes back in tomorrow's reviews.
    const tomorrow = startOfLocalDay(addDays(localDate(now, TIME_ZONE), 1), TIME_ZONE);
    if (new Date(found.card.due) > tomorrow) {
      await store.upsertCards([{ ...found.card, due: tomorrow.toISOString() }]);
    }
  }
  refresh();
  return { ok: true, correct: checked.correct, message: checked.message, done: true, ratio: checked.ratio ?? null };
}
