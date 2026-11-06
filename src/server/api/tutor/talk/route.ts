import { z } from "zod";

import { isReady, loadLesson } from "@/lib/content/lesson";
import { parseCardId } from "@/lib/learning/service";
import { exerciseStates } from "@/lib/learning/state";
import { renderMarkdownHtml } from "@/lib/content/markdown";
import { json, prepare } from "@/lib/tutor/http";
import { reviewContext, talk, variantExercise } from "@/lib/tutor/service";

const turn = z.object({ role: z.enum(["learner", "tutor"]), text: z.string().max(4000) });

const bodySchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("discuss"),
    lesson: z.string().regex(/^[MLE]\d{1,2}\.\d{1,2}$/),
    exercise: z.string().regex(/^[a-z0-9-]+$/),
    message: z.string().min(1).max(3000),
    history: z.array(turn).max(30).default([]),
  }),
  z.object({
    mode: z.literal("ask"),
    lesson: z.string().regex(/^[MLE]\d{1,2}\.\d{1,2}$/),
    message: z.string().min(1).max(3000),
    history: z.array(turn).max(30).default([]),
  }),
  z.object({
    mode: z.literal("socratic"),
    cardId: z.string().max(80),
    message: z.string().max(3000).default(""),
    history: z.array(turn).max(30).default([]),
  }),
]);

/** A conversation with the tutor outside the hint ladder. */
export async function POST(request: Request) {
  const ready = await prepare(request, bodySchema);
  if (!ready.ok) return ready.response;
  const { store, body } = ready;

  if (body.mode === "socratic") {
    const ref = parseCardId(body.cardId);
    const lesson = ref ? loadLesson(ref.lessonCode) : null;
    const ex = ref ? lesson?.byId.get(ref.exerciseId) : undefined;
    const card = (await store.cards({ lessonCode: ref?.lessonCode })).find((c) => c.cardId === body.cardId);
    if (!lesson || !ex?.review || !card) return json({ ok: false, error: "That review card was not found." }, 404);
    const [latest] = await store.attempts({ kinds: ["review"], limit: 50 }).then((all) =>
      all.filter((a) => a.cardId === body.cardId),
    );
    if (!latest || latest.correct !== false) {
      return json({ ok: false, error: "The tutor talks a review through after a missed answer." }, 409);
    }
    const p = latest.payload as { variant?: number; answerText?: string; correctText?: string } | null;
    const variantIndex = typeof p?.variant === "number" ? p.variant : 0;
    const variant = ex.review.variants[variantIndex];
    if (!variant) return json({ ok: false, error: "That review card was not found." }, 404);
    const others = ex.review.variants
      .map((_, i) => i)
      .filter((i) => i !== variantIndex)
      .map((i) => variantExercise(ex, i))
      .filter((e) => e !== null);
    const answer = await talk(store, {
      mode: "socratic",
      lesson,
      exercise: null,
      message: body.message,
      history: body.history,
      extra: reviewContext(variant, p?.answerText ?? "(not recorded)", p?.correctText ?? "(see the explanation)"),
      protect: others,
    });
    return json(answer.ok ? { ...answer, html: renderMarkdownHtml(answer.text) } : answer, answer.ok ? 200 : 409);
  }

  const lesson = loadLesson(body.lesson);
  if (!lesson || !isReady(lesson)) return json({ ok: false, error: "That lesson is not available." }, 404);

  if (body.mode === "discuss") {
    const ex = lesson.byId.get(body.exercise);
    if (!ex) return json({ ok: false, error: "That exercise is not in the lesson." }, 404);
    const attempts = await store.attempts({ lessonCode: lesson.code, exerciseId: ex.id, limit: 200 });
    if (!exerciseStates([ex], attempts).get(ex.id)?.solved) {
      return json({ ok: false, error: "Solve it first; until then the tutor gives hints." }, 409);
    }
    const answer = await talk(store, { mode: "discuss", lesson, exercise: ex, message: body.message, history: body.history });
    return json(answer.ok ? { ...answer, html: renderMarkdownHtml(answer.text) } : answer, answer.ok ? 200 : 409);
  }

  const answer = await talk(store, { mode: "ask", lesson, exercise: null, message: body.message, history: body.history });
  return json(answer.ok ? { ...answer, html: renderMarkdownHtml(answer.text) } : answer, answer.ok ? 200 : 409);
}
