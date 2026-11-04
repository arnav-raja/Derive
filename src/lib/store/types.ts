import type { Json } from "@/lib/supabase/database.types";

export type { Json };

/** The six phases every lesson runs, in order. */
export const PHASES = ["puzzle", "recall", "explore", "derive", "build", "explain"] as const;
export type PhaseId = (typeof PHASES)[number];

export const ATTEMPT_KINDS = [
  "predict",
  "recall",
  "step",
  "proof",
  "build",
  "breakit",
  "estimate",
  "debug",
  "visualise",
  "explain",
  "review",
  "placement",
  "check",
  "run",
] as const;
export type AttemptKind = (typeof ATTEMPT_KINDS)[number];

export type ThemePreference = "system" | "light" | "dark";

export type LearnerSettings = {
  theme?: ThemePreference;
  reducedMotion?: boolean;
};

/** Placement results per course: which concepts were skipped provisionally. */
export type Placement = {
  [courseCode: string]: {
    takenAt: string;
    skippedConcepts: string[];
    skippedLessons: string[];
  };
};

export type Learner = {
  id: string;
  email: string | null;
  displayName: string | null;
  weeklyHours: number;
  dailyTutorBudgetUsd: number;
  monthlyComputeBudgetUsd: number;
  settings: LearnerSettings;
  placement: Placement;
  createdAt: string;
};

export type LearnerPatch = Partial<
  Pick<
    Learner,
    | "displayName"
    | "weeklyHours"
    | "dailyTutorBudgetUsd"
    | "monthlyComputeBudgetUsd"
    | "settings"
    | "placement"
  >
>;

export type PhaseStatus = "started" | "completed";

export type PhaseProgress = {
  lessonCode: string;
  phase: PhaseId;
  status: PhaseStatus;
  /** Per-phase working state: answers so far, code drafts, step positions. */
  state: Json;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
};

export type PhaseProgressInput = {
  lessonCode: string;
  phase: PhaseId;
  status: PhaseStatus;
  state: Json;
};

export type ConceptState = {
  conceptId: string;
  /** Produced in a build or derivation with at most a light hint. */
  producedAt: string | null;
  /** The explain-back rubric was met. */
  explainedAt: string | null;
  /** A spaced review was recalled successfully. */
  recalledAt: string | null;
  masteredAt: string | null;
  /** Skipped by placement: must be confirmed by spaced reviews. */
  provisional: boolean;
  evidence: Json;
  updatedAt: string;
};

export type ConceptPatch = { conceptId: string } & Partial<Omit<ConceptState, "conceptId" | "updatedAt">>;

export type ReviewCard = {
  cardId: string;
  lessonCode: string;
  conceptId: string;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  /** FSRS state: 0 new, 1 learning, 2 review, 3 relearning. */
  state: number;
  lastReview: string | null;
  /** Which variant of the question to show next, so the answer is not memorised. */
  nextVariant: number;
  provisional: boolean;
  createdAt: string;
};

export type AttemptInput = {
  lessonCode?: string | null;
  exerciseId?: string | null;
  cardId?: string | null;
  kind: AttemptKind;
  correct?: boolean | null;
  confidence?: number | null;
  hintsUsed?: number;
  rating?: 1 | 2 | 3 | 4 | null;
  payload?: Json;
  durationMs?: number | null;
};

export type Attempt = Required<Omit<AttemptInput, "rating">> & {
  rating: 1 | 2 | 3 | 4 | null;
  id: number;
  createdAt: string;
};

export type AttemptQuery = {
  since?: string;
  lessonCode?: string;
  exerciseId?: string;
  kinds?: AttemptKind[];
  limit?: number;
};

export type ExplanationInput = {
  lessonCode: string;
  itemId: string;
  body: string;
  rubric: Json;
  passed: boolean | null;
  feedback: string | null;
};

export type Explanation = ExplanationInput & { id: number; createdAt: string };

export const NOTEBOOK_KINDS = ["gap", "question", "misconception", "explanation", "confused"] as const;
export type NotebookKind = (typeof NOTEBOOK_KINDS)[number];
export type NotebookSource = "learner" | "tutor" | "system";

export type NotebookInput = {
  kind: NotebookKind;
  source: NotebookSource;
  lessonCode?: string | null;
  location?: string | null;
  body: string;
  revisitAt?: string | null;
};

export type NotebookEntry = Required<NotebookInput> & {
  id: number;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt: string | null;
};

export type TutorMode = "hint" | "novice" | "grade" | "socratic" | "examiner" | "notebook";

export type TutorSessionInput = {
  lessonCode?: string | null;
  exerciseId?: string | null;
  mode: TutorMode;
  rung?: number | null;
  summary?: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  costUsd: number;
  guardBlocked: number;
};

export type TutorSession = Required<TutorSessionInput> & { id: number; createdAt: string };

/**
 * Everything Derive reads or writes about a learner goes through a Store.
 * SupabaseStore is used in production, under row-level security as the
 * signed-in learner; FileStore is used in local development and tests.
 */
export interface Store {
  readonly learnerId: string;

  learner(): Promise<Learner>;
  updateLearner(patch: LearnerPatch): Promise<Learner>;

  progress(lessonCode?: string): Promise<PhaseProgress[]>;
  savePhase(input: PhaseProgressInput): Promise<PhaseProgress>;

  concepts(): Promise<ConceptState[]>;
  upsertConcepts(patches: ConceptPatch[]): Promise<void>;

  cards(query?: { dueBefore?: string; lessonCode?: string }): Promise<ReviewCard[]>;
  upsertCards(cards: ReviewCard[]): Promise<void>;

  recordAttempt(input: AttemptInput): Promise<Attempt>;
  attempts(query?: AttemptQuery): Promise<Attempt[]>;

  saveExplanation(input: ExplanationInput): Promise<Explanation>;
  explanations(lessonCode?: string): Promise<Explanation[]>;

  notebook(query?: { status?: "open" | "resolved" }): Promise<NotebookEntry[]>;
  addNotebookEntry(input: NotebookInput): Promise<NotebookEntry>;
  resolveNotebookEntry(id: number): Promise<void>;

  recordTutorSession(input: TutorSessionInput): Promise<void>;
  tutorSessions(query?: { since?: string }): Promise<TutorSession[]>;
}

export class StoreError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "StoreError";
  }
}
