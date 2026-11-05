import type { ActivityPoint } from "@/lib/store/types";

import { addDays, DEFAULT_TIME_ZONE, localDate, startOfLocalDay, weekStart } from "./time";

/*
 * The learner's activity, counted by day where they live: how many answers
 * each day held, the runs of days with practice in them, and recall on
 * reviews week by week. Pure functions; the Progress page gathers the answers.
 */

export type ActivityDay = { date: string; count: number; future: boolean };

export type WeekRecall = { start: string; total: number; correct: number };

export type ActivitySummary = {
  /** Whole weeks, Monday to Sunday, oldest first; the last holds today. */
  weeks: ActivityDay[][];
  activeDays: number;
  answers: number;
  /** Days in a row with practice, up to today (or yesterday, while today is still empty). */
  currentRun: number;
  longestRun: number;
  /** Reviews answered in each of the last weeks, oldest first. */
  recall: WeekRecall[];
};

/** The instant the window opens: the Monday that starts the first of `weeks` weeks ending this week. */
export function activityStart(now: Date, weeks: number, timeZone = DEFAULT_TIME_ZONE): string {
  return startOfLocalDay(addDays(weekStart(now, timeZone), -7 * (weeks - 1)), timeZone).toISOString();
}

export function summariseActivity(
  points: ActivityPoint[],
  now: Date,
  weeks: number,
  { timeZone = DEFAULT_TIME_ZONE, recallWeeks = 8 }: { timeZone?: string; recallWeeks?: number } = {},
): ActivitySummary {
  const today = localDate(now, timeZone);
  const first = addDays(weekStart(now, timeZone), -7 * (weeks - 1));

  const perDay = new Map<string, number>();
  const reviews = new Map<string, { total: number; correct: number }>();
  for (const p of points) {
    const date = localDate(p.createdAt, timeZone);
    perDay.set(date, (perDay.get(date) ?? 0) + 1);
    if (p.kind === "review" && p.correct !== null) {
      const week = weekStart(p.createdAt, timeZone);
      const r = reviews.get(week) ?? { total: 0, correct: 0 };
      r.total += 1;
      if (p.correct) r.correct += 1;
      reviews.set(week, r);
    }
  }

  const grid: ActivityDay[][] = [];
  let activeDays = 0;
  let answers = 0;
  let longestRun = 0;
  let run = 0;
  for (let w = 0; w < weeks; w++) {
    const week: ActivityDay[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(first, w * 7 + d);
      const future = date > today;
      const count = future ? 0 : (perDay.get(date) ?? 0);
      week.push({ date, count, future });
      if (future) continue;
      answers += count;
      if (count > 0) {
        activeDays += 1;
        run += 1;
        longestRun = Math.max(longestRun, run);
      } else {
        run = 0;
      }
    }
    grid.push(week);
  }

  // The current run counts back from today; an empty today does not break it yet.
  let currentRun = 0;
  let day = (perDay.get(today) ?? 0) > 0 ? today : addDays(today, -1);
  while (day >= first && (perDay.get(day) ?? 0) > 0) {
    currentRun += 1;
    day = addDays(day, -1);
  }

  const thisWeek = weekStart(now, timeZone);
  const recall: WeekRecall[] = [];
  for (let i = recallWeeks - 1; i >= 0; i--) {
    const start = addDays(thisWeek, -7 * i);
    recall.push({ start, ...(reviews.get(start) ?? { total: 0, correct: 0 }) });
  }

  return { weeks: grid, activeDays, answers, currentRun, longestRun, recall };
}

/** How dark a day's square is drawn, from 0 (no answers) to 4. */
export function activityLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 5) return 1;
  if (count <= 15) return 2;
  if (count <= 30) return 3;
  return 4;
}
