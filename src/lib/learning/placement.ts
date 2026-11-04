import "server-only";

import type { Exercise } from "@/lib/content/exercise-schema";
import { readyLesson, writtenLessons, type LoadedLesson } from "@/lib/content/lesson";
import { course as courseMeta } from "@/lib/curriculum/data";
import type { Attempt, ConceptPatch, Json, ReviewCard, Store } from "@/lib/store/types";

import { gradeFor, newCard } from "./reviews";

/*
 * Placement: a short adaptive check per early course. Lessons are tested in
 * order, each with its placement questions (a review variant of each
 * placement exercise). A lesson whose questions are all answered correctly,
 * and not as a guess, is skipped provisionally; a miss stops testing the
 * lessons that build on it. Skipped concepts must then be confirmed by spaced
 * reviews, so nothing rests on a single test.
 */

export const PLACEMENT_CONFIDENCE = 50;

export type PlacementQuestion = { lesson: LoadedLesson; ex: Exercise; cardId: string; variant: number };

export type PlacementState = {
  course: string;
  lessons: LoadedLesson[];
  results: Map<string, "passed" | "failed">;
  next: PlacementQuestion | null;
  answered: number;
  /** An upper bound on questions still to come, if every answer is right. */
  remaining: number;
  finished: boolean;
};

/** Placement questions: the last variant of each placement exercise, so reviews start elsewhere. */
export function placementQuestions(lesson: LoadedLesson): PlacementQuestion[] {
  return lesson.exercises
    .filter((e) => e.placement && e.review && e.review.variants.length >= 2)
    .map((ex) => ({ lesson, ex, cardId: `${lesson.code}/${ex.id}`, variant: ex.review!.variants.length - 1 }));
}

/** The ready lessons of a course that have placement questions, in course order. */
export function placementLessons(courseCode: string): LoadedLesson[] {
  const meta = courseMeta(courseCode);
  if (!meta) return [];
  const written = new Set(writtenLessons());
  return meta.lessons
    .filter((c) => written.has(c))
    .map((c) => readyLesson(c))
    .filter((l): l is LoadedLesson => l !== null && placementQuestions(l).length > 0);
}

/** Courses that offer placement: early courses with at least one placeable lesson. */
export function placementCourses(): string[] {
  return ["M1", "E1"].filter((c) => placementLessons(c).length > 0);
}

function passedAttempt(a: Attempt): boolean {
  return a.correct === true && (a.confidence === null || a.confidence >= PLACEMENT_CONFIDENCE);
}

export async function placementState(store: Store, courseCode: string): Promise<PlacementState> {
  const [learner, attempts] = await Promise.all([store.learner(), store.attempts({ kinds: ["placement"], limit: 500 })]);
  const lessons = placementLessons(courseCode);
  const codes = new Set(lessons.map((l) => l.code));
  const own = attempts.filter((a) => a.lessonCode && codes.has(a.lessonCode));
  const byCard = new Map<string, Attempt>();
  for (const a of own) if (a.cardId && !byCard.has(a.cardId)) byCard.set(a.cardId, a);

  const results = new Map<string, "passed" | "failed">();
  let next: PlacementQuestion | null = null;
  let remaining = 0;
  for (const lesson of lessons) {
    const reqs = lesson.file.links.requires.map((r) => r.lesson).filter((c) => codes.has(c));
    // A lesson is tested only if everything it requires in this course passed.
    if (reqs.some((r) => results.get(r) !== "passed")) continue;
    const qs = placementQuestions(lesson);
    const answers = qs.map((q) => byCard.get(q.cardId));
    if (answers.some((a) => a && !passedAttempt(a))) {
      results.set(lesson.code, "failed");
      continue;
    }
    if (answers.every(Boolean)) {
      results.set(lesson.code, "passed");
      continue;
    }
    const open = qs.filter((q) => !byCard.has(q.cardId));
    next ??= open[0] ?? null;
    remaining += open.length;
  }
  const finished = Boolean(learner.placement?.[courseCode]);
  return { course: courseCode, lessons, results, next: finished ? null : next, answered: byCard.size, remaining, finished };
}

/** Whether a placement question is the one the learner should be answering now. */
export async function isCurrentQuestion(store: Store, courseCode: string, cardId: string, variant: number): Promise<PlacementQuestion | null> {
  const state = await placementState(store, courseCode);
  const q = state.next;
  return q && q.cardId === cardId && q.variant === variant ? q : null;
}

/**
 * Records the outcome: passed lessons are skipped, their taught concepts are
 * provisional, and their review cards are created as provisional cards, due
 * in a few days, which two successful reviews confirm.
 */
export async function finishPlacement(store: Store, courseCode: string, now = new Date()): Promise<{ skipped: string[] }> {
  const [state, learner, cards, concepts] = await Promise.all([
    placementState(store, courseCode),
    store.learner(),
    store.cards(),
    store.concepts(),
  ]);
  const skipped = state.lessons.filter((l) => state.results.get(l.code) === "passed");
  const skippedConcepts = skipped.flatMap((l) => l.file.concepts.taught.map((c) => c.id));
  const at = now.toISOString();
  const known = new Map(concepts.map((c) => [c.conceptId, c]));

  const patches: ConceptPatch[] = skippedConcepts
    .filter((id) => !known.get(id)?.masteredAt)
    .map((id) => {
      const prev = known.get(id);
      const log = Array.isArray(prev?.evidence) ? prev.evidence : [];
      return { conceptId: id, provisional: true, evidence: [...log, { type: "placement", at, ref: courseCode }].slice(-30) as Json };
    });
  if (patches.length) await store.upsertConcepts(patches);

  const existing = new Set(cards.map((c) => c.cardId));
  const fresh: ReviewCard[] = [];
  for (const lesson of skipped) {
    for (const ex of lesson.exercises) {
      const cardId = `${lesson.code}/${ex.id}`;
      if (!ex.review || existing.has(cardId)) continue;
      // Rated as a hard success, so the first review comes back within days.
      fresh.push(newCard({ cardId, lessonCode: lesson.code, conceptId: ex.concept, grade: gradeFor({ correct: true, hintsUsed: 1 }), now, provisional: true }));
    }
  }
  if (fresh.length) await store.upsertCards(fresh);

  await store.updateLearner({
    placement: {
      ...learner.placement,
      [courseCode]: { takenAt: at, skippedConcepts, skippedLessons: skipped.map((l) => l.code) },
    },
  });
  return { skipped: skipped.map((l) => l.code) };
}
