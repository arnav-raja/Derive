import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";
import type { z } from "zod";

import { PHASES, type PhaseId } from "@/lib/store/types";

import {
  checksFileSchema,
  exercisesFileSchema,
  tutorFileSchema,
  type ChecksFile,
  type ExercisesFile,
  type TutorFile,
} from "./exercise-schema";
import { lessonSchema, type LessonFile } from "./lesson-schema";

/*
 * Reads lesson content from content/lessons/<code>/ on disk. Used by the
 * build-time checks and by server code; never imported into the browser.
 */

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");

export const PHASE_FILES: Record<PhaseId, string> = {
  puzzle: "1-puzzle.mdx",
  recall: "2-recall.mdx",
  explore: "3-explore.mdx",
  derive: "4-derive.mdx",
  build: "5-build.mdx",
  explain: "6-explain.mdx",
};

export function lessonDir(code: string): string {
  return path.join(LESSONS_DIR, code);
}

export function writtenLessonCodes(): string[] {
  if (!existsSync(LESSONS_DIR)) return [];
  return readdirSync(LESSONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(path.join(LESSONS_DIR, d.name, "lesson.yaml")))
    .map((d) => d.name)
    .sort();
}

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

function readYaml<S extends z.ZodType>(code: string, file: string, schema: S): Result<z.infer<S>> {
  const full = path.join(lessonDir(code), file);
  if (!existsSync(full)) return { ok: false, errors: [`${code} is missing ${file}.`] };
  let raw: unknown;
  try {
    raw = file.endsWith(".json") ? JSON.parse(readFileSync(full, "utf8")) : parse(readFileSync(full, "utf8"));
  } catch (error) {
    return { ok: false, errors: [`${code}/${file} does not parse: ${String(error)}`] };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map(
        (i) => `${code}/${file} ${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    };
  }
  return { ok: true, value: parsed.data };
}

export type LessonFileResult =
  | { ok: true; code: string; file: LessonFile }
  | { ok: false; code: string; errors: string[] };

export function readLessonFile(code: string): LessonFileResult {
  const result = readYaml(code, "lesson.yaml", lessonSchema);
  if (!result.ok) return { ok: false, code, errors: result.errors };
  if (result.value.code !== code) {
    return { ok: false, code, errors: [`${code}/lesson.yaml says its code is ${result.value.code}.`] };
  }
  return { ok: true, code, file: result.value };
}

export function readAllLessonFiles(): { files: Map<string, LessonFile>; errors: string[] } {
  const files = new Map<string, LessonFile>();
  const errors: string[] = [];
  for (const code of writtenLessonCodes()) {
    const result = readLessonFile(code);
    if (result.ok) files.set(code, result.file);
    else errors.push(...result.errors);
  }
  return { files, errors };
}

export function readExercisesFile(code: string): Result<ExercisesFile> {
  return readYaml(code, "exercises.yaml", exercisesFileSchema);
}

export function readTutorFile(code: string): Result<TutorFile> {
  return readYaml(code, "tutor.yaml", tutorFileSchema);
}

/** checks.json is generated; a lesson without expression exercises may have none. */
export function readChecksFile(code: string): Result<ChecksFile> {
  if (!existsSync(path.join(lessonDir(code), "checks.json"))) {
    return { ok: true, value: { version: 1, expressions: {}, runs: {} } };
  }
  return readYaml(code, "checks.json", checksFileSchema);
}

export function readPhaseSource(code: string, phase: PhaseId): string | null {
  const full = path.join(lessonDir(code), PHASE_FILES[phase]);
  return existsSync(full) ? readFileSync(full, "utf8") : null;
}

/** Every <Exercise id="..." /> in a phase file, in order. */
export function exerciseIdsInSource(source: string): string[] {
  return [...source.matchAll(/<Exercise\s+id="([a-z0-9-]+)"/g)].map((m) => m[1]!);
}

export { PHASES };
