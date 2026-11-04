import { z } from "zod";

import { isReady, loadLesson } from "@/lib/content/lesson";
import { renderMarkdownHtml } from "@/lib/content/markdown";
import { json, prepare } from "@/lib/tutor/http";
import { giveHint } from "@/lib/tutor/service";

export const dynamic = "force-dynamic";
// A hint is a draft, a guard check and at most one rewrite.
export const maxDuration = 120;

const bodySchema = z.object({
  lesson: z.string().regex(/^[MLE]\d{1,2}\.\d{1,2}$/),
  exercise: z.string().regex(/^[a-z0-9-]+$/),
  message: z.string().max(3000).default(""),
  work: z.string().max(20_000).nullable().default(null),
});

/** The next rung of the hint ladder for one exercise. */
export async function POST(request: Request) {
  const ready = await prepare(request, bodySchema);
  if (!ready.ok) return ready.response;
  const { store, body } = ready;
  const lesson = loadLesson(body.lesson);
  if (!lesson || !isReady(lesson)) return json({ ok: false, error: "That lesson is not available." }, 404);
  const ex = lesson.byId.get(body.exercise);
  if (!ex) return json({ ok: false, error: "That exercise is not in the lesson." }, 404);
  const answer = await giveHint(store, lesson, ex, { message: body.message, work: body.work });
  return json(answer.ok ? { ...answer, html: renderMarkdownHtml(answer.text) } : answer, answer.ok ? 200 : 409);
}
