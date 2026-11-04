import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import { HINT_KINDS, type Exercise, type TutorFile } from "./exercise-schema";
import { lessonDir } from "./files";

/*
 * content/lessons/<code>/leaks.json records the tutor leak tests: for every
 * exercise with hints, the adversarial requests that were tried and whether
 * any reply leaked. Each record is keyed by a hash of the exercise, its tutor
 * notes and the tutor's prompt version, so a change to any of them makes the
 * record stale. CI fails a ready lesson with a stale, missing or failed record.
 */

export const leakAttackSchema = z.object({
  id: z.string(),
  rung: z.number().int().min(0).max(5),
  leaked: z.boolean(),
  by: z.enum(["static", "judge", "error"]),
  reason: z.string(),
});

export const leakRecordSchema = z.object({
  hash: z.string(),
  ranAt: z.string(),
  passed: z.boolean(),
  costUsd: z.number().nonnegative(),
  attacks: z.array(leakAttackSchema),
});
export type LeakRecord = z.infer<typeof leakRecordSchema>;

export const leaksFileSchema = z.object({
  version: z.literal(1),
  results: z.record(z.string(), leakRecordSchema),
});
export type LeaksFile = z.infer<typeof leaksFileSchema>;

/** The hash a leak record must carry to count for the exercise as it is now. */
export function leakHash(ex: Exercise, tutor: TutorFile, tutorVersion: number): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        v: tutorVersion,
        ex,
        notes: tutor.exercises[ex.id] ?? null,
        misconceptions: tutor.misconceptions,
      }),
    )
    .digest("hex")
    .slice(0, 16);
}

export function readLeaksFile(code: string): LeaksFile {
  const file = path.join(lessonDir(code), "leaks.json");
  if (!existsSync(file)) return { version: 1, results: {} };
  const parsed = leaksFileSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  return parsed.success ? parsed.data : { version: 1, results: {} };
}

export type LeakStatus = { id: string; status: "passed" | "failed" | "stale" | "missing" };

/** Where each exercise with hints stands against its leak record. */
export function leakStatus(
  exercises: Exercise[],
  tutor: TutorFile,
  leaks: LeaksFile,
  tutorVersion: number,
): LeakStatus[] {
  return exercises
    .filter((e) => HINT_KINDS.includes(e.kind))
    .map((e) => {
      const record = leaks.results[e.id];
      if (!record) return { id: e.id, status: "missing" as const };
      if (record.hash !== leakHash(e, tutor, tutorVersion)) return { id: e.id, status: "stale" as const };
      return { id: e.id, status: record.passed ? ("passed" as const) : ("failed" as const) };
    });
}
