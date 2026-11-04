import "server-only";

import { DEFAULT_TIME_ZONE, localDate, startOfLocalDay } from "@/lib/learning/time";
import type { Store } from "@/lib/store/types";

/*
 * The tutor's daily budget: everything the Claude API costs for one learner
 * since midnight where they live. When it is spent, hints come from the
 * lesson's authored notes, which cost nothing, until the next day.
 */

export type Budget = { spentUsd: number; limitUsd: number; remainingUsd: number; exhausted: boolean };

/** What the next request might cost at most, so one request cannot overshoot by much. */
export const REQUEST_RESERVE_USD = 0.05;

export async function tutorBudget(store: Store, now = new Date(), timeZone = DEFAULT_TIME_ZONE): Promise<Budget> {
  const since = startOfLocalDay(localDate(now, timeZone), timeZone).toISOString();
  const [learner, sessions] = await Promise.all([store.learner(), store.tutorSessions({ since })]);
  const spentUsd = sessions.reduce((sum, s) => sum + s.costUsd, 0);
  const limitUsd = learner.dailyTutorBudgetUsd;
  const remainingUsd = Math.max(0, limitUsd - spentUsd);
  return { spentUsd, limitUsd, remainingUsd, exhausted: remainingUsd < REQUEST_RESERVE_USD };
}
