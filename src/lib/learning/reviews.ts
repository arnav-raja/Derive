import { createEmptyCard, fsrs, Rating, type Card, type Grade } from "ts-fsrs";

import type { ReviewCard } from "@/lib/store/types";

/*
 * Spaced review with FSRS, aiming for 90% recall. Practice inside a lesson
 * gives each card its first rating, so the first review comes days later
 * rather than minutes later; learning steps are therefore switched off.
 */

export const TARGET_RETENTION = 0.9;

const scheduler = fsrs({
  request_retention: TARGET_RETENTION,
  maximum_interval: 3 * 365,
  enable_fuzz: true,
  enable_short_term: false,
});

export type GradeInput = {
  correct: boolean;
  hintsUsed?: number;
  /** 0 to 100, when the learner gave one. */
  confidence?: number | null;
};

/**
 * Hints are never punished, but they lower the credit for an item and bring
 * it back sooner: a hinted success counts as Hard.
 */
export function gradeFor({ correct, hintsUsed = 0, confidence = null }: GradeInput): Grade {
  if (!correct) return Rating.Again;
  if (hintsUsed > 0) return Rating.Hard;
  if (confidence !== null && confidence < 50) return Rating.Hard;
  if (confidence !== null && confidence >= 90) return Rating.Easy;
  return Rating.Good;
}

function toFsrs(card: ReviewCard): Card {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

function fromFsrs(base: ReviewCard, card: Card): ReviewCard {
  return {
    ...base,
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays: card.elapsed_days,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** A new card, rated once by the practice that created it. */
export function newCard(input: {
  cardId: string;
  lessonCode: string;
  conceptId: string;
  grade: Grade;
  now: Date;
  provisional?: boolean;
}): ReviewCard {
  const empty = createEmptyCard(input.now);
  const base: ReviewCard = {
    cardId: input.cardId,
    lessonCode: input.lessonCode,
    conceptId: input.conceptId,
    due: input.now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
    nextVariant: 0,
    provisional: input.provisional ?? false,
    createdAt: input.now.toISOString(),
  };
  return fromFsrs(base, scheduler.next(empty, input.now, input.grade).card);
}

/** The card after one review; the next review shows the next variant. */
export function reviewCard(card: ReviewCard, grade: Grade, now: Date): ReviewCard {
  const next = fromFsrs(card, scheduler.next(toFsrs(card), now, grade).card);
  return { ...next, nextVariant: card.nextVariant + 1 };
}

/** Brings a card forward so it is due now, for a recall round. */
export function dueNow(card: ReviewCard, now: Date): ReviewCard {
  return { ...card, due: now.toISOString() };
}

export function retrievability(card: ReviewCard, now: Date): number {
  if (!card.lastReview) return 0;
  return scheduler.get_retrievability(toFsrs(card), now, false);
}

/** Minutes a review session is expected to take, at about a minute a card. */
export function reviewMinutes(count: number): number {
  return Math.max(1, Math.round(count * 1.1));
}
