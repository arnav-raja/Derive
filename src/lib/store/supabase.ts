import "server-only";

import type { DeriveSupabaseClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

import {
  StoreError,
  type Attempt,
  type AttemptInput,
  type AttemptKind,
  type AttemptQuery,
  type ConceptPatch,
  type ConceptState,
  type Explanation,
  type ExplanationInput,
  type Learner,
  type LearnerPatch,
  type LearnerSettings,
  type NotebookEntry,
  type NotebookInput,
  type NotebookKind,
  type NotebookSource,
  type PhaseId,
  type PhaseProgress,
  type PhaseProgressInput,
  type PhaseStatus,
  type Placement,
  type ReviewCard,
  type Store,
  type TutorMode,
  type TutorSession,
  type TutorSessionInput,
} from "./types";

function fail(what: string, error: { message: string } | null): never {
  throw new StoreError(`Could not ${what}: ${error?.message ?? "unknown error"}`, { cause: error });
}

function toLearner(row: Tables<"learners">, email: string | null): Learner {
  return {
    id: row.id,
    email,
    displayName: row.display_name,
    weeklyHours: Number(row.weekly_hours),
    dailyTutorBudgetUsd: Number(row.daily_tutor_budget_usd),
    monthlyComputeBudgetUsd: Number(row.monthly_compute_budget_usd),
    settings: (row.settings ?? {}) as LearnerSettings,
    placement: (row.placement ?? {}) as Placement,
    createdAt: row.created_at,
  };
}

function toProgress(row: Tables<"lesson_progress">): PhaseProgress {
  return {
    lessonCode: row.lesson_code,
    phase: row.phase as PhaseId,
    status: row.status as PhaseStatus,
    state: row.state,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

function toConcept(row: Tables<"concept_state">): ConceptState {
  return {
    conceptId: row.concept_id,
    producedAt: row.produced_at,
    explainedAt: row.explained_at,
    recalledAt: row.recalled_at,
    masteredAt: row.mastered_at,
    provisional: row.provisional,
    evidence: row.evidence,
    updatedAt: row.updated_at,
  };
}

function toCard(row: Tables<"review_cards">): ReviewCard {
  return {
    cardId: row.card_id,
    lessonCode: row.lesson_code,
    conceptId: row.concept_id,
    due: row.due,
    stability: row.stability,
    difficulty: row.difficulty,
    elapsedDays: row.elapsed_days,
    scheduledDays: row.scheduled_days,
    learningSteps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    lastReview: row.last_review,
    nextVariant: row.next_variant,
    provisional: row.provisional,
    createdAt: row.created_at,
  };
}

function toAttempt(row: Tables<"attempts">): Attempt {
  return {
    id: row.id,
    lessonCode: row.lesson_code,
    exerciseId: row.exercise_id,
    cardId: row.card_id,
    kind: row.kind as AttemptKind,
    correct: row.correct,
    confidence: row.confidence,
    hintsUsed: row.hints_used,
    rating: row.rating as Attempt["rating"],
    payload: row.payload,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  };
}

function toExplanation(row: Tables<"explanations">): Explanation {
  return {
    id: row.id,
    lessonCode: row.lesson_code,
    itemId: row.item_id,
    body: row.body,
    rubric: row.rubric,
    passed: row.passed,
    feedback: row.feedback,
    createdAt: row.created_at,
  };
}

function toNotebook(row: Tables<"notebook_entries">): NotebookEntry {
  return {
    id: row.id,
    kind: row.kind as NotebookKind,
    source: row.source as NotebookSource,
    lessonCode: row.lesson_code,
    location: row.location,
    body: row.body,
    revisitAt: row.revisit_at,
    status: row.status as NotebookEntry["status"],
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

function toTutorSession(row: Tables<"tutor_sessions">): TutorSession {
  return {
    id: row.id,
    lessonCode: row.lesson_code,
    exerciseId: row.exercise_id,
    mode: row.mode as TutorMode,
    rung: row.rung,
    summary: row.summary,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    cacheReadTokens: row.cache_read_tokens,
    cacheWriteTokens: row.cache_write_tokens,
    costUsd: Number(row.cost_usd),
    guardBlocked: row.guard_blocked,
    createdAt: row.created_at,
  };
}

export class SupabaseStore implements Store {
  constructor(
    private readonly db: DeriveSupabaseClient,
    readonly learnerId: string,
    private readonly email: string | null,
  ) {}

  async learner(): Promise<Learner> {
    const { data, error } = await this.db
      .from("learners")
      .select("*")
      .eq("id", this.learnerId)
      .maybeSingle();
    if (error) fail("load your profile", error);
    if (!data) throw new StoreError("Your learner profile is missing.");
    return toLearner(data, this.email);
  }

  async updateLearner(patch: LearnerPatch): Promise<Learner> {
    const { data, error } = await this.db
      .from("learners")
      .update({
        display_name: patch.displayName,
        weekly_hours: patch.weeklyHours,
        daily_tutor_budget_usd: patch.dailyTutorBudgetUsd,
        monthly_compute_budget_usd: patch.monthlyComputeBudgetUsd,
        settings: patch.settings,
        placement: patch.placement,
      })
      .eq("id", this.learnerId)
      .select("*")
      .single();
    if (error) fail("save your profile", error);
    return toLearner(data, this.email);
  }

  async progress(lessonCode?: string): Promise<PhaseProgress[]> {
    let query = this.db.from("lesson_progress").select("*").eq("learner_id", this.learnerId);
    if (lessonCode) query = query.eq("lesson_code", lessonCode);
    const { data, error } = await query.order("started_at");
    if (error) fail("load your lesson progress", error);
    return data.map(toProgress);
  }

  async savePhase(input: PhaseProgressInput): Promise<PhaseProgress> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from("lesson_progress")
      .upsert(
        {
          learner_id: this.learnerId,
          lesson_code: input.lessonCode,
          phase: input.phase,
          status: input.status,
          state: input.state,
          completed_at: input.status === "completed" ? now : null,
        },
        { onConflict: "learner_id,lesson_code,phase" },
      )
      .select("*")
      .single();
    if (error) fail("save your progress", error);
    return toProgress(data);
  }

  async concepts(): Promise<ConceptState[]> {
    const { data, error } = await this.db
      .from("concept_state")
      .select("*")
      .eq("learner_id", this.learnerId);
    if (error) fail("load your concept mastery", error);
    return data.map(toConcept);
  }

  async upsertConcepts(patches: ConceptPatch[]): Promise<void> {
    if (patches.length === 0) return;
    const existing = new Map((await this.concepts()).map((c) => [c.conceptId, c]));
    const rows = patches.map((p) => {
      const prev = existing.get(p.conceptId);
      return {
        learner_id: this.learnerId,
        concept_id: p.conceptId,
        produced_at: p.producedAt !== undefined ? p.producedAt : (prev?.producedAt ?? null),
        explained_at: p.explainedAt !== undefined ? p.explainedAt : (prev?.explainedAt ?? null),
        recalled_at: p.recalledAt !== undefined ? p.recalledAt : (prev?.recalledAt ?? null),
        mastered_at: p.masteredAt !== undefined ? p.masteredAt : (prev?.masteredAt ?? null),
        provisional: p.provisional ?? prev?.provisional ?? false,
        evidence: p.evidence ?? prev?.evidence ?? {},
      };
    });
    const { error } = await this.db
      .from("concept_state")
      .upsert(rows, { onConflict: "learner_id,concept_id" });
    if (error) fail("save your concept mastery", error);
  }

  async cards(query: { dueBefore?: string; lessonCode?: string } = {}): Promise<ReviewCard[]> {
    let q = this.db.from("review_cards").select("*").eq("learner_id", this.learnerId);
    if (query.dueBefore) q = q.lte("due", query.dueBefore);
    if (query.lessonCode) q = q.eq("lesson_code", query.lessonCode);
    const { data, error } = await q.order("due");
    if (error) fail("load your review cards", error);
    return data.map(toCard);
  }

  async upsertCards(cards: ReviewCard[]): Promise<void> {
    if (cards.length === 0) return;
    const { error } = await this.db.from("review_cards").upsert(
      cards.map((c) => ({
        learner_id: this.learnerId,
        card_id: c.cardId,
        lesson_code: c.lessonCode,
        concept_id: c.conceptId,
        due: c.due,
        stability: c.stability,
        difficulty: c.difficulty,
        elapsed_days: c.elapsedDays,
        scheduled_days: c.scheduledDays,
        learning_steps: c.learningSteps,
        reps: c.reps,
        lapses: c.lapses,
        state: c.state,
        last_review: c.lastReview,
        next_variant: c.nextVariant,
        provisional: c.provisional,
      })),
      { onConflict: "learner_id,card_id" },
    );
    if (error) fail("save your review cards", error);
  }

  async recordAttempt(input: AttemptInput): Promise<Attempt> {
    const { data, error } = await this.db
      .from("attempts")
      .insert({
        learner_id: this.learnerId,
        lesson_code: input.lessonCode ?? null,
        exercise_id: input.exerciseId ?? null,
        card_id: input.cardId ?? null,
        kind: input.kind,
        correct: input.correct ?? null,
        confidence: input.confidence ?? null,
        hints_used: input.hintsUsed ?? 0,
        rating: input.rating ?? null,
        payload: input.payload ?? {},
        duration_ms: input.durationMs ?? null,
      })
      .select("*")
      .single();
    if (error) fail("record your answer", error);
    return toAttempt(data);
  }

  async attempts(query: AttemptQuery = {}): Promise<Attempt[]> {
    let q = this.db.from("attempts").select("*").eq("learner_id", this.learnerId);
    if (query.since) q = q.gte("created_at", query.since);
    if (query.lessonCode) q = q.eq("lesson_code", query.lessonCode);
    if (query.exerciseId) q = q.eq("exercise_id", query.exerciseId);
    if (query.kinds?.length) q = q.in("kind", query.kinds);
    q = q.order("created_at", { ascending: false });
    if (query.limit) q = q.limit(query.limit);
    const { data, error } = await q;
    if (error) fail("load your answers", error);
    return data.map(toAttempt);
  }

  async saveExplanation(input: ExplanationInput): Promise<Explanation> {
    const { data, error } = await this.db
      .from("explanations")
      .insert({
        learner_id: this.learnerId,
        lesson_code: input.lessonCode,
        item_id: input.itemId,
        body: input.body,
        rubric: input.rubric,
        passed: input.passed,
        feedback: input.feedback,
      })
      .select("*")
      .single();
    if (error) fail("save your explanation", error);
    return toExplanation(data);
  }

  async explanations(lessonCode?: string): Promise<Explanation[]> {
    let q = this.db.from("explanations").select("*").eq("learner_id", this.learnerId);
    if (lessonCode) q = q.eq("lesson_code", lessonCode);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) fail("load your explanations", error);
    return data.map(toExplanation);
  }

  async notebook(query: { status?: "open" | "resolved" } = {}): Promise<NotebookEntry[]> {
    let q = this.db.from("notebook_entries").select("*").eq("learner_id", this.learnerId);
    if (query.status) q = q.eq("status", query.status);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) fail("load your notebook", error);
    return data.map(toNotebook);
  }

  async addNotebookEntry(input: NotebookInput): Promise<NotebookEntry> {
    const { data, error } = await this.db
      .from("notebook_entries")
      .insert({
        learner_id: this.learnerId,
        kind: input.kind,
        source: input.source,
        lesson_code: input.lessonCode ?? null,
        location: input.location ?? null,
        body: input.body,
        revisit_at: input.revisitAt ?? null,
      })
      .select("*")
      .single();
    if (error) fail("save the notebook entry", error);
    return toNotebook(data);
  }

  async resolveNotebookEntry(id: number): Promise<void> {
    const { error } = await this.db
      .from("notebook_entries")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("learner_id", this.learnerId)
      .eq("id", id);
    if (error) fail("resolve the notebook entry", error);
  }

  async recordTutorSession(input: TutorSessionInput): Promise<void> {
    const { error } = await this.db.from("tutor_sessions").insert({
      learner_id: this.learnerId,
      lesson_code: input.lessonCode ?? null,
      exercise_id: input.exerciseId ?? null,
      mode: input.mode,
      rung: input.rung ?? null,
      summary: input.summary ?? null,
      input_tokens: input.inputTokens,
      output_tokens: input.outputTokens,
      cache_read_tokens: input.cacheReadTokens,
      cache_write_tokens: input.cacheWriteTokens,
      cost_usd: input.costUsd,
      guard_blocked: input.guardBlocked,
    });
    if (error) fail("record the tutor's work", error);
  }

  async tutorSessions(query: { since?: string } = {}): Promise<TutorSession[]> {
    let q = this.db.from("tutor_sessions").select("*").eq("learner_id", this.learnerId);
    if (query.since) q = q.gte("created_at", query.since);
    const { data, error } = await q.order("created_at", { ascending: false });
    if (error) fail("load the tutor's records", error);
    return data.map(toTutorSession);
  }
}
