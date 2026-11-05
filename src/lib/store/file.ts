import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  StoreError,
  type ActivityPoint,
  type Attempt,
  type AttemptInput,
  type AttemptQuery,
  type ConceptPatch,
  type ConceptState,
  type Explanation,
  type ExplanationInput,
  type Learner,
  type LearnerPatch,
  type NotebookEntry,
  type NotebookInput,
  type PhaseProgress,
  type PhaseProgressInput,
  type ReviewCard,
  type Store,
  type TutorSession,
  type TutorSessionInput,
} from "./types";

/** The single learner used in local development and tests. */
export const LOCAL_LEARNER_ID = "00000000-0000-4000-8000-000000000001";
export const LOCAL_LEARNER_EMAIL = "local.learner@derive.test";

type Data = {
  learner: Omit<Learner, "email">;
  progress: PhaseProgress[];
  concepts: ConceptState[];
  cards: ReviewCard[];
  attempts: Attempt[];
  explanations: Explanation[];
  notebook: NotebookEntry[];
  tutorSessions: TutorSession[];
  nextId: number;
};

function freshData(): Data {
  return {
    learner: {
      id: LOCAL_LEARNER_ID,
      displayName: null,
      weeklyHours: 10,
      dailyTutorBudgetUsd: 2,
      monthlyComputeBudgetUsd: 15,
      settings: {},
      placement: {},
      createdAt: new Date().toISOString(),
    },
    progress: [],
    concepts: [],
    cards: [],
    attempts: [],
    explanations: [],
    notebook: [],
    tutorSessions: [],
    nextId: 1,
  };
}

// One queue per file, so concurrent requests in the same process never
// overwrite each other's writes.
const queues = new Map<string, Promise<unknown>>();

/**
 * Stores one learner's data in a JSON file. For local development and
 * end-to-end tests only; production uses SupabaseStore.
 */
export class FileStore implements Store {
  readonly learnerId = LOCAL_LEARNER_ID;
  private readonly file: string;

  constructor(dir = process.env.DERIVE_LOCAL_DIR ?? path.join(process.cwd(), ".derive-local")) {
    this.file = path.join(dir, "store.json");
  }

  private async read(): Promise<Data> {
    try {
      return JSON.parse(await readFile(this.file, "utf8")) as Data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return freshData();
      throw new StoreError("Could not read the local store.", { cause: error });
    }
  }

  private async write(data: Data): Promise<void> {
    await mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await rename(tmp, this.file);
  }

  /** Runs a read-modify-write step after every earlier step on this file. */
  private mutate<T>(fn: (data: Data) => T): Promise<T> {
    const previous = queues.get(this.file) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(async () => {
        const data = await this.read();
        const result = fn(data);
        await this.write(data);
        return result;
      });
    queues.set(this.file, next);
    return next;
  }

  private async view<T>(fn: (data: Data) => T): Promise<T> {
    await (queues.get(this.file) ?? Promise.resolve()).catch(() => undefined);
    return fn(await this.read());
  }

  async learner(): Promise<Learner> {
    return this.view((d) => ({ ...d.learner, email: LOCAL_LEARNER_EMAIL }));
  }

  async updateLearner(patch: LearnerPatch): Promise<Learner> {
    return this.mutate((d) => {
      d.learner = {
        ...d.learner,
        ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      };
      return { ...d.learner, email: LOCAL_LEARNER_EMAIL };
    });
  }

  async progress(lessonCode?: string): Promise<PhaseProgress[]> {
    return this.view((d) =>
      d.progress
        .filter((p) => !lessonCode || p.lessonCode === lessonCode)
        .sort((a, b) => a.startedAt.localeCompare(b.startedAt)),
    );
  }

  async savePhase(input: PhaseProgressInput): Promise<PhaseProgress> {
    return this.mutate((d) => {
      const now = new Date().toISOString();
      const existing = d.progress.find(
        (p) => p.lessonCode === input.lessonCode && p.phase === input.phase,
      );
      if (existing) {
        existing.status = input.status;
        existing.state = input.state;
        existing.completedAt = input.status === "completed" ? now : null;
        existing.updatedAt = now;
        return { ...existing };
      }
      const row: PhaseProgress = {
        ...input,
        startedAt: now,
        completedAt: input.status === "completed" ? now : null,
        updatedAt: now,
      };
      d.progress.push(row);
      return { ...row };
    });
  }

  async concepts(): Promise<ConceptState[]> {
    return this.view((d) => d.concepts.map((c) => ({ ...c })));
  }

  async upsertConcepts(patches: ConceptPatch[]): Promise<void> {
    if (patches.length === 0) return;
    await this.mutate((d) => {
      const now = new Date().toISOString();
      for (const patch of patches) {
        const defined = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        ) as ConceptPatch;
        const existing = d.concepts.find((c) => c.conceptId === patch.conceptId);
        if (existing) {
          Object.assign(existing, defined, { updatedAt: now });
        } else {
          d.concepts.push({
            producedAt: null,
            explainedAt: null,
            recalledAt: null,
            masteredAt: null,
            provisional: false,
            evidence: {},
            ...defined,
            updatedAt: now,
          });
        }
      }
    });
  }

  async cards(query: { dueBefore?: string; lessonCode?: string } = {}): Promise<ReviewCard[]> {
    return this.view((d) =>
      d.cards
        .filter((c) => !query.dueBefore || c.due <= query.dueBefore)
        .filter((c) => !query.lessonCode || c.lessonCode === query.lessonCode)
        .sort((a, b) => a.due.localeCompare(b.due))
        .map((c) => ({ ...c })),
    );
  }

  async upsertCards(cards: ReviewCard[]): Promise<void> {
    if (cards.length === 0) return;
    await this.mutate((d) => {
      for (const card of cards) {
        const index = d.cards.findIndex((c) => c.cardId === card.cardId);
        if (index >= 0) d.cards[index] = { ...card };
        else d.cards.push({ ...card });
      }
    });
  }

  async recordAttempt(input: AttemptInput): Promise<Attempt> {
    return this.mutate((d) => {
      const row: Attempt = {
        id: d.nextId++,
        lessonCode: input.lessonCode ?? null,
        exerciseId: input.exerciseId ?? null,
        cardId: input.cardId ?? null,
        kind: input.kind,
        correct: input.correct ?? null,
        confidence: input.confidence ?? null,
        hintsUsed: input.hintsUsed ?? 0,
        rating: input.rating ?? null,
        payload: input.payload ?? {},
        durationMs: input.durationMs ?? null,
        createdAt: new Date().toISOString(),
      };
      d.attempts.push(row);
      return { ...row };
    });
  }

  async attempts(query: AttemptQuery = {}): Promise<Attempt[]> {
    return this.view((d) => {
      const rows = d.attempts
        .filter((a) => !query.since || a.createdAt >= query.since)
        .filter((a) => !query.lessonCode || a.lessonCode === query.lessonCode)
        .filter((a) => !query.exerciseId || a.exerciseId === query.exerciseId)
        .filter((a) => !query.kinds?.length || query.kinds.includes(a.kind))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
      return query.limit ? rows.slice(0, query.limit) : rows;
    });
  }

  async activity(since: string): Promise<ActivityPoint[]> {
    const rows = await this.attempts({ since });
    return rows.map((a) => ({ createdAt: a.createdAt, kind: a.kind, correct: a.correct }));
  }

  async saveExplanation(input: ExplanationInput): Promise<Explanation> {
    return this.mutate((d) => {
      const row: Explanation = { ...input, id: d.nextId++, createdAt: new Date().toISOString() };
      d.explanations.push(row);
      return { ...row };
    });
  }

  async explanations(lessonCode?: string): Promise<Explanation[]> {
    return this.view((d) =>
      d.explanations
        .filter((e) => !lessonCode || e.lessonCode === lessonCode)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id),
    );
  }

  async notebook(query: { status?: "open" | "resolved" } = {}): Promise<NotebookEntry[]> {
    return this.view((d) =>
      d.notebook
        .filter((n) => !query.status || n.status === query.status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id),
    );
  }

  async addNotebookEntry(input: NotebookInput): Promise<NotebookEntry> {
    return this.mutate((d) => {
      const row: NotebookEntry = {
        id: d.nextId++,
        kind: input.kind,
        source: input.source,
        lessonCode: input.lessonCode ?? null,
        location: input.location ?? null,
        body: input.body,
        revisitAt: input.revisitAt ?? null,
        status: "open",
        createdAt: new Date().toISOString(),
        resolvedAt: null,
      };
      d.notebook.push(row);
      return { ...row };
    });
  }

  async resolveNotebookEntry(id: number): Promise<void> {
    await this.mutate((d) => {
      const entry = d.notebook.find((n) => n.id === id);
      if (entry) {
        entry.status = "resolved";
        entry.resolvedAt = new Date().toISOString();
      }
    });
  }

  async recordTutorSession(input: TutorSessionInput): Promise<void> {
    await this.mutate((d) => {
      d.tutorSessions.push({
        lessonCode: input.lessonCode ?? null,
        exerciseId: input.exerciseId ?? null,
        mode: input.mode,
        rung: input.rung ?? null,
        summary: input.summary ?? null,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        cacheReadTokens: input.cacheReadTokens,
        cacheWriteTokens: input.cacheWriteTokens,
        costUsd: input.costUsd,
        guardBlocked: input.guardBlocked,
        id: d.nextId++,
        createdAt: new Date().toISOString(),
      });
    });
  }

  async tutorSessions(query: { since?: string } = {}): Promise<TutorSession[]> {
    return this.view((d) =>
      d.tutorSessions
        .filter((t) => !query.since || t.createdAt >= query.since)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id),
    );
  }
}
