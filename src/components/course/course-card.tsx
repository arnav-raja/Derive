import { clsx } from "clsx";
import Link from "next/link";

import { ArrowRightIcon, BookIcon, ClockIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/progress";
import { SUBJECT_STYLE } from "@/lib/design/subject";
import type { CourseSummary } from "@/lib/learning/catalogue";

import { CourseArt } from "./course-art";
import { CourseStateBadge } from "./status";

/** A course in the catalogue: its drawing, its title, how far you are, and what comes next. */
export function CourseCard({ course }: { course: CourseSummary }) {
  const style = SUBJECT_STYLE[course.curriculum];
  const share = course.counts.total ? Math.round((100 * course.counts.done) / course.counts.total) : 0;
  const nextWord =
    course.state === "in-progress" && course.next?.status === "in-progress"
      ? "Continue"
      : course.state === "completed"
        ? "Revisit"
        : course.next && (course.next.status === "available" || course.next.status === "skipped")
          ? "Start"
          : null;
  return (
    <Link
      href={`/courses/${course.code}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-surface shadow-xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-rule-strong hover:shadow-md"
    >
      <div className="relative h-28 overflow-hidden border-b border-rule">
        <CourseArt code={course.code} className="transition-transform duration-300 group-hover:scale-103" />
        <CourseStateBadge state={course.state} className="absolute top-3 left-3 bg-surface/90 shadow-xs backdrop-blur" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <span className={clsx("tabular", style.text)}>{course.code}</span>
            <span className="text-ink-faint" aria-hidden="true">
              ·
            </span>
            <span className="text-ink-muted">{course.stage ? `Stage ${course.stage}` : course.curriculumName}</span>
          </p>
          <h3 className="text-base leading-snug font-semibold text-ink group-hover:text-accent">{course.title}</h3>
        </div>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <BookIcon className="size-3.5" />
            <span>
              <span className="tabular">{course.counts.total}</span> lessons
            </span>
          </span>
          {course.hours ? (
            <span className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-3.5" />
              <span>
                about <span className="tabular">{course.hours}</span> hours
              </span>
            </span>
          ) : null}
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-ink-muted">
              <span className="tabular">{course.counts.done}</span> of <span className="tabular">{course.counts.total}</span> done
            </span>
            <span className="tabular font-semibold text-ink">{share}%</span>
          </div>
          <ProgressBar
            value={course.counts.done}
            secondary={course.counts.inProgress}
            max={course.counts.total}
            tone={style.tone}
            size="sm"
            label={`${course.code}: ${course.counts.done} of ${course.counts.total} lessons done`}
          />
          {nextWord && course.next ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-accent">
              {nextWord} {course.state === "completed" ? "the course" : course.next.code}
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              {course.state === "coming-soon" ? "Its lessons are being written." : "Opens once what it builds on is mastered."}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
