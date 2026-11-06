"use server";

import { after } from "next/server";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { getStore } from "@/lib/auth";
import { loadLesson, readyLesson as ready } from "@/lib/content/lesson";
import { answerInputSchema, checkInput, type AnswerInput } from "@/lib/learning/answer";
import { tooFast } from "@/lib/learning/governor";
import { hasMixedCheck, phaseStartState, storedCheck, unansweredCheck } from "@/lib/learning/mixed-check";
import { dueNow } from "@/lib/learning/reviews";
import { overview, recordLessonAnswer } from "@/lib/learning/service";
import { exerciseStates, lessonProgress, nextPhase, outstanding } from "@/lib/learning/state";
import { PHASES, type PhaseId } from "@/lib/store/types";
import { writeNotebook } from "@/lib/tutor/notebook";

/*
 * What the learner does inside a lesson. Every action re-checks the rules on
 * the server: the governor, the phase order and the exercise's own key.
 */

export type ActionResult = { ok: true; message?: string | null } | { ok: false; error: string };

export type AnswerOutcome =
  | { ok: true; correct: boolean; message: string | null; done: boolean; ratio: number | null }
  | { ok: false; error: string };

const CODE = /^[MLE]\d{1,2}\.\d{1,2}$/;

function readyLesson(code: string) {
  return CODE.test(code) ? ready(code) : null;
}

function isPhase(value: string): value is PhaseId {
  return (PHASES as readonly string[]).includes(value);
}

/** Begins a lesson: its Puzzle phase starts, if the governor allows a new lesson now. */
export async function beginLesson(code: string): Promise<ActionResult> {
  const store = await getStore();
  const lesson = readyLesson(code);
  if (!lesson) return { ok: false, error: "That lesson is not available." };
  const ov = await overview(store);
  const status = ov.status.get(code);
  if (status === "in-progress" || status === "completed" || status === "mastered") redirect(`/lessons/${code}/puzzle`);
  if (status !== "available" && status !== "skipped") {
    return { ok: false, error: "This lesson opens once the lessons it builds on are mastered." };
  }
  if (!ov.governor.canBeginLesson) {
    return { ok: false, error: ov.governor.reasons.map((r) => r.text).join(" ") };
  }
  await store.savePhase({ lessonCode: code, phase: "puzzle", status: "started", state: {} });
  redirect(`/lessons/${code}/puzzle`);
}

/** Starts a phase that is open but not started, once the day's reviews are done. */
export async function startPhase(code: string, phase: string): Promise<ActionResult> {
  const store = await getStore();
  const lesson = readyLesson(code);
  if (!lesson || !isPhase(phase)) return { ok: false, error: "That phase is not available." };
  const progress = lessonProgress(await store.progress(code));
  if (!progress.begun) return { ok: false, error: "Begin the lesson first." };
  if (progress.phases[phase] !== "available") {
    if (progress.phases[phase] === "locked") return { ok: false, error: "Finish the phase before this one first." };
    refresh();
    return { ok: true };
  }
  const ov = await overview(store);
  if (!ov.governor.canStartPhase) return { ok: false, error: ov.governor.reasons[0]?.text ?? "Reviews come first." };
  await store.savePhase({ lessonCode: code, phase, status: "started", state: await phaseStartState(store, lesson, phase) });
  refresh();
  return { ok: true };
}

async function phaseOpen(code: string, phase: PhaseId) {
  const store = await getStore();
  const progress = lessonProgress(await store.progress(code));
  const state = progress.phases[phase];
  return { store, open: state === "started" || state === "completed" };
}

/** Checks and records an answer to an exercise in a lesson. */
export async function answerExercise(
  code: string,
  exerciseId: string,
  raw: AnswerInput,
  confidence: number | null,
  durationMs: number | null,
): Promise<AnswerOutcome> {
  const lesson = readyLesson(code);
  const ex = lesson?.byId.get(exerciseId);
  if (!lesson || !ex) return { ok: false, error: "That exercise is not available." };
  const parsed = answerInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That answer could not be read." };
  const { store, open } = await phaseOpen(code, ex.phase);
  if (!open) return { ok: false, error: "Start this phase first." };

  const checked = checkInput(ex.answer, parsed.data);
  if ("error" in checked) return { ok: false, error: checked.error };
  const c = confidence === null ? null : Math.max(0, Math.min(100, Math.round(confidence)));
  const attempt = await recordLessonAnswer(store, lesson, ex, {
    correct: checked.correct,
    payload: checked.payload,
    confidence: c,
    durationMs: durationMs === null ? null : Math.max(0, Math.min(86_400_000, Math.round(durationMs))),
  });
  const all = await store.attempts({ lessonCode: code, exerciseId, limit: 200 });
  const state = exerciseStates([ex], [attempt, ...all.filter((a) => a.id !== attempt.id)]).get(ex.id);
  refresh();
  return {
    ok: true,
    correct: checked.correct,
    message: checked.message,
    done: state?.done ?? false,
    // How far off an estimate was is shown only once it is done, so it cannot be used to home in.
    ratio: state?.done && checked.ratio !== undefined ? checked.ratio : null,
  };
}

/** Moves on from an exercise without solving it. It stays unmastered and returns later. */
export async function moveOn(code: string, exerciseId: string): Promise<ActionResult> {
  const lesson = readyLesson(code);
  const ex = lesson?.byId.get(exerciseId);
  if (!lesson || !ex) return { ok: false, error: "That exercise is not available." };
  const { store, open } = await phaseOpen(code, ex.phase);
  if (!open) return { ok: false, error: "Start this phase first." };
  await recordLessonAnswer(store, lesson, ex, { correct: false, payload: {}, movedOn: true });
  refresh();
  return { ok: true };
}

/** Completes a phase once its required exercises are done, and opens the next. */
export async function completePhase(code: string, phase: string): Promise<ActionResult> {
  const store = await getStore();
  const lesson = readyLesson(code);
  if (!lesson || !isPhase(phase)) return { ok: false, error: "That phase is not available." };
  const rows = await store.progress(code);
  const row = rows.find((r) => r.phase === phase);
  if (!row) return { ok: false, error: "Start this phase first." };
  const attempts = await store.attempts({ lessonCode: code, limit: 2000 });
  const states = exerciseStates(lesson.exercises, attempts);
  const left = outstanding(lesson.exercises, phase, states);
  if (left.length > 0) {
    return { ok: false, error: `${left.length} exercise${left.length === 1 ? " is" : "s are"} still to do in this phase.` };
  }
  if (phase === "explain" && hasMixedCheck(lesson)) {
    const checks = attempts.filter((a) => a.kind === "check");
    const open = unansweredCheck(storedCheck(row.state) ?? [], checks);
    if (open.length > 0) {
      return { ok: false, error: `${open.length} question${open.length === 1 ? " is" : "s are"} still to do in the mixed check.` };
    }
  }

  let message: string | null = null;
  if (row.status !== "completed") {
    const now = new Date();
    // Rule 6: far faster than your norm while missing checks adds a recall round.
    const inPhase = lesson.exercises.filter((e) => e.phase === phase);
    const missed = inPhase.filter((e) => {
      const own = attempts.filter((a) => a.exerciseId === e.id && a.cardId === null && a.correct !== null);
      return own.some((a) => a.correct === false);
    }).length;
    const history = (await store.progress())
      .filter((r) => r.status === "completed" && r.completedAt)
      .map((r) => {
        const planned = loadLesson(r.lessonCode)?.file.minutes[r.phase] ?? 0;
        return { actualMinutes: (Date.parse(r.completedAt!) - Date.parse(r.startedAt)) / 60000, plannedMinutes: planned };
      });
    const actualMinutes = (now.getTime() - Date.parse(row.startedAt)) / 60000;
    if (tooFast({ actualMinutes, plannedMinutes: lesson.file.minutes[phase], missedChecks: missed, history })) {
      const cards = await store.cards({ lessonCode: code });
      const ids = new Set(inPhase.map((e) => `${code}/${e.id}`));
      const round = cards.filter((c) => ids.has(c.cardId)).map((c) => dueNow(c, now));
      if (round.length) await store.upsertCards(round);
      message =
        "You moved through this phase much faster than usual and missed some checks, so a short recall round is waiting in Review. It is worth slowing down where it felt shaky.";
    }
    await store.savePhase({ lessonCode: code, phase, status: "completed", state: row.state });

    const next = nextPhase(phase);
    if (next) {
      const ov = await overview(store);
      if (ov.governor.canStartPhase && !rows.some((r) => r.phase === next)) {
        await store.savePhase({ lessonCode: code, phase: next, status: "started", state: await phaseStartState(store, lesson, next) });
      }
    }
    after(async () => {
      try {
        await writeNotebook(store, lesson, phase);
      } catch {
        // The notebook is a convenience; a failure here must not affect the lesson.
      }
    });
  }

  const next = nextPhase(phase);
  const target = next ? `/lessons/${code}/${next}` : `/lessons/${code}?finished=1`;
  redirect(message ? `${target}${target.includes("?") ? "&" : "?"}recall=1` : target);
}
