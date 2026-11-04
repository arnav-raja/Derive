import type { ReviewCard } from "@/lib/store/types";

/*
 * The order reviews are shown in: the most overdue first, but never two from
 * the same curriculum in a row when another is waiting, then never two from
 * the same lesson. Mixing subjects is the point: it trains choosing a method,
 * not only applying the one the last question used.
 */

export function orderDue(due: ReviewCard[], lastLesson: string | null): ReviewCard[] {
  const sorted = [...due].sort((a, b) => a.due.localeCompare(b.due) || a.cardId.localeCompare(b.cardId));
  if (!lastLesson || sorted.length < 2) return sorted;
  let i = sorted.findIndex((c) => c.lessonCode[0] !== lastLesson[0]);
  if (i < 0) i = sorted.findIndex((c) => c.lessonCode !== lastLesson);
  if (i > 0) sorted.unshift(...sorted.splice(i, 1));
  return sorted;
}
