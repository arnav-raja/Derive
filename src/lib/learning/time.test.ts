import { describe, expect, it } from "vitest";

import { addDays, dueText, localDate, localWeekday, weekStart } from "./time";

describe("learner calendar", () => {
  it("uses the learner's time zone for the date", () => {
    // 20:00 UTC on 4 November is 01:30 on 5 November in India.
    expect(localDate("2026-11-04T20:00:00Z", "Asia/Kolkata")).toBe("2026-11-05");
    expect(localDate("2026-11-04T20:00:00Z", "UTC")).toBe("2026-11-04");
  });

  it("counts weekdays from Monday", () => {
    expect(localWeekday("2026-11-02T06:00:00Z", "Asia/Kolkata")).toBe(0); // Monday
    expect(localWeekday("2026-11-08T06:00:00Z", "Asia/Kolkata")).toBe(6); // Sunday
  });

  it("finds the Monday of the week", () => {
    expect(weekStart("2026-11-04T06:00:00Z", "Asia/Kolkata")).toBe("2026-11-02");
    expect(weekStart("2026-11-08T20:00:00Z", "Asia/Kolkata")).toBe("2026-11-09");
  });

  it("adds days across month ends", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("dueText", () => {
  const now = new Date("2026-11-04T10:00:00+05:30");

  it("says today, tomorrow or the day in words", () => {
    expect(dueText("2026-11-03T08:00:00+05:30", now)).toBe("today");
    expect(dueText("2026-11-04T23:00:00+05:30", now)).toBe("today");
    expect(dueText("2026-11-05T09:00:00+05:30", now)).toBe("tomorrow");
    expect(dueText("2026-11-07T09:00:00+05:30", now)).toBe("on Saturday, 7 November");
  });

  it("adds the year when it is not this year", () => {
    expect(dueText("2027-01-12T09:00:00+05:30", now)).toBe("on Tuesday, 12 January 2027");
  });

  it("counts days where the learner lives", () => {
    // 20:00 UTC on 4 November is already 5 November in India.
    expect(dueText("2026-11-04T20:00:00Z", now)).toBe("tomorrow");
  });
});
