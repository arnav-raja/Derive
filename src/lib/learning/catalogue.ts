import "server-only";

import { loadLesson } from "@/lib/content/lesson";
import { CURRICULUM_NAMES, curriculum, stageOfCourse, type CurriculumCode } from "@/lib/curriculum/data";

import { studyOrder, type LessonStatus, type Overview } from "./service";

/*
 * Courses as the learner sees them in the catalogue: each lesson's state,
 * how much is done, what to do next, and how the course sits in the graph.
 * Everything is worked out from the overview and the curriculum, so the
 * catalogue never disagrees with Today or the lesson pages.
 */

export type DisplayStatus = "mastered" | "completed" | "in-progress" | "available" | "skipped" | "locked" | "unwritten";

export const STATUS_WORDS: Record<DisplayStatus, string> = {
  mastered: "Mastered",
  completed: "Completed",
  "in-progress": "In progress",
  available: "Ready to start",
  skipped: "Skipped by placement",
  locked: "Locked",
  unwritten: "Being written",
};

export function displayStatus(s: LessonStatus | undefined): DisplayStatus {
  if (s === "drafting" || s === "unwritten" || s === undefined) return "unwritten";
  return s;
}

export type CatalogueLesson = {
  code: string;
  title: string;
  status: DisplayStatus;
  /** Planned minutes across the six phases, once the lesson is written. */
  minutes: number | null;
  requires: string[];
};

export type CourseState = "in-progress" | "completed" | "ready" | "locked" | "coming-soon";

export const COURSE_STATE_WORDS: Record<CourseState, string> = {
  "in-progress": "In progress",
  completed: "Completed",
  ready: "Ready to start",
  locked: "Locked",
  "coming-soon": "Being written",
};

export type CourseSummary = {
  code: string;
  title: string;
  curriculum: CurriculumCode;
  curriculumName: string;
  stage: number | null;
  stageTitle: string | null;
  lessons: CatalogueLesson[];
  counts: { total: number; done: number; mastered: number; inProgress: number; available: number; written: number };
  /** The plan's study time for the course, shared out from its stage's hours. */
  hours: number | null;
  state: CourseState;
  /** The lesson to open next: the one under way, else the first that is ready. */
  next: CatalogueLesson | null;
  /** Courses whose lessons this one requires, and courses that require it. */
  before: string[];
  after: string[];
};

function minutesOf(code: string): number | null {
  const l = loadLesson(code);
  return l ? Object.values(l.file.minutes).reduce((a, b) => a + b, 0) : null;
}

const courseOfLesson = (code: string) => code.split(".")[0]!;

export function courseSummaries(ov: Overview): CourseSummary[] {
  const data = curriculum();
  const stageLessonCount = new Map<number, number>();
  for (const s of data.stages) {
    const n = data.curricula.flatMap((c) => c.courses).filter((c) => s.courses.includes(c.code)).reduce((a, c) => a + c.lessons.length, 0);
    stageLessonCount.set(s.stage, n);
  }

  const before = new Map<string, Set<string>>();
  const after = new Map<string, Set<string>>();
  for (const [code, l] of Object.entries(data.lessons)) {
    const mine = courseOfLesson(code);
    for (const req of l.requires) {
      if (!/^[MLE]/.test(req)) continue;
      const theirs = courseOfLesson(req);
      if (theirs === mine) continue;
      (before.get(mine) ?? before.set(mine, new Set()).get(mine)!).add(theirs);
      (after.get(theirs) ?? after.set(theirs, new Set()).get(theirs)!).add(mine);
    }
  }

  return data.curricula.flatMap((cur) =>
    cur.courses.map((course): CourseSummary => {
      const stage = stageOfCourse(course.code);
      const stageMeta = data.stages.find((s) => s.stage === stage) ?? null;
      const lessons = course.lessons.map((code) => ({
        code,
        title: loadLesson(code)?.file.title ?? data.lessons[code]!.title,
        status: displayStatus(ov.status.get(code)),
        minutes: minutesOf(code),
        requires: data.lessons[code]!.requires,
      }));
      const count = (...s: DisplayStatus[]) => lessons.filter((l) => s.includes(l.status)).length;
      const counts = {
        total: lessons.length,
        done: count("completed", "mastered"),
        mastered: count("mastered"),
        inProgress: count("in-progress"),
        available: count("available", "skipped"),
        written: lessons.length - count("unwritten"),
      };
      const inProgress = studyOrder(lessons.filter((l) => l.status === "in-progress").map((l) => l.code)).sort((a, b) =>
        (ov.touched.get(b) ?? "").localeCompare(ov.touched.get(a) ?? ""),
      );
      const ready = lessons.filter((l) => l.status === "available" || l.status === "skipped");
      const next =
        lessons.find((l) => l.code === inProgress[0]) ?? ready[0] ?? lessons.find((l) => l.status !== "completed" && l.status !== "mastered") ?? null;
      let state: CourseState;
      if (counts.done === counts.total) state = "completed";
      else if (counts.inProgress > 0 || counts.done > 0) state = "in-progress";
      else if (counts.available > 0) state = "ready";
      else if (counts.written === 0) state = "coming-soon";
      else state = "locked";
      const total = stage ? stageLessonCount.get(stage) : undefined;
      return {
        code: course.code,
        title: course.title,
        curriculum: cur.code,
        curriculumName: CURRICULUM_NAMES[cur.code],
        stage,
        stageTitle: stageMeta?.title ?? null,
        lessons,
        counts,
        hours: stageMeta && total ? Math.round((stageMeta.hours * lessons.length) / total) : null,
        state,
        next,
        before: [...(before.get(course.code) ?? [])].sort(byCourseOrder),
        after: [...(after.get(course.code) ?? [])].sort(byCourseOrder),
      };
    }),
  );
}

const ORDER = new Map(
  curriculum()
    .curricula.flatMap((c) => c.courses)
    .map((c, i) => [c.code, i]),
);

function byCourseOrder(a: string, b: string) {
  return (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0);
}

/** Every capstone whose prerequisites reach into this course, directly or through other lessons. */
export function capstonesNeeding(courseCode: string) {
  const data = curriculum();
  const requiresOf = (code: string) => data.lessons[code]?.requires ?? data.capstones.find((c) => c.code === code)?.requires ?? [];
  return data.capstones.filter((cap) => {
    const seen = new Set<string>();
    const stack = [...cap.requires];
    while (stack.length) {
      const code = stack.pop()!;
      if (seen.has(code)) continue;
      seen.add(code);
      if (courseOfLesson(code) === courseCode) return true;
      stack.push(...requiresOf(code));
    }
    return false;
  });
}
