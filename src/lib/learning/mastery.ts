import type { ConceptPatch, ConceptState, Json, ReviewCard } from "@/lib/store/types";

/*
 * A concept counts as mastered only when all three hold: the learner produced
 * it in a build or derivation with at most a light hint, their explanation met
 * the rubric, and its review cards are being recalled. Pure functions.
 */

/** A light hint is one of the first two rungs: a question back, or a pointer to the past. */
export const LIGHT_HINTS = 2;

export type EvidenceEvent = {
  type: "produced" | "explained" | "recalled" | "forgotten" | "placement" | "confirmed" | "unconfirmed";
  at: string;
  ref?: string;
};

function events(evidence: Json | undefined): EvidenceEvent[] {
  return Array.isArray(evidence) ? (evidence as unknown as EvidenceEvent[]) : [];
}

export function isMastered(state: ConceptState | undefined): boolean {
  return Boolean(state?.masteredAt);
}

/** Placement's provisional skips also open later lessons, until a review says otherwise. */
export function satisfiesPrerequisite(state: ConceptState | undefined): boolean {
  return Boolean(state?.masteredAt) || Boolean(state?.provisional);
}

/** True when every card of the concept has been reviewed and its latest review was recalled. */
export function recalled(cards: ReviewCard[], latestOutcome: Map<string, boolean>): boolean {
  return cards.length > 0 && cards.every((c) => latestOutcome.get(c.cardId) === true);
}

export type EvidenceUpdate = {
  produced?: { ref: string };
  explained?: { ref: string };
  /** Recomputed recall: true when every card's latest review succeeded. */
  recalled?: boolean;
};

/**
 * The patch to a concept's state after new evidence. Mastery is set the first
 * time all three conditions hold, and cleared if recall later fails.
 */
export function evidencePatch(
  conceptId: string,
  prev: ConceptState | undefined,
  update: EvidenceUpdate,
  now: Date,
): ConceptPatch {
  const at = now.toISOString();
  const log = events(prev?.evidence);
  let producedAt = prev?.producedAt ?? null;
  let explainedAt = prev?.explainedAt ?? null;
  let recalledAt = prev?.recalledAt ?? null;

  if (update.produced && !producedAt) {
    producedAt = at;
    log.push({ type: "produced", at, ref: update.produced.ref });
  }
  if (update.explained && !explainedAt) {
    explainedAt = at;
    log.push({ type: "explained", at, ref: update.explained.ref });
  }
  if (update.recalled === true && !recalledAt) {
    recalledAt = at;
    log.push({ type: "recalled", at });
  }
  if (update.recalled === false && recalledAt) {
    recalledAt = null;
    log.push({ type: "forgotten", at });
  }

  const all = Boolean(producedAt && explainedAt && recalledAt);
  const masteredAt = all ? (prev?.masteredAt ?? at) : null;
  return {
    conceptId,
    producedAt,
    explainedAt,
    recalledAt,
    masteredAt,
    evidence: log.slice(-30) as unknown as Json,
  };
}

/**
 * Placement marks a skipped concept provisional. Two successful spaced reviews
 * confirm it; a failed review withdraws it, so the lesson is studied after all.
 */
export function provisionalReviewPatch(
  conceptId: string,
  prev: ConceptState | undefined,
  successes: number,
  failed: boolean,
  now: Date,
): ConceptPatch | null {
  if (!prev?.provisional) return null;
  const at = now.toISOString();
  const log = events(prev.evidence);
  if (failed) {
    log.push({ type: "unconfirmed", at });
    return { conceptId, provisional: false, masteredAt: null, recalledAt: null, evidence: log.slice(-30) as unknown as Json };
  }
  if (successes >= 2) {
    log.push({ type: "confirmed", at });
    return {
      conceptId,
      provisional: false,
      producedAt: prev.producedAt ?? at,
      explainedAt: prev.explainedAt ?? at,
      recalledAt: at,
      masteredAt: prev.masteredAt ?? at,
      evidence: log.slice(-30) as unknown as Json,
    };
  }
  return null;
}
