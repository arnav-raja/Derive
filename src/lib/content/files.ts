import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

import { lessonSchema, type LessonFile } from "./lesson-schema";

/*
 * Reads lesson content from content/lessons/<code>/ on disk. Used by the
 * build-time checks and by server code; never imported into the browser.
 */

export const CONTENT_DIR = path.join(process.cwd(), "content");
export const LESSONS_DIR = path.join(CONTENT_DIR, "lessons");

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

export type LessonFileResult =
  | { ok: true; code: string; file: LessonFile }
  | { ok: false; code: string; errors: string[] };

export function readLessonFile(code: string): LessonFileResult {
  const file = path.join(lessonDir(code), "lesson.yaml");
  let raw: unknown;
  try {
    raw = parse(readFileSync(file, "utf8"));
  } catch (error) {
    return { ok: false, code, errors: [`${code}/lesson.yaml is not valid YAML: ${String(error)}`] };
  }
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      code,
      errors: parsed.error.issues.map(
        (i) => `${code}/lesson.yaml ${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    };
  }
  if (parsed.data.code !== code) {
    return {
      ok: false,
      code,
      errors: [`${code}/lesson.yaml says its code is ${parsed.data.code}.`],
    };
  }
  return { ok: true, code, file: parsed.data };
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
