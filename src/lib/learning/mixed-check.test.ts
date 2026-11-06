import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadLesson, type LoadedLesson } from "@/lib/content/lesson";
import { FileStore } from "@/lib/store/file";
import type { Attempt, ReviewCard } from "@/lib/store/types";

import { chooseMixedCheck, hasMixedCheck, storedCheck, unansweredCheck } from "./mixed-check";
import { gradeFor, newCard } from "./reviews";

/*
 * The mixed check is chosen from the learner's review cards, so these tests
 * give a fresh local store the cards and answers that each rule turns on.
 * Exercise ids come from the lessons themselves, so the tests keep holding
 * as lessons are revised.
 */

let dir: string;
let store: FileStore;

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), "derive-mixed-"));
  store = new FileStore(dir);
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function lesson(code: string): LoadedLesson {
  const l = loadLesson(code);
  if (!l) throw new Error(`${code} does not load`);
  return l;
}

/** Exercises that can appear in the check: those with at least two review variants. */
function usable(l: LoadedLesson): string[] {
  return l.exercises.filter((e) => (e.review?.variants.length ?? 0) >= 2).map((e) => e.id);
}

function cardFor(l: LoadedLesson, exerciseId: string, madeAt: string, nextVariant = 0): ReviewCard {
  const ex = l.byId.get(exerciseId)!;
  const c = newCard({
    cardId: `${l.code}/${exerciseId}`,
    lessonCode: l.code,
    conceptId: ex.concept,
    grade: gradeFor({ correct: true }),
    now: new Date(madeAt),
  });
  return { ...c, nextVariant };
}

const NOW = new Date("2026-11-06T09:00:00.000Z");

describe("the mixed check", () => {
  it("is part of every written lesson's Explain phase", () => {
    for (const code of ["M1.1", "M1.3", "E1.2"]) expect(hasMixedCheck(lesson(code))).toBe(true);
  });

  it("is empty when there are no review cards yet", async () => {
    expect(await chooseMixedCheck(store, lesson("M1.3"), NOW)).toEqual([]);
  });

  it("takes this lesson's weakest items and earlier lessons' most forgotten, interleaved", async () => {
    const own = lesson("M1.3");
    const first = lesson("M1.1");
    const second = lesson("M1.2");
    const [solvedId, missedId, hintedId] = usable(own);
    const [a1, a2] = usable(first);
    const [b1] = usable(second);
    expect([solvedId, missedId, hintedId, a1, a2, b1].every(Boolean)).toBe(true);

    await store.upsertCards([
      cardFor(own, solvedId!, "2026-11-06T08:00:00.000Z"),
      cardFor(own, missedId!, "2026-11-06T08:00:00.000Z"),
      cardFor(own, hintedId!, "2026-11-06T08:00:00.000Z", 1),
      // The older a card's last review, the less likely it is still remembered.
      cardFor(first, a1!, "2026-10-20T08:00:00.000Z"),
      cardFor(first, a2!, "2026-10-18T08:00:00.000Z"),
      cardFor(second, b1!, "2026-10-25T08:00:00.000Z"),
    ]);
    await store.recordAttempt({ lessonCode: own.code, exerciseId: solvedId, kind: "predict", correct: true });
    await store.recordAttempt({ lessonCode: own.code, exerciseId: missedId, kind: "predict", correct: false });
    await store.recordAttempt({ lessonCode: own.code, exerciseId: hintedId, kind: "step", payload: { hint: 1 } });
    await store.recordAttempt({ lessonCode: own.code, exerciseId: hintedId, kind: "step", correct: true });

    const check = await chooseMixedCheck(store, own, NOW);
    expect(check.map((i) => i.cardId)).toEqual([
      // One card from each earlier lesson before a second from either, the most forgotten first.
      `M1.1/${a2}`,
      // Then this lesson's: missed before hinted, and a solved item only if more are needed.
      `M1.3/${missedId}`,
      `M1.2/${b1}`,
      `M1.3/${hintedId}`,
      `M1.1/${a1}`,
    ]);
    // Each item shows the variant after the one the next review will show.
    const hinted = check.find((i) => i.cardId === `M1.3/${hintedId}`)!;
    expect(hinted.variant).toBe(2 % own.byId.get(hintedId!)!.review!.variants.length);
    expect(check.find((i) => i.cardId === `M1.3/${missedId}`)!.variant).toBe(1);
  });

  it("asks at least four questions, taking more from this lesson when earlier lessons have few", async () => {
    const own = lesson("M1.3");
    const first = lesson("M1.1");
    const ids = usable(own).slice(0, 4);
    const [a1] = usable(first);
    await store.upsertCards([...ids.map((id) => cardFor(own, id, "2026-11-06T08:00:00.000Z")), cardFor(first, a1!, "2026-10-20T08:00:00.000Z")]);

    const check = await chooseMixedCheck(store, own, NOW);
    expect(check).toHaveLength(4);
    expect(check[0]!.cardId).toBe(`M1.1/${a1}`);
    // With no answers yet, this lesson's items keep the lesson's order.
    expect(check.slice(1).map((i) => i.cardId)).toEqual(ids.slice(0, 3).map((id) => `M1.3/${id}`));
  });

  it("never takes more than four from earlier lessons", async () => {
    const own = lesson("M1.4");
    const earlier = ["M1.1", "M1.2", "M1.3"].map(lesson);
    const cards = earlier.flatMap((l, i) => usable(l).slice(0, 2).map((id, j) => cardFor(l, id, `2026-10-${10 + i * 3 + j}T08:00:00.000Z`)));
    await store.upsertCards([...cards, ...usable(own).slice(0, 2).map((id) => cardFor(own, id, "2026-11-06T08:00:00.000Z"))]);

    const check = await chooseMixedCheck(store, own, NOW);
    expect(check.filter((i) => !i.cardId.startsWith("M1.4/"))).toHaveLength(4);
    expect(check.filter((i) => i.cardId.startsWith("M1.4/"))).toHaveLength(2);
    // The first three earlier items come from three different lessons.
    const lessons = check.filter((i) => !i.cardId.startsWith("M1.4/")).slice(0, 3).map((i) => i.cardId.split("/")[0]);
    expect(new Set(lessons).size).toBe(3);
  });
});

describe("the stored check", () => {
  it("reads the items kept in the Explain phase's state and drops anything malformed", () => {
    expect(storedCheck(null)).toBeNull();
    expect(storedCheck([] as never)).toBeNull();
    expect(storedCheck({})).toBeNull();
    expect(
      storedCheck({
        mixedCheck: [{ cardId: "M1.1/a", variant: 1 }, { cardId: "M1.1/b" }, "M1.1/c", { cardId: 4, variant: 0 }, { cardId: "M1.2/d", variant: 0 }],
      }),
    ).toEqual([
      { cardId: "M1.1/a", variant: 1 },
      { cardId: "M1.2/d", variant: 0 },
    ]);
  });

  it("knows which items are still to be answered", () => {
    const items = [
      { cardId: "M1.1/a", variant: 1 },
      { cardId: "M1.2/b", variant: 0 },
    ];
    const answered = { kind: "check", cardId: "M1.1/a" } as Attempt;
    const elsewhere = { kind: "review", cardId: "M1.2/b" } as Attempt;
    expect(unansweredCheck(items, [answered, elsewhere])).toEqual([{ cardId: "M1.2/b", variant: 0 }]);
  });
});
