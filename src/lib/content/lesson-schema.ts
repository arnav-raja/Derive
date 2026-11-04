import { z } from "zod";

/*
 * The schema of content/lessons/<code>/lesson.yaml: a lesson's metadata,
 * the concepts it teaches and uses, and its typed links with bridge sentences.
 */

export const CONCEPT_ID = /^[MLE]\d{1,2}\.\d{1,2}\/[a-z0-9]+(?:-[a-z0-9]+)*$/;

const lessonCode = z.string().regex(/^[MLE]\d{1,2}\.\d{1,2}$/);
const nodeCode = z.string().regex(/^(?:[MLE]\d{1,2}\.\d{1,2}|X\d)$/);
export const conceptId = z.string().regex(CONCEPT_ID, {
  message: "Concept ids look like M1.1/units-as-algebra",
});

/** One sentence that says how the two lessons relate. */
const bridge = z
  .string()
  .trim()
  .min(20, { message: "A bridge is a full sentence of at least 20 characters." })
  .max(400);

const link = z.object({
  lesson: nodeCode,
  bridge,
  concept: conceptId.optional(),
});

export type LessonLink = z.infer<typeof link>;

const minutes = z.number().int().min(5).max(90);

export const LINK_KINDS = [
  "requires",
  "buildsOn",
  "anotherViewOf",
  "contrastsWith",
  "applies",
  "revisits",
  "foreshadows",
] as const;
export type LinkKind = (typeof LINK_KINDS)[number];

export const HORIZONTAL_LINKS: LinkKind[] = ["anotherViewOf", "contrastsWith", "applies"];

export const lessonSchema = z.object({
  code: lessonCode,
  title: z.string().min(3),
  course: z.string().regex(/^[MLE]\d{1,2}$/),
  /** draft while being written; ready once it has passed the quality gate. */
  status: z.enum(["draft", "review", "ready"]),
  summary: z.string().min(40),
  sittings: z.number().int().min(1).max(3),
  minutes: z.object({
    puzzle: minutes,
    recall: minutes,
    explore: minutes,
    derive: minutes,
    build: minutes,
    explain: minutes,
  }),
  concepts: z.object({
    taught: z
      .array(
        z.object({
          id: conceptId,
          name: z.string().min(3),
          summary: z.string().min(20),
          /** Later lessons or capstones that use this concept. */
          usedBy: z.array(nodeCode).default([]),
          /** A frontier-lab skill (1 to 10) this concept is itself part of. */
          skill: z.number().int().min(1).max(10).optional(),
        }),
      )
      .min(1)
      .max(6),
    /** Concepts taught in earlier lessons that this lesson uses. */
    used: z.array(conceptId).default([]),
  }),
  links: z.object({
    requires: z.array(link).default([]),
    buildsOn: z.array(link).default([]),
    anotherViewOf: z.array(link).default([]),
    contrastsWith: z.array(link).default([]),
    applies: z.array(link).default([]),
    revisits: z.array(link).default([]),
    foreshadows: z.array(link).default([]),
  }),
  skills: z.array(z.number().int().min(1).max(10)).default([]),
});

export type LessonFile = z.infer<typeof lessonSchema>;
