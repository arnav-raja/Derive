import { describe, expect, it } from "vitest";

import type { ActivityPoint } from "@/lib/store/types";

import { activityLevel, activityStart, summariseActivity } from "./activity";

const TZ = "Asia/Kolkata";
// Thursday 5 November 2026, mid-afternoon in India.
const now = new Date("2026-11-05T15:00:00+05:30");

function at(date: string, kind: ActivityPoint["kind"] = "step", correct: boolean | null = true): ActivityPoint {
  return { createdAt: new Date(`${date}T10:00:00+05:30`).toISOString(), kind, correct };
}

describe("activity", () => {
  it("opens the window on the Monday of the first week", () => {
    // This week began on Monday 2 November; four weeks back is Monday 12 October.
    expect(activityStart(now, 4, TZ)).toBe(new Date("2026-10-12T00:00:00+05:30").toISOString());
  });

  it("lays out whole weeks, Monday first, and marks the days still to come", () => {
    const s = summariseActivity([], now, 2, { timeZone: TZ });
    expect(s.weeks).toHaveLength(2);
    expect(s.weeks[0]![0]!.date).toBe("2026-10-26");
    expect(s.weeks[1]![6]!.date).toBe("2026-11-08");
    expect(s.weeks[1]!.filter((d) => d.future).map((d) => d.date)).toEqual(["2026-11-06", "2026-11-07", "2026-11-08"]);
  });

  it("counts answers by the learner's day", () => {
    // 20:00 UTC on 3 November is already 4 November in India.
    const points: ActivityPoint[] = [at("2026-11-03"), { createdAt: "2026-11-03T20:00:00Z", kind: "run", correct: null }, at("2026-11-04")];
    const s = summariseActivity(points, now, 1, { timeZone: TZ });
    expect(s.weeks[0]!.map((d) => d.count)).toEqual([0, 1, 2, 0, 0, 0, 0]);
    expect(s.activeDays).toBe(2);
    expect(s.answers).toBe(3);
  });

  it("keeps the current run alive until today is over", () => {
    const points = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"].map((d) => at(d));
    const s = summariseActivity(points, now, 2, { timeZone: TZ });
    expect(s.currentRun).toBe(4);
    expect(s.longestRun).toBe(4);
  });

  it("ends the current run after a day without practice", () => {
    const points = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-11-03"].map((d) => at(d));
    const s = summariseActivity(points, now, 2, { timeZone: TZ });
    expect(s.currentRun).toBe(0);
    expect(s.longestRun).toBe(3);
  });

  it("works out recall on reviews for each week", () => {
    const points = [
      at("2026-11-02", "review", true),
      at("2026-11-03", "review", false),
      at("2026-11-03", "review", true),
      at("2026-10-28", "review", true),
      at("2026-11-04", "step", false),
    ];
    const s = summariseActivity(points, now, 2, { timeZone: TZ, recallWeeks: 2 });
    expect(s.recall).toEqual([
      { start: "2026-10-26", total: 1, correct: 1 },
      { start: "2026-11-02", total: 3, correct: 2 },
    ]);
  });

  it("draws busier days darker", () => {
    expect([0, 1, 5, 6, 15, 16, 30, 31].map(activityLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4]);
  });
});
