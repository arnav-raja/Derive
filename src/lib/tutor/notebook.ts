import "server-only";

import { z } from "zod";

import type { LoadedLesson } from "@/lib/content/lesson";
import { asAnswerPayload } from "@/lib/learning/payloads";
import { isHintAttempt } from "@/lib/learning/state";
import { addDays, localDate } from "@/lib/learning/time";
import type { Attempt, PhaseId, Store } from "@/lib/store/types";

import { modelClient, type ModelClient } from "./anthropic";
import { tutorBudget } from "./budget";
import { GUARD_MODEL, costUsd } from "./config";
import { PHASE_NAMES } from "./context";
import { NOTEBOOK_SYSTEM } from "./prompts";

/*
 * After each phase, Claude Haiku reads what happened (misses, hints, items
 * moved on from) and writes up to three notebook entries to revisit. A phase
 * with no misses and no hints is not sent at all.
 */

const entriesSchema = z.object({
  entries: z
    .array(z.object({ kind: z.enum(["gap", "misconception"]), body: z.string().min(1).max(400) }))
    .max(3),
});

const ENTRIES_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      entries: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["gap", "misconception"] },
            body: { type: "string" },
          },
          required: ["kind", "body"],
          additionalProperties: false,
        },
      },
    },
    required: ["entries"],
    additionalProperties: false,
  },
};

function describe(lesson: LoadedLesson, attempts: Attempt[]): string[] {
  const lines: string[] = [];
  for (const ex of lesson.exercises) {
    const own = attempts.filter((a) => a.exerciseId === ex.id && a.cardId === null);
    if (own.length === 0) continue;
    const hints = own.filter(isHintAttempt).length;
    const answers = own.filter((a) => !isHintAttempt(a));
    const wrong = answers.filter((a) => a.correct === false);
    if (hints === 0 && wrong.length === 0) continue;
    lines.push(`Exercise "${ex.title ?? ex.id}" (${ex.kind}): ${ex.prompt.slice(0, 300)}`);
    lines.push(`  ${answers.length} answers, ${wrong.length} wrong, ${hints} hints.`);
    for (const a of wrong.slice(0, 3)) {
      const p = asAnswerPayload(a.payload);
      if (p?.type === "expression" || p?.type === "number") lines.push(`  Wrong answer: ${p.input}`);
      if (p?.type === "code") {
        const failed = p.tests.filter((t) => !t.passed).map((t) => t.description);
        if (failed.length) lines.push(`  Failing tests: ${failed.slice(0, 3).join("; ")}`);
      }
    }
  }
  return lines;
}

export async function writeNotebook(
  store: Store,
  lesson: LoadedLesson,
  phase: PhaseId,
  client: ModelClient | null = modelClient(),
  now = new Date(),
): Promise<number> {
  if (!client) return 0;
  const budget = await tutorBudget(store, now);
  if (budget.exhausted) return 0;
  const attempts = await store.attempts({ lessonCode: lesson.code, limit: 1000 });
  const inPhase = new Set(lesson.exercises.filter((e) => e.phase === phase).map((e) => e.id));
  const lines = describe(
    lesson,
    attempts.filter((a) => a.exerciseId && inPhase.has(a.exerciseId)),
  );
  if (lines.length === 0) return 0;

  try {
    const reply = await client.create({
      model: GUARD_MODEL,
      max_tokens: 2000,
      system: NOTEBOOK_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Lesson ${lesson.code} ${lesson.file.title}, phase ${PHASE_NAMES[phase]}.\n\n${lines.join("\n")}`,
        },
      ],
      output_config: { effort: "low", format: ENTRIES_FORMAT },
    });
    await store.recordTutorSession({
      lessonCode: lesson.code,
      exerciseId: null,
      mode: "notebook",
      rung: null,
      summary: null,
      ...reply.usage,
      costUsd: costUsd(GUARD_MODEL, reply.usage),
      guardBlocked: 0,
    });
    const parsed = entriesSchema.safeParse(JSON.parse(reply.text));
    if (!parsed.success) return 0;
    const revisitAt = `${addDays(localDate(now), 3)}T00:00:00.000Z`;
    for (const e of parsed.data.entries) {
      await store.addNotebookEntry({
        kind: e.kind,
        source: "tutor",
        lessonCode: lesson.code,
        location: phase,
        body: e.body,
        revisitAt,
      });
    }
    return parsed.data.entries.length;
  } catch {
    return 0;
  }
}
