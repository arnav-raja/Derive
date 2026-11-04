import { z } from "zod";

import { isReady, loadLesson } from "@/lib/content/lesson";
import { renderMarkdownHtml } from "@/lib/content/markdown";
import type { TextPayload } from "@/lib/learning/payloads";
import { recordExplanationEvidence, recordLessonAnswer } from "@/lib/learning/service";
import { modelClient } from "@/lib/tutor/anthropic";
import { tutorBudget } from "@/lib/tutor/budget";
import { addUsage } from "@/lib/tutor/config";
import { gradeText } from "@/lib/tutor/grade";
import { wordCount } from "@/lib/tutor/guard";
import { json, prepare } from "@/lib/tutor/http";

export const dynamic = "force-dynamic";
// Grading runs at high effort and can take a while.
export const maxDuration = 180;

const bodySchema = z.object({
  lesson: z.string().regex(/^[MLE]\d{1,2}\.\d{1,2}$/),
  exercise: z.string().regex(/^[a-z0-9-]+$/),
  body: z.string().min(1).max(12_000),
  durationMs: z.number().int().nonnegative().max(86_400_000).nullable().default(null),
});

/** Grades a written explanation or proof against its rubric. */
export async function POST(request: Request) {
  const ready = await prepare(request, bodySchema);
  if (!ready.ok) return ready.response;
  const { store, body } = ready;
  const lesson = loadLesson(body.lesson);
  if (!lesson || !isReady(lesson)) return json({ ok: false, error: "That lesson is not available." }, 404);
  const ex = lesson.byId.get(body.exercise);
  if (!ex || ex.answer.type !== "text") return json({ ok: false, error: "That exercise is not a written answer." }, 404);

  const words = wordCount(body.body);
  if (words < ex.answer.minWords) {
    return json({ ok: false, error: `Write at least ${ex.answer.minWords} words; you have ${words}.` }, 422);
  }
  if (words > ex.answer.maxWords) {
    return json({ ok: false, error: `Keep it to ${ex.answer.maxWords} words; you have ${words}.` }, 422);
  }

  const client = modelClient();
  if (!client) return json({ ok: false, error: "The grader is not connected yet. Your text is kept here, so you can move on now and submit it later." }, 503);
  const budget = await tutorBudget(store);
  if (budget.exhausted) {
    return json({ ok: false, error: "Today's tutor budget is spent, so grading waits until midnight. Your text is kept here, so you can move on now and submit it later." }, 409);
  }

  const grading = await gradeText(client, lesson, ex, body.body);
  if (!grading) {
    return json({ ok: false, error: "The grader could not finish. Your text is kept here; try again in a minute." }, 502);
  }

  const usage = addUsage(grading.graderUsage, grading.guardUsage);
  await store.recordTutorSession({
    lessonCode: lesson.code,
    exerciseId: ex.id,
    mode: ex.kind === "explain" ? "novice" : "grade",
    rung: null,
    summary: null,
    ...usage,
    costUsd: grading.costUsd,
    guardBlocked: grading.blocked,
  });
  await store.saveExplanation({
    lessonCode: lesson.code,
    itemId: ex.id,
    body: body.body,
    rubric: grading.criteria,
    passed: grading.passed,
    feedback: grading.feedback,
  });
  const payload: TextPayload = {
    type: "text",
    body: body.body,
    criteria: grading.criteria.map((c) => ({ id: c.id, met: c.met })),
    feedback: grading.feedback,
  };
  await recordLessonAnswer(store, lesson, ex, {
    correct: grading.passed,
    payload,
    durationMs: body.durationMs,
  });
  if (ex.kind === "explain") await recordExplanationEvidence(store, lesson, ex, grading.passed);

  return json({
    ok: true,
    passed: grading.passed,
    // Evidence is the learner's own words; for an unmet criterion it could carry the grader's view of the gap.
    criteria: grading.criteria.map((c) => ({ id: c.id, met: c.met, evidence: c.met ? c.evidence : "" })),
    feedback: grading.feedback,
    feedbackHtml: renderMarkdownHtml(grading.feedback),
    question: grading.question,
    questionHtml: renderMarkdownHtml(grading.question),
    source: grading.source,
    budget: { spentUsd: budget.spentUsd + grading.costUsd, limitUsd: budget.limitUsd },
  });
}
