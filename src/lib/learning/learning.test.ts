import { Rating } from "ts-fsrs";
import { describe, expect, it } from "vitest";

import { exerciseSchema } from "@/lib/content/exercise-schema";
import type { Attempt, ConceptState, PhaseProgress } from "@/lib/store/types";

import { checkChoice, checkNumber, checkSteps, parseNumber } from "./check";
import { decide, tooFast, weeklyLessonLimit } from "./governor";
import { evidencePatch, isMastered, provisionalReviewPatch, satisfiesPrerequisite } from "./mastery";
import { gradeFor, newCard, reviewCard } from "./reviews";
import { exerciseState, lessonProgress } from "./state";
import { startOfLocalDay } from "./time";

const NOW = new Date("2026-11-04T06:00:00Z"); // a Wednesday, 11:30 in India

function attempt(over: Partial<Attempt>): Attempt {
  return {
    id: Math.floor(Math.random() * 1e9),
    lessonCode: "M1.1",
    exerciseId: "x",
    cardId: null,
    kind: "step",
    correct: null,
    confidence: null,
    hintsUsed: 0,
    rating: null,
    payload: {},
    durationMs: null,
    createdAt: NOW.toISOString(),
    ...over,
  };
}

describe("the pace governor", () => {
  const base = {
    now: NOW,
    timeZone: "Asia/Kolkata",
    dueNow: 0,
    overdue: 0,
    lastWeekReviews: { total: 0, correct: 0 },
    weeklyHours: 10,
    lessonStarts: [] as string[],
  };

  it("lets a lesson begin when nothing stands in the way", () => {
    expect(decide(base)).toMatchObject({ canBeginLesson: true, canStartPhase: true, weeklyLimit: 3 });
  });

  it("puts reviews first (rule 1)", () => {
    const d = decide({ ...base, dueNow: 4 });
    expect(d.canStartPhase).toBe(false);
    expect(d.reasons.map((r) => r.rule)).toEqual([1]);
  });

  it("pauses new lessons when reviews pile up or recall falls (rule 2)", () => {
    expect(decide({ ...base, overdue: 31 }).reasons.map((r) => r.rule)).toContain(2);
    expect(decide({ ...base, overdue: 30 }).canBeginLesson).toBe(true);
    expect(decide({ ...base, lastWeekReviews: { total: 20, correct: 16 } }).canBeginLesson).toBe(false);
    // Too few reviews say nothing about recall.
    expect(decide({ ...base, lastWeekReviews: { total: 5, correct: 2 } }).canBeginLesson).toBe(true);
  });

  it("allows three new lessons a week at ten hours (rule 4)", () => {
    expect(weeklyLessonLimit(10)).toBe(3);
    expect(weeklyLessonLimit(5)).toBe(2);
    expect(weeklyLessonLimit(1)).toBe(1);
    const starts = ["2026-11-02T05:00:00Z", "2026-11-03T05:00:00Z", "2026-10-31T05:00:00Z"];
    const d = decide({ ...base, lessonStarts: starts });
    expect(d.startedThisWeek).toBe(2);
    expect(d.canBeginLesson).toBe(true);
    const full = decide({ ...base, lessonStarts: [...starts, "2026-11-03T12:00:00Z"] });
    expect(full.reasons.map((r) => r.rule)).toContain(4);
  });

  it("allows one new lesson a day, by the learner's clock (rule 5)", () => {
    // 20:00 UTC on 3 November is 01:30 on 4 November in India: today.
    expect(decide({ ...base, lessonStarts: ["2026-11-03T20:00:00Z"] }).reasons.map((r) => r.rule)).toContain(5);
    expect(decide({ ...base, lessonStarts: ["2026-11-03T17:00:00Z"] }).startedToday).toBe(0);
  });

  it("flags phases finished far too fast while missing checks (rule 6)", () => {
    expect(tooFast({ actualMinutes: 5, plannedMinutes: 30, missedChecks: 2, history: [] })).toBe(true);
    expect(tooFast({ actualMinutes: 5, plannedMinutes: 30, missedChecks: 0, history: [] })).toBe(false);
    // A learner who is always quick has a quicker norm.
    const quick = Array.from({ length: 5 }, () => ({ actualMinutes: 10, plannedMinutes: 30 }));
    expect(tooFast({ actualMinutes: 5, plannedMinutes: 30, missedChecks: 3, history: quick })).toBe(false);
  });
});

describe("spaced review", () => {
  it("grades by correctness, hints and confidence", () => {
    expect(gradeFor({ correct: false })).toBe(Rating.Again);
    expect(gradeFor({ correct: true, hintsUsed: 1 })).toBe(Rating.Hard);
    expect(gradeFor({ correct: true, confidence: 30 })).toBe(Rating.Hard);
    expect(gradeFor({ correct: true, confidence: 95 })).toBe(Rating.Easy);
    expect(gradeFor({ correct: true })).toBe(Rating.Good);
  });

  it("schedules a first review days away, and moves to the next variant", () => {
    const card = newCard({ cardId: "M1.1/x", lessonCode: "M1.1", conceptId: "M1.1/a", grade: Rating.Good, now: NOW });
    const days = (Date.parse(card.due) - NOW.getTime()) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(1);
    const later = new Date(card.due);
    const reviewed = reviewCard(card, Rating.Good, later);
    expect(reviewed.nextVariant).toBe(1);
    expect(Date.parse(reviewed.due)).toBeGreaterThan(Date.parse(card.due));
    const lapsed = reviewCard(card, Rating.Again, later);
    expect(lapsed.lapses).toBe(1);
  });
});

describe("mastery", () => {
  const empty: ConceptState | undefined = undefined;

  it("needs all three: produced, explained and recalled", () => {
    let p = evidencePatch("M1.1/a", empty, { produced: { ref: "r" } }, NOW);
    expect(p.masteredAt).toBeNull();
    const s1 = { ...p, provisional: false, updatedAt: "" } as ConceptState;
    p = evidencePatch("M1.1/a", s1, { explained: { ref: "r" } }, NOW);
    expect(p.masteredAt).toBeNull();
    const s2 = { ...s1, ...p } as ConceptState;
    p = evidencePatch("M1.1/a", s2, { recalled: true }, NOW);
    expect(p.masteredAt).toBe(NOW.toISOString());
    const s3 = { ...s2, ...p } as ConceptState;
    expect(isMastered(s3)).toBe(true);
    // A failed recall withdraws mastery until recall returns.
    p = evidencePatch("M1.1/a", s3, { recalled: false }, NOW);
    expect(p.masteredAt).toBeNull();
  });

  it("lets a provisional skip open later lessons until reviews decide", () => {
    const prov = { conceptId: "M1.1/a", provisional: true, evidence: [] } as unknown as ConceptState;
    expect(satisfiesPrerequisite(prov)).toBe(true);
    expect(provisionalReviewPatch("M1.1/a", prov, 1, false, NOW)).toBeNull();
    expect(provisionalReviewPatch("M1.1/a", prov, 2, false, NOW)).toMatchObject({ provisional: false, masteredAt: NOW.toISOString() });
    expect(provisionalReviewPatch("M1.1/a", prov, 0, true, NOW)).toMatchObject({ provisional: false, masteredAt: null });
  });
});

describe("exercise state", () => {
  const step = { id: "x", kind: "step" as const };

  it("counts hints apart from answers, newest first", () => {
    const s = exerciseState(step, [
      attempt({ correct: true, payload: { type: "expression", input: "a", status: "correct" } }),
      attempt({ payload: { hint: 1, source: "notes", text: "?" } }),
      attempt({ correct: false, payload: { type: "expression", input: "b", status: "different" } }),
    ]);
    expect(s).toMatchObject({ attempts: 2, hintsUsed: 1, solved: true, done: true, correct: true });
  });

  it("is done after moving on, without being solved", () => {
    const s = exerciseState(step, [attempt({ correct: false, payload: { movedOn: true } })]);
    expect(s).toMatchObject({ done: true, solved: false, movedOn: true });
  });

  it("is done after one answer for a prediction", () => {
    const s = exerciseState({ id: "x", kind: "predict" }, [attempt({ correct: false, kind: "predict" })]);
    expect(s.done).toBe(true);
  });

  it("ignores review attempts on the same exercise", () => {
    const s = exerciseState(step, [attempt({ cardId: "M1.1/x", correct: true, kind: "review" })]);
    expect(s.attempts).toBe(0);
  });
});

describe("lesson progress", () => {
  const row = (phase: PhaseProgress["phase"], status: PhaseProgress["status"]): PhaseProgress => ({
    lessonCode: "M1.1",
    phase,
    status,
    state: {},
    startedAt: NOW.toISOString(),
    completedAt: status === "completed" ? NOW.toISOString() : null,
    updatedAt: NOW.toISOString(),
  });

  it("opens phases in order", () => {
    expect(lessonProgress([]).phases).toMatchObject({ puzzle: "available", recall: "locked" });
    const p = lessonProgress([row("puzzle", "completed"), row("recall", "started")]);
    expect(p).toMatchObject({ current: "recall", begun: true, completed: false });
    expect(p.phases).toMatchObject({ puzzle: "completed", recall: "started", explore: "locked" });
  });
});

describe("server-side checks", () => {
  it("reads numbers the way people write them", () => {
    expect(parseNumber("3e23")).toBe(3e23);
    expect(parseNumber("3 × 10^23")).toBe(3e23);
    expect(parseNumber("3*10**23")).toBe(3e23);
    expect(parseNumber("3,00,000")).toBe(300000);
    expect(parseNumber("300 000")).toBe(300000);
    expect(parseNumber("10^9")).toBe(1e9);
    expect(parseNumber("3/4")).toBe(0.75);
    expect(parseNumber("−2.5")).toBe(-2.5);
    expect(Number.isNaN(parseNumber("about three"))).toBe(true);
  });

  it("accepts an estimate within its factor", () => {
    const answer = exerciseSchema.shape.answer.parse({ type: "number", value: 100, tolerance: { factor: 3 } });
    if (answer.type !== "number") throw new Error("expected a number answer");
    expect(checkNumber(answer, 40).correct).toBe(true);
    expect(checkNumber(answer, 300).correct).toBe(true);
    expect(checkNumber(answer, 301).correct).toBe(false);
    expect(checkNumber(answer, -100).correct).toBe(false);
    expect(checkNumber(answer, 200).detail).toEqual({ ratio: 2 });
  });

  it("checks choices as sets and steps line by line", () => {
    const choice = { type: "choice" as const, options: [], correct: ["a", "c"], multiple: true };
    expect(checkChoice(choice, ["c", "a"]).correct).toBe(true);
    expect(checkChoice(choice, ["a"]).correct).toBe(false);
    const steps = {
      type: "steps" as const,
      rules: [],
      start: "x",
      lines: [
        { math: "a", rule: "r1" },
        { math: "b", rule: "r2" },
      ],
    };
    expect(checkSteps(steps, ["r1", "r1"])).toEqual({ correct: false, detail: { wrongLines: [1] } });
  });
});

describe("the learner's day", () => {
  it("begins at local midnight", () => {
    expect(startOfLocalDay("2026-11-04", "Asia/Kolkata").toISOString()).toBe("2026-11-03T18:30:00.000Z");
    expect(startOfLocalDay("2026-03-29", "Europe/London").toISOString()).toBe("2026-03-29T00:00:00.000Z");
    expect(startOfLocalDay("2026-03-30", "Europe/London").toISOString()).toBe("2026-03-29T23:00:00.000Z");
  });
});
