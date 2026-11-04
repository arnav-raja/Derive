import { z } from "zod";

import raw from "@content/curriculum/curriculum.json";

export const LESSON_CODE = /^[MLE]\d{1,2}\.\d{1,2}$/;
export const CAPSTONE_CODE = /^X\d$/;

const lessonCode = z.string().regex(LESSON_CODE);
const nodeCode = z.string().regex(/^(?:[MLE]\d{1,2}\.\d{1,2}|X\d)$/);

export const curriculumSchema = z.object({
  version: z.literal(1),
  note: z.string(),
  curricula: z.array(
    z.object({
      code: z.enum(["M", "L", "E"]),
      title: z.string(),
      courses: z.array(
        z.object({
          code: z.string().regex(/^[MLE]\d{1,2}$/),
          title: z.string(),
          lessons: z.array(lessonCode).min(1),
        }),
      ),
    }),
  ),
  lessons: z.record(
    lessonCode,
    z.object({
      title: z.string(),
      course: z.string(),
      requires: z.array(nodeCode),
      buildsOn: z.array(nodeCode),
      leadsTo: z.array(nodeCode),
    }),
  ),
  capstones: z.array(
    z.object({
      code: z.string().regex(CAPSTONE_CODE),
      title: z.string(),
      after: z.string(),
      description: z.string(),
      gpuBudget: z.string(),
      requires: z.array(nodeCode),
      skills: z.array(z.number().int().min(1).max(10)),
    }),
  ),
  skills: z.array(z.string()).length(10),
  stages: z.array(
    z.object({
      stage: z.number().int(),
      title: z.string(),
      courses: z.array(z.string()),
      hours: z.number(),
    }),
  ),
});

export type CurriculumData = z.infer<typeof curriculumSchema>;
export type LessonMeta = CurriculumData["lessons"][string] & { code: string };
export type Course = CurriculumData["curricula"][number]["courses"][number];
export type CurriculumCode = CurriculumData["curricula"][number]["code"];
export type Capstone = CurriculumData["capstones"][number];

export const CURRICULUM_NAMES: Record<CurriculumCode, string> = {
  M: "Mathematics",
  L: "Machine learning",
  E: "ML engineering",
};

let cached: CurriculumData | null = null;

/** The curriculum graph compiled into the app from content/curriculum. */
export function curriculum(): CurriculumData {
  cached ??= curriculumSchema.parse(raw);
  return cached;
}

export function lesson(code: string): LessonMeta | null {
  const meta = curriculum().lessons[code];
  return meta ? { ...meta, code } : null;
}

export function course(code: string): Course | null {
  for (const c of curriculum().curricula) {
    const found = c.courses.find((x) => x.code === code);
    if (found) return found;
  }
  return null;
}

/** Lessons in the order the plan lists them, curriculum by curriculum. */
export function allLessons(): LessonMeta[] {
  const data = curriculum();
  return data.curricula.flatMap((c) =>
    c.courses.flatMap((k) => k.lessons.map((code) => ({ ...data.lessons[code]!, code }))),
  );
}

export function stageOfCourse(courseCode: string): number | null {
  return curriculum().stages.find((s) => s.courses.includes(courseCode))?.stage ?? null;
}
