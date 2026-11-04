import "server-only";

import type { Grade } from "ts-fsrs";

import { PRODUCE_KINDS, evidenceConcepts, type Exercise } from "@/lib/content/exercise-schema";
import { loadLesson, writtenLessons, isReady, type LoadedLesson } from "@/lib/content/lesson";
import { allLessons, curriculum } from "@/lib/curriculum/data";
import type {
  Attempt,
  ConceptPatch,
  ConceptState,
  Json,
  Learner,
  PhaseProgress,
  ReviewCard,
  Store,
} from "@/lib/store/types";

import { decide, type GovernorDecision } from "./governor";
import {
  LIGHT_HINTS,
  evidencePatch,
  provisionalReviewPatch,
  recalled,
  satisfiesPrerequisite,
} from "./mastery";
import { gradeFor, newCard, reviewCard } from "./reviews";
import { exerciseState, isHintAttempt, lessonProgress, type LessonProgress } from "./state";
import { DEFAULT_TIME_ZONE, dueText, localDate, startOfLocalDay } from "./time";

/*
 * The learning engine on the server: recording answers and hints, creating and
 * reviewing cards, keeping mastery evidence, and gathering everything Today,
 * the Map and the lesson pages need. All reads and writes go through a Store.
 */

export const TIME_ZONE = DEFAULT_TIME_ZONE;

export function cardIdFor(lessonCode: string, exerciseId: string): string {
  return `${lessonCode}/${exerciseId}`;
}

export function parseCardId(cardId: string): { lessonCode: string; exerciseId: string } | null {
  const m = /^([MLE]\d{1,2}\.\d{1,2})\/([a-z0-9-]+)$/.exec(cardId);
  return m ? { lessonCode: m[1]!, exerciseId: m[2]! } : null;
}

/** The latest review outcome of each card, from review attempts (newest first). */
function latestOutcomes(attempts: Attempt[]): Map<string, boolean> {
  const out = new Map<string, boolean>();
  for (const a of attempts) {
    if (a.kind !== "review" || !a.cardId || out.has(a.cardId)) continue;
    out.set(a.cardId, a.correct === true);
  }
  return out;
}

async function updateConcept(
  store: Store,
  conceptId: string,
  build: (prev: ConceptState | undefined) => ConceptPatch | null,
) {
  const prev = (await store.concepts()).find((c) => c.conceptId === conceptId);
  const patch = build(prev);
  if (patch) await store.upsertConcepts([patch]);
}

export type AnswerRecord = {
  correct: boolean | null;
  payload: Json;
  confidence?: number | null;
  durationMs?: number | null;
  movedOn?: boolean;
};

/**
 * Records an answer to a lesson exercise, then: the first time the exercise
 * is done, creates its review card; and a produced success with at most a
 * light hint becomes mastery evidence.
 */
export async function recordLessonAnswer(
  store: Store,
  lesson: LoadedLesson,
  ex: Exercise,
  record: AnswerRecord,
  now = new Date(),
): Promise<Attempt> {
  const before = await store.attempts({ lessonCode: lesson.code, exerciseId: ex.id, limit: 200 });
  const prevState = exerciseState(ex, before);
  const hintsUsed = before.filter(isHintAttempt).length;
  const payload =
    record.movedOn && typeof record.payload === "object" && record.payload && !Array.isArray(record.payload)
      ? { ...record.payload, movedOn: true }
      : record.movedOn
        ? { movedOn: true }
        : record.payload;

  const attempt = await store.recordAttempt({
    lessonCode: lesson.code,
    exerciseId: ex.id,
    kind: ex.kind,
    correct: record.movedOn ? false : record.correct,
    confidence: record.confidence ?? null,
    hintsUsed,
    payload,
    durationMs: record.durationMs ?? null,
  });

  const afterState = exerciseState(ex, [attempt, ...before]);
  if (ex.review && !prevState.done && afterState.done) {
    const cardId = cardIdFor(lesson.code, ex.id);
    const existing = await store.cards({ lessonCode: lesson.code });
    if (!existing.some((c) => c.cardId === cardId)) {
      const grade = gradeFor({
        correct: afterState.solved,
        hintsUsed,
        confidence: record.confidence ?? null,
      });
      await store.upsertCards([
        newCard({ cardId, lessonCode: lesson.code, conceptId: ex.concept, grade, now }),
      ]);
    }
  }

  if (record.correct === true && !record.movedOn && PRODUCE_KINDS.includes(ex.kind) && hintsUsed <= LIGHT_HINTS) {
    for (const concept of evidenceConcepts(ex)) {
      await updateConcept(store, concept, (prev) =>
        prev?.producedAt ? null : evidencePatch(concept, prev, { produced: { ref: cardIdFor(lesson.code, ex.id) } }, now),
      );
    }
  }
  return attempt;
}

export async function recordHint(
  store: Store,
  lesson: LoadedLesson,
  ex: Exercise,
  hint: { rung: number; source: "tutor" | "notes"; text: string; message?: string },
): Promise<void> {
  await store.recordAttempt({
    lessonCode: lesson.code,
    exerciseId: ex.id,
    kind: ex.kind,
    correct: null,
    payload: {
      hint: hint.rung,
      source: hint.source,
      text: hint.text.slice(0, 2000),
      ...(hint.message?.trim() ? { message: hint.message.trim().slice(0, 2000) } : {}),
    },
  });
}

export async function hintsGiven(store: Store, lessonCode: string, exerciseId: string) {
  const attempts = await store.attempts({ lessonCode, exerciseId, limit: 200 });
  return attempts
    .filter(isHintAttempt)
    .map((a) => {
      const p = a.payload as { hint: number; source?: string; text?: string; message?: string };
      return {
        rung: Number(p.hint),
        source: p.source ?? "notes",
        text: p.text ?? "",
        message: p.message ?? "",
        at: a.createdAt,
      };
    })
    .reverse();
}

/** Records a passed or failed explanation as evidence for its concept. */
export async function recordExplanationEvidence(
  store: Store,
  lesson: LoadedLesson,
  ex: Exercise,
  passed: boolean,
  now = new Date(),
) {
  if (!passed) return;
  for (const concept of evidenceConcepts(ex)) {
    await updateConcept(store, concept, (prev) =>
      prev?.explainedAt ? null : evidencePatch(concept, prev, { explained: { ref: cardIdFor(lesson.code, ex.id) } }, now),
    );
  }
}

/**
 * Records a review of a card: the attempt, the FSRS update, the next variant,
 * and recall evidence for the card's concept (including placement's
 * provisional concepts).
 */
export async function recordReview(
  store: Store,
  card: ReviewCard,
  outcome: { correct: boolean; confidence: number | null; variant: number; payload: Json; durationMs: number | null },
  now = new Date(),
): Promise<ReviewCard> {
  const grade: Grade = gradeFor({ correct: outcome.correct, confidence: outcome.confidence });
  await store.recordAttempt({
    lessonCode: card.lessonCode,
    exerciseId: parseCardId(card.cardId)?.exerciseId ?? null,
    cardId: card.cardId,
    kind: "review",
    correct: outcome.correct,
    confidence: outcome.confidence,
    rating: grade,
    payload: { variant: outcome.variant, ...((outcome.payload as object) ?? {}) },
    durationMs: outcome.durationMs,
  });
  const next = reviewCard(card, grade, now);
  await store.upsertCards([{ ...next, provisional: card.provisional && outcome.correct }]);

  const conceptCards = (await store.cards()).filter((c) => c.conceptId === card.conceptId);
  const reviews = await store.attempts({ kinds: ["review"], limit: 1000 });
  const outcomes = latestOutcomes(reviews);
  const isRecalled = recalled(conceptCards, outcomes);
  const conceptReviewIds = new Set(conceptCards.map((c) => c.cardId));
  const successes = reviews.filter((a) => a.cardId && conceptReviewIds.has(a.cardId) && a.correct === true).length;

  await updateConcept(store, card.conceptId, (prev) => {
    const provisional = provisionalReviewPatch(card.conceptId, prev, successes, !outcome.correct, now);
    if (provisional) return provisional;
    return evidencePatch(card.conceptId, prev, { recalled: isRecalled }, now);
  });
  return next;
}

// Overview ------------------------------------------------------------------

export type LessonStatus =
  | "unwritten"
  | "drafting"
  | "locked"
  | "available"
  | "in-progress"
  | "completed"
  | "mastered"
  | "skipped";

export type Overview = {
  now: Date;
  learner: Learner;
  progress: Map<string, LessonProgress>;
  concepts: Map<string, ConceptState>;
  cards: ReviewCard[];
  dueNow: ReviewCard[];
  overdue: ReviewCard[];
  lastWeekReviews: { total: number; correct: number };
  governor: GovernorDecision;
  status: Map<string, LessonStatus>;
  unlocked: Set<string>;
  /** The next lesson to begin, in study order, if any is ready and unlocked. */
  nextLesson: string | null;
  /** The lesson in progress, if any. */
  current: string | null;
  written: string[];
};

function groupProgress(rows: PhaseProgress[]): Map<string, PhaseProgress[]> {
  const map = new Map<string, PhaseProgress[]>();
  for (const r of rows) map.set(r.lessonCode, [...(map.get(r.lessonCode) ?? []), r]);
  return map;
}

/** Hard prerequisites of a lesson: from lesson.yaml when written, else from the curriculum. */
export function hardPrerequisites(code: string): { lesson: string; concept?: string }[] {
  const written = loadLesson(code);
  if (written) return written.file.links.requires.map((l) => ({ lesson: l.lesson, concept: l.concept }));
  return (curriculum().lessons[code]?.requires ?? []).map((lesson) => ({ lesson }));
}

/** Rule 3: every hard prerequisite's concepts are mastered (or provisionally placed). */
export function isUnlocked(code: string, concepts: Map<string, ConceptState>): boolean {
  for (const req of hardPrerequisites(code)) {
    if (req.concept) {
      if (!satisfiesPrerequisite(concepts.get(req.concept))) return false;
      continue;
    }
    const required = loadLesson(req.lesson);
    if (!required) return false;
    for (const c of required.file.concepts.taught) {
      if (!satisfiesPrerequisite(concepts.get(c.id))) return false;
    }
  }
  return true;
}

/** Depth in the prerequisite graph, so study order braids the curriculums. */
let depthMemo: Map<string, number> | null = null;

function depthOf(): Map<string, number> {
  if (depthMemo) return depthMemo;
  const depth = new Map<string, number>();
  const visit = (code: string, seen: Set<string>): number => {
    const known = depth.get(code);
    if (known !== undefined) return known;
    if (seen.has(code)) return 0;
    seen.add(code);
    const reqs = hardPrerequisites(code).filter((r) => /^[MLE]/.test(r.lesson));
    const d = reqs.length ? 1 + Math.max(...reqs.map((r) => visit(r.lesson, seen))) : 0;
    depth.set(code, d);
    return d;
  };
  for (const l of allLessons()) visit(l.code, new Set());
  depthMemo = depth;
  return depth;
}

export function studyOrder(codes: string[]): string[] {
  const depth = depthOf();
  const position = new Map(allLessons().map((l, i) => [l.code, i]));
  return [...codes].sort(
    (a, b) => (depth.get(a) ?? 0) - (depth.get(b) ?? 0) || (position.get(a) ?? 0) - (position.get(b) ?? 0),
  );
}

export async function overview(store: Store, now = new Date()): Promise<Overview> {
  const [learner, rows, conceptList, cards, recentReviews] = await Promise.all([
    store.learner(),
    store.progress(),
    store.concepts(),
    store.cards(),
    store.attempts({ kinds: ["review"], since: new Date(now.getTime() - 7 * 86400000).toISOString(), limit: 2000 }),
  ]);
  const grouped = groupProgress(rows);
  const progress = new Map<string, LessonProgress>();
  for (const [code, list] of grouped) progress.set(code, lessonProgress(list));
  const concepts = new Map(conceptList.map((c) => [c.conceptId, c]));

  const today = localDate(now, TIME_ZONE);
  const startToday = startOfLocalDay(today, TIME_ZONE);
  const dueNow = cards.filter((c) => new Date(c.due) <= now);
  const overdue = cards.filter((c) => new Date(c.due) < startToday);
  const lastWeekReviews = {
    total: recentReviews.length,
    correct: recentReviews.filter((a) => a.correct === true).length,
  };

  const lessonStarts = [...progress.values()].map((p) => p.startedAt).filter((s): s is string => Boolean(s));
  const governor = decide({
    now,
    timeZone: TIME_ZONE,
    dueNow: dueNow.length,
    overdue: overdue.length,
    lastWeekReviews,
    weeklyHours: learner.weeklyHours,
    lessonStarts,
  });

  const written = writtenLessons();
  const writtenSet = new Set(written);
  const status = new Map<string, LessonStatus>();
  const unlocked = new Set<string>();
  const skipped = new Set(Object.values(learner.placement ?? {}).flatMap((p) => p.skippedLessons ?? []));

  for (const l of allLessons()) {
    const p = progress.get(l.code);
    const lesson = writtenSet.has(l.code) ? loadLesson(l.code) : null;
    const open = isUnlocked(l.code, concepts);
    if (open) unlocked.add(l.code);
    let s: LessonStatus;
    if (!lesson) s = "unwritten";
    else if (!isReady(lesson)) s = "drafting";
    else if (p?.completed) {
      const taught = lesson.file.concepts.taught;
      s = taught.every((c) => concepts.get(c.id)?.masteredAt) ? "mastered" : "completed";
    } else if (p?.begun) s = "in-progress";
    else if (skipped.has(l.code)) s = "skipped";
    else s = open ? "available" : "locked";
    status.set(l.code, s);
  }

  const inProgress = studyOrder([...status].filter(([, s]) => s === "in-progress").map(([c]) => c));
  const available = studyOrder([...status].filter(([, s]) => s === "available").map(([c]) => c));
  return {
    now,
    learner,
    progress,
    concepts,
    cards,
    dueNow,
    overdue,
    lastWeekReviews,
    governor,
    status,
    unlocked,
    nextLesson: available[0] ?? null,
    current: inProgress[0] ?? null,
    written,
  };
}

/** Today's local date, and the date a card falls due on, for display. */
export function dueLabel(card: ReviewCard, now: Date): string {
  return dueText(card.due, now, TIME_ZONE);
}
