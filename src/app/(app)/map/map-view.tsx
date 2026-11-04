"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { Tabs } from "radix-ui";

import {
  CheckIcon,
  CircleIcon,
  FilledCircleIcon,
  HalfCircleIcon,
  LockIcon,
} from "@/components/ui/icons";

export type LessonState =
  | "unwritten"
  | "locked"
  | "available"
  | "in-progress"
  | "completed"
  | "mastered";

export type MapCourse = {
  code: string;
  title: string;
  stage: number | null;
  lessons: { code: string; title: string; state: LessonState }[];
};

type Band = { code: string; title: string; courses: MapCourse[] };

const STATE_LABEL: Record<LessonState, string> = {
  unwritten: "Not written yet",
  locked: "Locked",
  available: "Ready to start",
  "in-progress": "In progress",
  completed: "Completed",
  mastered: "Mastered",
};

function StateMark({ state }: { state: LessonState }) {
  const cls = "size-3.5 shrink-0";
  switch (state) {
    case "mastered":
      return <CheckIcon className={clsx(cls, "text-correct")} />;
    case "completed":
      return <FilledCircleIcon className={clsx(cls, "text-accent")} />;
    case "in-progress":
      return <HalfCircleIcon className={clsx(cls, "text-accent")} />;
    case "available":
      return <CircleIcon className={clsx(cls, "text-accent")} />;
    case "locked":
      return <LockIcon className={clsx(cls, "text-ink-faint")} />;
    default:
      return <CircleIcon className={clsx(cls, "text-rule-strong")} />;
  }
}

function LessonRow({ lesson }: { lesson: MapCourse["lessons"][number] }) {
  const openable = lesson.state !== "unwritten" && lesson.state !== "locked";
  const body = (
    <>
      <StateMark state={lesson.state} />
      <span className="tabular w-12 shrink-0 text-xs font-medium text-ink-muted">{lesson.code}</span>
      <span
        className={clsx(
          "min-w-0 flex-1 text-sm",
          openable ? "text-ink" : "text-ink-muted",
        )}
      >
        {lesson.title}
      </span>
      <span className="sr-only">, {STATE_LABEL[lesson.state]}</span>
    </>
  );
  return (
    <li>
      {openable ? (
        <Link
          href={`/lessons/${lesson.code}`}
          className="flex items-start gap-3 rounded-sm px-2 py-1.5 hover:bg-inset [&>svg]:mt-0.5"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-3 px-2 py-1.5 [&>svg]:mt-0.5">{body}</div>
      )}
    </li>
  );
}

export function MapView({ bands }: { bands: Band[] }) {
  return (
    <Tabs.Root defaultValue={bands[0]?.code} className="flex flex-col gap-6">
      <Tabs.List
        aria-label="Curriculums"
        className="flex gap-1 overflow-x-auto border-b border-rule"
      >
        {bands.map((band) => (
          <Tabs.Trigger
            key={band.code}
            value={band.code}
            className={clsx(
              "-mb-px h-10 shrink-0 border-b-2 border-transparent px-3 text-sm font-medium text-ink-muted",
              "hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink",
            )}
          >
            {band.title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-muted" aria-label="Key">
        {(["available", "in-progress", "completed", "mastered", "locked", "unwritten"] as const).map(
          (s) => (
            <li key={s} className="flex items-center gap-1.5">
              <StateMark state={s} />
              {STATE_LABEL[s]}
            </li>
          ),
        )}
      </ul>

      {bands.map((band) => (
        <Tabs.Content key={band.code} value={band.code} className="grid gap-4 md:grid-cols-2">
          {band.courses.map((course) => (
            <section
              key={course.code}
              aria-labelledby={`course-${course.code}`}
              className="rounded-lg border border-rule bg-surface p-4 sm:p-5"
            >
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 id={`course-${course.code}`} className="text-base font-semibold text-ink">
                  <span className="tabular mr-2 text-ink-muted">{course.code}</span>
                  {course.title}
                </h2>
                {course.stage ? (
                  <span className="shrink-0 text-xs text-ink-muted">Stage {course.stage}</span>
                ) : null}
              </div>
              <ol className="flex flex-col">
                {course.lessons.map((lesson) => (
                  <LessonRow key={lesson.code} lesson={lesson} />
                ))}
              </ol>
            </section>
          ))}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
