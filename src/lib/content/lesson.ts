import "server-only";

import { statSync } from "node:fs";
import path from "node:path";

import { lesson as lessonMeta, type LessonMeta } from "@/lib/curriculum/data";
import type { PhaseId } from "@/lib/store/types";

import type { ChecksFile, Exercise, TutorFile } from "./exercise-schema";
import {
  PHASE_FILES,
  lessonDir,
  readChecksFile,
  readExercisesFile,
  readLessonFile,
  readPhaseSource,
  readTutorFile,
  writtenLessonCodes,
} from "./files";
import type { LessonFile } from "./lesson-schema";

/*
 * The written lessons, loaded from content/lessons on the server. Everything
 * here, including answers and tutor notes, stays on the server; what the
 * browser may see is drawn out by src/lib/content/public.ts.
 */

export type LoadedLesson = {
  code: string;
  meta: LessonMeta;
  file: LessonFile;
  exercises: Exercise[];
  byId: Map<string, Exercise>;
  tutor: TutorFile;
  checks: ChecksFile;
  sources: Record<PhaseId, string>;
};

type CacheEntry = { stamp: string; lesson: LoadedLesson | null };
const cache = new Map<string, CacheEntry>();

/** Changes when any file in the lesson folder changes, so edits show up in development. */
function stamp(code: string): string {
  const dir = lessonDir(code);
  const files = ["lesson.yaml", "exercises.yaml", "tutor.yaml", "checks.json", ...Object.values(PHASE_FILES)];
  return files
    .map((f) => {
      try {
        return String(statSync(path.join(dir, f)).mtimeMs);
      } catch {
        return "-";
      }
    })
    .join(":");
}

function read(code: string): LoadedLesson | null {
  const meta = lessonMeta(code);
  const file = readLessonFile(code);
  const exercises = readExercisesFile(code);
  const tutor = readTutorFile(code);
  const checks = readChecksFile(code);
  if (!meta || !file.ok || !exercises.ok || !tutor.ok || !checks.ok) return null;
  const sources = {} as Record<PhaseId, string>;
  for (const phase of Object.keys(PHASE_FILES) as PhaseId[]) {
    const source = readPhaseSource(code, phase);
    if (source === null) return null;
    sources[phase] = source;
  }
  return {
    code,
    meta,
    file: file.file,
    exercises: exercises.value.exercises,
    byId: new Map(exercises.value.exercises.map((e) => [e.id, e])),
    tutor: tutor.value,
    checks: checks.value,
    sources,
  };
}

/** A written lesson, or null when it is not written (or does not load). */
export function loadLesson(code: string): LoadedLesson | null {
  if (!/^[MLE]\d{1,2}\.\d{1,2}$/.test(code)) return null;
  const current = stamp(code);
  const hit = cache.get(code);
  if (hit && hit.stamp === current) return hit.lesson;
  const lesson = current.split(":").every((s) => s === "-") ? null : read(code);
  cache.set(code, { stamp: current, lesson });
  return lesson;
}

let writtenCache: { at: number; codes: string[] } | null = null;

/** Codes of every lesson that is written and loads cleanly. */
export function writtenLessons(): string[] {
  if (writtenCache && Date.now() - writtenCache.at < 5000) return writtenCache.codes;
  const codes = writtenLessonCodes().filter((c) => loadLesson(c) !== null);
  writtenCache = { at: Date.now(), codes };
  return codes;
}

/** A lesson is offered to the learner only once it has passed the quality gate. */
export function isReady(lesson: LoadedLesson): boolean {
  return lesson.file.status === "ready" || process.env.DERIVE_SHOW_DRAFTS === "1";
}

/** A lesson the learner may open: written, loading cleanly and ready. */
export function readyLesson(code: string): LoadedLesson | null {
  const lesson = loadLesson(code);
  return lesson && isReady(lesson) ? lesson : null;
}

export function exercisesInPhase(lesson: LoadedLesson, phase: PhaseId): Exercise[] {
  return lesson.exercises.filter((e) => e.phase === phase);
}
