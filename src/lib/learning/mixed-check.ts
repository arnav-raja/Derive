import "server-only";

import { loadLesson, type LoadedLesson } from "@/lib/content/lesson";
import type { Attempt, Json, PhaseId, ReviewCard, Store } from "@/lib/store/types";

import { retrievability } from "./reviews";
import { exerciseStates } from "./state";

/*
 * The short mixed check that closes a lesson: two questions on this lesson and
 * four from earlier lessons, interleaved, each a review variant the learner
 * has not just seen. The items are chosen once, when the Explain phase opens,
 * and kept in that phase's state so they do not shift while being answered.
 */

export type CheckItem = { cardId: string; variant: number };

const OWN_MIN = 2;
const EARLIER_MAX = 4;
const TOTAL_MIN = 4;

function cardRef(cardId: string): { lessonCode: string; exerciseId: string } | null {
  const m = /^([MLE]\d{1,2}\.\d{1,2})\/([a-z0-9-]+)$/.exec(cardId);
  return m ? { lessonCode: m[1]!, exerciseId: m[2]! } : null;
}

function variantCount(card: ReviewCard): number {
  const ref = cardRef(card.cardId);
  const ex = ref ? loadLesson(ref.lessonCode)?.byId.get(ref.exerciseId) : undefined;
  return ex?.review?.variants.length ?? 0;
}

/** The items stored in the Explain phase's state, if any. */
export function storedCheck(state: Json | null | undefined): CheckItem[] | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const raw = state.mixedCheck;
  if (!Array.isArray(raw)) return null;
  const items: CheckItem[] = [];
  for (const r of raw) {
    if (r && typeof r === "object" && !Array.isArray(r) && typeof r.cardId === "string" && typeof r.variant === "number") {
      items.push({ cardId: r.cardId, variant: r.variant });
    }
  }
  return items;
}

/** Interleaves two lists, one from each in turn, starting with the first. */
function interleave<T>(a: T[], b: T[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (i < a.length) out.push(a[i]!);
    if (i < b.length) out.push(b[i]!);
  }
  return out;
}

/**
 * Chooses the check. From this lesson, the weakest items first: missed, then
 * hinted. From earlier lessons, the cards most at risk of being forgotten,
 * one per lesson before any lesson gives two. Each item uses the variant after
 * the one the next review will show, so the two never coincide.
 */
export async function chooseMixedCheck(store: Store, lesson: LoadedLesson, now = new Date()): Promise<CheckItem[]> {
  const [cards, attempts] = await Promise.all([
    store.cards(),
    store.attempts({ lessonCode: lesson.code, limit: 2000 }),
  ]);
  const usable = cards.filter((c) => variantCount(c) >= 2);
  const states = exerciseStates(lesson.exercises, attempts);
  const order = new Map(lesson.exercises.map((e, i) => [e.id, i]));
  const weakness = (cardId: string) => {
    const s = states.get(cardRef(cardId)?.exerciseId ?? "");
    return (s?.solved ? 0 : 2) + ((s?.hintsUsed ?? 0) > 0 ? 1 : 0);
  };
  const position = (cardId: string) => order.get(cardRef(cardId)?.exerciseId ?? "") ?? 0;

  const own = usable
    .filter((c) => c.lessonCode === lesson.code)
    .sort((a, b) => weakness(b.cardId) - weakness(a.cardId) || position(a.cardId) - position(b.cardId));

  const others = usable
    .filter((c) => c.lessonCode !== lesson.code)
    .sort((a, b) => retrievability(a, now) - retrievability(b, now) || a.cardId.localeCompare(b.cardId));
  const earlier: ReviewCard[] = [];
  const lessons = new Set<string>();
  for (const c of others) {
    if (earlier.length >= EARLIER_MAX) break;
    if (lessons.has(c.lessonCode)) continue;
    earlier.push(c);
    lessons.add(c.lessonCode);
  }
  for (const c of others) {
    if (earlier.length >= EARLIER_MAX) break;
    if (!earlier.includes(c)) earlier.push(c);
  }

  const ownPicked = own.slice(0, Math.max(OWN_MIN, TOTAL_MIN - earlier.length));
  return interleave(earlier, ownPicked).map((c) => ({
    cardId: c.cardId,
    variant: (c.nextVariant + 1) % variantCount(c),
  }));
}

/** The state a phase starts with: the Explain phase carries its mixed check. */
export async function phaseStartState(store: Store, lesson: LoadedLesson, phase: PhaseId): Promise<Json> {
  if (phase !== "explain" || !hasMixedCheck(lesson)) return {};
  return { mixedCheck: await chooseMixedCheck(store, lesson) };
}

/** Whether the lesson's Explain phase includes the mixed check. */
export function hasMixedCheck(lesson: LoadedLesson): boolean {
  return /<MixedCheck\b/.test(lesson.sources.explain);
}

/** Check items not yet answered, given the lesson's check attempts. */
export function unansweredCheck(items: CheckItem[], attempts: Attempt[]): CheckItem[] {
  const answered = new Set(attempts.filter((a) => a.kind === "check" && a.cardId).map((a) => a.cardId!));
  return items.filter((i) => !answered.has(i.cardId));
}
