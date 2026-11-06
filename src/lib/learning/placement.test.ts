import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { writtenLessons, loadLesson } from "@/lib/content/lesson";
import { course as courseMeta } from "@/lib/curriculum/data";
import { FileStore } from "@/lib/store/file";

import { gradeFor, newCard } from "./reviews";
import {
  PLACEMENT_CONFIDENCE,
  finishPlacement,
  placementCourses,
  placementLessons,
  placementQuestions,
  placementState,
  type PlacementQuestion,
} from "./placement";

/*
 * Placement reads the learner's placement answers from the store, so these tests give a fresh
 * local store the answers that each rule turns on. Lessons and questions come from the written
 * lessons themselves, so the tests keep holding as lessons are revised. The written lessons are
 * still drafts, which placement offers only while drafts are shown.
 */

let dir: string;
let store: FileStore;
const drafts = process.env.DERIVE_SHOW_DRAFTS;

beforeAll(() => {
  process.env.DERIVE_SHOW_DRAFTS = "1";
});

afterAll(() => {
  if (drafts === undefined) delete process.env.DERIVE_SHOW_DRAFTS;
  else process.env.DERIVE_SHOW_DRAFTS = drafts;
});

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "derive-placement-"));
  store = new FileStore(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const NOW = new Date("2026-11-06T09:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

async function answer(q: PlacementQuestion, correct: boolean, confidence: number | null = 80) {
  await store.recordAttempt({ lessonCode: q.lesson.code, exerciseId: q.ex.id, cardId: q.cardId, kind: "placement", correct, confidence });
}

/** The lessons of a course that require `code`, directly or through other lessons of the course. */
function buildingOn(courseCode: string, code: string): Set<string> {
  const lessons = placementLessons(courseCode);
  const inCourse = new Set(lessons.map((l) => l.code));
  const found = new Set<string>();
  let grew = true;
  while (grew) {
    grew = false;
    for (const l of lessons) {
      if (found.has(l.code)) continue;
      const reqs = l.file.links.requires.map((r) => r.lesson).filter((c) => inCourse.has(c));
      if (reqs.some((r) => r === code || found.has(r))) {
        found.add(l.code);
        grew = true;
      }
    }
  }
  return found;
}

function questionCount(courseCode: string): number {
  return placementLessons(courseCode).reduce((n, l) => n + placementQuestions(l).length, 0);
}

describe("placement questions", () => {
  it("are the last review variant of each placement exercise, so that its reviews start on another", () => {
    let seen = 0;
    for (const code of writtenLessons()) {
      const lesson = loadLesson(code)!;
      const qs = placementQuestions(lesson);
      const placeable = lesson.exercises.filter((e) => e.placement && (e.review?.variants.length ?? 0) >= 2);
      expect(qs.map((q) => q.ex.id)).toEqual(placeable.map((e) => e.id));
      for (const q of qs) {
        expect(q.cardId).toBe(`${code}/${q.ex.id}`);
        expect(q.variant).toBe(q.ex.review!.variants.length - 1);
      }
      seen += qs.length;
    }
    expect(seen).toBeGreaterThan(0);
  });

  it("are offered in M1 and E1, lesson by lesson in course order", () => {
    expect(placementCourses()).toEqual(["M1", "E1"]);
    for (const c of placementCourses()) {
      const order = courseMeta(c)!.lessons;
      const codes = placementLessons(c).map((l) => l.code);
      expect(codes.length).toBeGreaterThan(1);
      const at = codes.map((code) => order.indexOf(code));
      expect(at.every((i, k) => i >= 0 && (k === 0 || i > at[k - 1]!))).toBe(true);
    }
  });
});

describe("the placement check", () => {
  it("starts with a lesson that needs no other lesson of the course, with every question still to come", async () => {
    const state = await placementState(store, "E1");
    expect(state.finished).toBe(false);
    expect(state.answered).toBe(0);
    expect(state.results.size).toBe(0);
    const first = state.next!;
    const reqs = first.lesson.file.links.requires.map((r) => r.lesson);
    expect(reqs.some((r) => state.lessons.some((l) => l.code === r))).toBe(false);
    expect(state.remaining).toBe(questionCount("E1"));
  });

  it("skips every lesson when every answer is right, and never says more questions are to come than it then asks", async () => {
    for (const c of placementCourses()) {
      const at = await placementState(store, c);
      const promised = at.answered + at.remaining;
      let asked = 0;
      for (let state = at; state.next; state = await placementState(store, c)) {
        // "At most n to go" must hold however the check goes on.
        expect(state.answered + state.remaining).toBeLessThanOrEqual(promised);
        await answer(state.next, true);
        asked += 1;
        expect(asked).toBeLessThanOrEqual(promised);
      }
      const end = await placementState(store, c);
      expect(end.remaining).toBe(0);
      expect(end.lessons.every((l) => end.results.get(l.code) === "passed")).toBe(true);
      expect(asked).toBe(promised);
    }
  });

  it("counts a right answer given as a guess as a miss, and stops testing the lessons that require it", async () => {
    const state = await placementState(store, "E1");
    const first = state.next!;
    await answer(first, true, PLACEMENT_CONFIDENCE - 1);
    const after = await placementState(store, "E1");
    expect(after.results.get(first.lesson.code)).toBe("failed");
    const blocked = buildingOn("E1", first.lesson.code);
    expect(blocked.size).toBeGreaterThan(0);
    for (const code of blocked) expect(after.results.has(code)).toBe(false);
    if (after.next) expect(blocked.has(after.next.lesson.code)).toBe(false);
    expect(after.answered + after.remaining).toBeLessThan(state.remaining);
  });

  it("takes a right answer with no confidence given as known", async () => {
    const state = await placementState(store, "M1");
    const lesson = state.next!.lesson;
    for (const q of placementQuestions(lesson)) await answer(q, true, null);
    expect((await placementState(store, "M1")).results.get(lesson.code)).toBe("passed");
  });

  it("goes on past a lesson that passed, and stops below one that failed", async () => {
    const lessons = placementLessons("E1");
    const [first, second] = lessons;
    for (const q of placementQuestions(first!)) await answer(q, true);
    let state = await placementState(store, "E1");
    expect(state.results.get(first!.code)).toBe("passed");
    expect(state.next).not.toBeNull();
    // Miss a question of the next lesson asked, and then nothing that requires that lesson is asked.
    const missed = state.next!.lesson;
    expect(missed.code).toBe(second!.code);
    await answer(state.next!, false);
    state = await placementState(store, "E1");
    expect(state.results.get(missed.code)).toBe("failed");
    const blocked = buildingOn("E1", missed.code);
    for (const code of blocked) expect(state.results.has(code)).toBe(false);
    if (state.next) expect(blocked.has(state.next.lesson.code)).toBe(false);
  });
});

describe("finishing placement", () => {
  it("skips the lessons that passed: their concepts become provisional and their review cards come back within days", async () => {
    const [first, second] = placementLessons("E1");
    for (const q of placementQuestions(first!)) await answer(q, true);
    await answer(placementQuestions(second!)[0]!, false);

    const { skipped } = await finishPlacement(store, "E1", NOW);
    expect(skipped).toEqual([first!.code]);

    const taught = first!.file.concepts.taught.map((c) => c.id);
    const concepts = new Map((await store.concepts()).map((c) => [c.conceptId, c]));
    for (const id of taught) {
      expect(concepts.get(id)?.provisional).toBe(true);
      expect(concepts.get(id)?.evidence).toEqual([{ type: "placement", at: NOW.toISOString(), ref: "E1" }]);
    }
    for (const c of second!.file.concepts.taught) expect(concepts.get(c.id)?.provisional ?? false).toBe(false);

    const cards = await store.cards();
    const reviewed = first!.exercises.filter((e) => e.review).map((e) => `${first!.code}/${e.id}`);
    expect(cards.map((c) => c.cardId).sort()).toEqual([...reviewed].sort());
    for (const card of cards) {
      expect(card.provisional).toBe(true);
      const wait = new Date(card.due).getTime() - NOW.getTime();
      expect(wait).toBeGreaterThan(0);
      expect(wait).toBeLessThanOrEqual(7 * DAY);
    }

    const learner = await store.learner();
    expect(learner.placement.E1).toEqual({ takenAt: NOW.toISOString(), skippedConcepts: taught, skippedLessons: [first!.code] });
    const state = await placementState(store, "E1");
    expect(state.finished).toBe(true);
    expect(state.next).toBeNull();
  });

  it("leaves a card that exists and a concept already mastered as they were", async () => {
    const [first] = placementLessons("E1");
    const ex = first!.exercises.find((e) => e.review)!;
    const own = newCard({ cardId: `${first!.code}/${ex.id}`, lessonCode: first!.code, conceptId: ex.concept, grade: gradeFor({ correct: true }), now: new Date("2026-10-01T08:00:00.000Z") });
    await store.upsertCards([own]);
    const mastered = first!.file.concepts.taught[0]!.id;
    await store.upsertConcepts([{ conceptId: mastered, masteredAt: "2026-10-20T08:00:00.000Z" }]);
    for (const q of placementQuestions(first!)) await answer(q, true);

    await finishPlacement(store, "E1", NOW);
    const card = (await store.cards()).find((c) => c.cardId === own.cardId)!;
    expect(card.due).toBe(own.due);
    expect(card.provisional).toBe(false);
    const concept = (await store.concepts()).find((c) => c.conceptId === mastered)!;
    expect(concept.provisional).toBe(false);
    expect(concept.masteredAt).toBe("2026-10-20T08:00:00.000Z");
    // The learner's record still lists every concept the lesson teaches as skipped.
    expect((await store.learner()).placement.E1!.skippedConcepts).toContain(mastered);
  });
});
