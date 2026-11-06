import { describe, expect, it } from "vitest";

import type { ReviewCard } from "@/lib/store/types";

import { orderDue } from "./review-queue";

function card(cardId: string, due: string): ReviewCard {
  const lessonCode = cardId.split("/")[0]!;
  return {
    cardId,
    lessonCode,
    conceptId: `${lessonCode}/idea`,
    due,
    stability: 1,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 1,
    learningSteps: 0,
    reps: 1,
    lapses: 0,
    state: 2,
    lastReview: null,
    nextVariant: 0,
    provisional: false,
    createdAt: due,
  };
}

const ids = (cards: ReviewCard[]) => cards.map((c) => c.cardId);

describe("the review queue", () => {
  const algebra = card("M1.2/solve", "2026-11-01T08:00:00.000Z");
  const units = card("M1.1/units", "2026-11-02T08:00:00.000Z");
  const loops = card("E1.2/loops", "2026-11-03T08:00:00.000Z");
  const estimate = card("M1.1/estimate", "2026-11-01T08:00:00.000Z");

  it("puts the most overdue card first, and breaks a tie by card", () => {
    expect(ids(orderDue([loops, units, algebra, estimate], null))).toEqual([
      "M1.1/estimate",
      "M1.2/solve",
      "M1.1/units",
      "E1.2/loops",
    ]);
  });

  it("starts with another curriculum than the last lesson's when one is waiting", () => {
    expect(ids(orderDue([algebra, units, loops], "M1.4"))).toEqual(["E1.2/loops", "M1.2/solve", "M1.1/units"]);
  });

  it("starts with another lesson when every card is from the same curriculum", () => {
    expect(ids(orderDue([algebra, units, estimate], "M1.1"))).toEqual(["M1.2/solve", "M1.1/estimate", "M1.1/units"]);
  });

  it("keeps the order when the most overdue card is already from elsewhere", () => {
    expect(ids(orderDue([algebra, units, loops], "E1.4"))).toEqual(["M1.2/solve", "M1.1/units", "E1.2/loops"]);
  });

  it("keeps the order when every card is from the last lesson", () => {
    expect(ids(orderDue([units, estimate], "M1.1"))).toEqual(["M1.1/estimate", "M1.1/units"]);
  });

  it("leaves a single card as it is, and never changes the list it is given", () => {
    expect(ids(orderDue([units], "M1.1"))).toEqual(["M1.1/units"]);
    const given = [loops, algebra];
    orderDue(given, "M1.2");
    expect(ids(given)).toEqual(["E1.2/loops", "M1.2/solve"]);
  });
});
