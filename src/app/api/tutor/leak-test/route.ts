import { HINT_KINDS } from "@/lib/content/exercise-schema";
import { loadLesson } from "@/lib/content/lesson";
import { leakHash, readLeaksFile } from "@/lib/content/leaks";
import { modelClient } from "@/lib/tutor/anthropic";
import { json } from "@/lib/tutor/http";
import { leakTestExercise } from "@/lib/tutor/leaks";
import { TUTOR_VERSION } from "@/lib/tutor/prompts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Runs the tutor leak suite for one lesson, with the API key that lives only
 * on Vercel. It answers only on the deployment's own generated address, which
 * Vercel's deployment protection keeps private, and never on the public
 * production address, so nobody else can spend the budget.
 *
 *   /api/tutor/leak-test?lesson=M1.1             exercises whose record is missing or stale
 *   /api/tutor/leak-test?lesson=M1.1&all=1       every exercise with hints
 *   /api/tutor/leak-test?lesson=M1.1&exercise=x  one exercise
 *
 * The response holds the new records for content/lessons/<code>/leaks.json.
 */
export async function GET(request: Request) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const own = process.env.VERCEL_URL;
  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!own || host !== own || host === production) {
    return json({ ok: false, error: "The leak tests run only on a protected deployment address." }, 403);
  }
  const client = modelClient();
  if (!client) return json({ ok: false, error: "No API key is configured." }, 503);

  const url = new URL(request.url);
  const lesson = loadLesson(url.searchParams.get("lesson") ?? "");
  if (!lesson) return json({ ok: false, error: "Name a written lesson with ?lesson=." }, 404);
  const only = url.searchParams.get("exercise");
  const all = url.searchParams.get("all") === "1";
  const existing = readLeaksFile(lesson.code);

  const targets = lesson.exercises.filter((e) => {
    if (!HINT_KINDS.includes(e.kind)) return false;
    if (only) return e.id === only;
    if (all) return true;
    const record = existing.results[e.id];
    return !record || record.hash !== leakHash(e, lesson.tutor, TUTOR_VERSION);
  });

  const started = Date.now();
  const runs = [];
  // Two exercises at a time keeps within the API's rate limits.
  for (let i = 0; i < targets.length; i += 2) {
    runs.push(...(await Promise.all(targets.slice(i, i + 2).map((e) => leakTestExercise(client, lesson, e)))));
  }
  const results = Object.fromEntries(
    runs.map((r) => [
      r.exerciseId,
      { hash: r.hash, ranAt: r.ranAt, passed: r.passed, costUsd: r.costUsd, attacks: r.attacks },
    ]),
  );
  return json({
    ok: true,
    lesson: lesson.code,
    tutorVersion: TUTOR_VERSION,
    passed: runs.every((r) => r.passed),
    tested: runs.length,
    costUsd: Math.round(runs.reduce((s, r) => s + r.costUsd, 0) * 10000) / 10000,
    seconds: Math.round((Date.now() - started) / 1000),
    results,
    leaks: runs.flatMap((r) =>
      r.attacks.filter((a) => a.leaked).map((a) => ({
        exercise: r.exerciseId,
        attack: a.id,
        rung: a.rung,
        reason: a.reason,
        reply: r.samples.find((s) => s.id === a.id)?.text ?? null,
      })),
    ),
  });
}
