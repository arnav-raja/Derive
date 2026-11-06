import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

/*
 * Learners' data for the end-to-end servers, written straight into the local store's file. The
 * lessons come from the lesson files themselves, so the data keeps up as lessons are added.
 */

const ROOT = path.join(import.meta.dirname, "..");
const LESSONS_DIR = path.join(ROOT, "content", "lessons");

export const PHASES = ["puzzle", "recall", "explore", "derive", "build", "explain"] as const;

type LessonFile = { code: string; title: string; concepts: { taught: { id: string }[] } };
type ExerciseFile = { exercises: { id: string; kind: string; phase: string; concept: string; review?: { variants: unknown[] } }[] };

export type WrittenLesson = {
  code: string;
  title: string;
  concepts: string[];
  exercises: { id: string; kind: string }[];
  reviewed: { id: string; concept: string }[];
};

/** The written lessons, M1 before E1 and each course in lesson order. */
export function writtenLessons(): WrittenLesson[] {
  const codes = readdirSync(LESSONS_DIR).filter(
    (c) => existsSync(path.join(LESSONS_DIR, c, "lesson.yaml")) && existsSync(path.join(LESSONS_DIR, c, "exercises.yaml")),
  );
  const order = (c: string) => {
    const [course, n] = c.split(".");
    return [course!.startsWith("M") ? 0 : 1, Number(course!.slice(1)), Number(n)];
  };
  codes.sort((a, b) => {
    const [x, y] = [order(a), order(b)];
    return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!;
  });
  return codes.map((code) => {
    const lesson = parse(readFileSync(path.join(LESSONS_DIR, code, "lesson.yaml"), "utf8")) as LessonFile;
    const file = parse(readFileSync(path.join(LESSONS_DIR, code, "exercises.yaml"), "utf8")) as ExerciseFile;
    return {
      code,
      title: lesson.title,
      concepts: lesson.concepts.taught.map((c) => c.id),
      exercises: file.exercises.map((e) => ({ id: e.id, kind: e.kind })),
      reviewed: file.exercises.filter((e) => (e.review?.variants.length ?? 0) > 0).map((e) => ({ id: e.id, concept: e.concept })),
    };
  });
}

const LEARNER_ID = "00000000-0000-4000-8000-000000000001";
const DAY = 24 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;

function learner(createdAt: string) {
  return {
    id: LEARNER_ID,
    displayName: null,
    weeklyHours: 10,
    dailyTutorBudgetUsd: 2,
    monthlyComputeBudgetUsd: 15,
    settings: {},
    placement: {},
    createdAt,
  };
}

/** Writes the store in one step, so a server reading it never sees half a file. */
function write(dir: string, data: unknown) {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "store.json");
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, file);
}

/** A learner who has just signed up: no answers, no progress. */
export function resetStore(dir: string) {
  rmSync(path.join(dir, "store.json"), { force: true });
}

/**
 * A learner who has finished every written lesson, one every second day. Every exercise was
 * tried and moved on from, so every Reveal is open and every figure is on its page. Each
 * lesson's concepts are provisional, two review cards of each lesson are due now, and the
 * notebook has an open and a resolved entry.
 */
export function seedFinishedStore(dir: string, now = new Date()) {
  const lessons = writtenLessons();
  const start = now.getTime() - (lessons.length * 2 + 2) * DAY;
  const iso = (t: number) => new Date(t).toISOString();
  const progress = [];
  const concepts = [];
  const cards = [];
  const attempts = [];
  let nextId = 1;
  for (const [i, lesson] of lessons.entries()) {
    const day = start + i * 2 * DAY;
    for (const [k, phase] of PHASES.entries()) {
      const at = iso(day + k * 20 * MINUTE);
      const done = iso(day + (k + 1) * 20 * MINUTE - 1000);
      progress.push({ lessonCode: lesson.code, phase, status: "completed", state: {}, startedAt: at, completedAt: done, updatedAt: done });
    }
    for (const [k, ex] of lesson.exercises.entries()) {
      attempts.push({
        id: nextId++,
        lessonCode: lesson.code,
        exerciseId: ex.id,
        cardId: null,
        kind: ex.kind,
        correct: false,
        confidence: null,
        hintsUsed: 0,
        rating: null,
        payload: { movedOn: true },
        durationMs: null,
        createdAt: iso(day + k * MINUTE),
      });
    }
    const finished = iso(day + PHASES.length * 20 * MINUTE);
    for (const id of lesson.concepts) {
      concepts.push({ conceptId: id, producedAt: finished, explainedAt: null, recalledAt: null, masteredAt: null, provisional: true, evidence: [], updatedAt: finished });
    }
    for (const ex of lesson.reviewed.slice(0, 2)) {
      cards.push({
        cardId: `${lesson.code}/${ex.id}`,
        lessonCode: lesson.code,
        conceptId: ex.concept,
        due: iso(now.getTime() - 60 * MINUTE),
        stability: 2,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 2,
        learningSteps: 0,
        reps: 1,
        lapses: 0,
        state: 2,
        lastReview: finished,
        nextVariant: 0,
        provisional: false,
        createdAt: finished,
      });
    }
  }
  const first = lessons[0]?.code ?? null;
  const last = lessons.at(-1)?.code ?? null;
  const notebook = [
    {
      id: nextId++,
      kind: "question",
      source: "learner",
      lessonCode: last,
      location: "explore",
      body: "Why does the second way of writing it give the same answer?",
      revisitAt: iso(now.getTime() + 2 * DAY),
      status: "open",
      createdAt: iso(now.getTime() - 3 * DAY),
      resolvedAt: null,
    },
    {
      id: nextId++,
      kind: "gap",
      source: "tutor",
      lessonCode: first,
      location: "derive",
      body: "Mixed up the order of two steps in the derivation, and found it by checking a small case.",
      revisitAt: null,
      status: "resolved",
      createdAt: iso(start + DAY),
      resolvedAt: iso(start + 2 * DAY),
    },
  ];
  write(dir, {
    learner: learner(iso(start - DAY)),
    progress,
    concepts,
    cards,
    attempts,
    explanations: [],
    notebook,
    tutorSessions: [],
    nextId,
  });
}
