import { addDays, localDate, weekStart } from "./time";

/*
 * The pace governor: the plan's six rules that keep study slow and steady.
 * Pure functions; the pages gather the inputs.
 *
 *   1. Reviews come first: new material waits until the day's due reviews are done.
 *   2. New lessons pause when more than 30 reviews are overdue, or when last
 *      week's recall fell below 85%.
 *   3. A lesson unlocks only when every hard prerequisite is mastered.
 *   4. At most three new lessons start each week (at 10 hours a week).
 *   5. At most one new lesson starts on any day.
 *   6. Phases finished far faster than the learner's norm while missing checks
 *      add a recall round and a suggestion to slow down.
 */

export const OVERDUE_LIMIT = 30;
export const RECALL_FLOOR = 0.85;
/** Recall over fewer reviews than this says too little to pause anything. */
export const RECALL_MIN_SAMPLE = 10;
export const SPEED_RATIO = 0.4;
export const SPEED_MISSES = 2;

export type GovernorInput = {
  now: Date;
  timeZone: string;
  /** Cards due by now. */
  dueNow: number;
  /** Cards that were due before today began. */
  overdue: number;
  lastWeekReviews: { total: number; correct: number };
  weeklyHours: number;
  /** When each lesson began (its Puzzle phase started), as ISO times. */
  lessonStarts: string[];
};

export type GovernorReason = { rule: 1 | 2 | 4 | 5; text: string };

export type GovernorDecision = {
  /** Rule 1: whether a phase that has not started may start now. */
  canStartPhase: boolean;
  /** Rules 1, 2, 4 and 5: whether a new lesson may begin now. */
  canBeginLesson: boolean;
  reasons: GovernorReason[];
  weeklyLimit: number;
  startedThisWeek: number;
  startedToday: number;
};

/** Three new lessons a week at 10 hours, scaled with the learner's weekly hours. */
export function weeklyLessonLimit(weeklyHours: number): number {
  return Math.max(1, Math.round((weeklyHours * 3) / 10));
}

export function decide(input: GovernorInput): GovernorDecision {
  const today = localDate(input.now, input.timeZone);
  const monday = weekStart(input.now, input.timeZone);
  const startDates = input.lessonStarts.map((s) => localDate(new Date(s), input.timeZone));
  const startedToday = startDates.filter((d) => d === today).length;
  const startedThisWeek = startDates.filter((d) => d >= monday && d <= addDays(monday, 6)).length;
  const weeklyLimit = weeklyLessonLimit(input.weeklyHours);
  const reasons: GovernorReason[] = [];

  if (input.dueNow > 0) {
    reasons.push({
      rule: 1,
      text: `Reviews come first: ${input.dueNow} ${input.dueNow === 1 ? "is" : "are"} due.`,
    });
  }
  if (input.overdue > OVERDUE_LIMIT) {
    reasons.push({
      rule: 2,
      text: `New lessons pause while more than ${OVERDUE_LIMIT} reviews are overdue (${input.overdue} now).`,
    });
  }
  const { total, correct } = input.lastWeekReviews;
  if (total >= RECALL_MIN_SAMPLE && correct / total < RECALL_FLOOR) {
    reasons.push({
      rule: 2,
      text: `New lessons pause while last week's recall is below 85% (${Math.round((100 * correct) / total)}% now). Reviews will bring it back up.`,
    });
  }
  if (startedThisWeek >= weeklyLimit) {
    reasons.push({
      rule: 4,
      text: `This week's ${weeklyLimit} new ${weeklyLimit === 1 ? "lesson has" : "lessons have"} started; the next can begin on Monday.`,
    });
  }
  if (startedToday >= 1) {
    reasons.push({ rule: 5, text: "One new lesson a day at most; the next can begin tomorrow." });
  }

  return {
    canStartPhase: input.dueNow === 0,
    canBeginLesson: reasons.length === 0,
    reasons,
    weeklyLimit,
    startedThisWeek,
    startedToday,
  };
}

/**
 * Rule 6. The learner's norm is the median ratio of actual to planned minutes
 * over their completed phases; with fewer than three, the plan's minutes are
 * the norm.
 */
export function tooFast(input: {
  actualMinutes: number;
  plannedMinutes: number;
  missedChecks: number;
  history: { actualMinutes: number; plannedMinutes: number }[];
}): boolean {
  const ratios = input.history
    .filter((h) => h.plannedMinutes > 0 && h.actualMinutes > 0)
    .map((h) => h.actualMinutes / h.plannedMinutes)
    .sort((a, b) => a - b);
  const norm = ratios.length >= 3 ? ratios[Math.floor(ratios.length / 2)]! : 1;
  const ratio = input.plannedMinutes > 0 ? input.actualMinutes / input.plannedMinutes : 1;
  return ratio < SPEED_RATIO * norm && input.missedChecks >= SPEED_MISSES;
}
