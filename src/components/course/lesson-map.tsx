import { clsx } from "clsx";
import Link from "next/link";

import { STATUS_WORDS, type CourseSummary, type DisplayStatus } from "@/lib/learning/catalogue";
import { SUBJECT_STYLE } from "@/lib/design/subject";

/*
 * The whole graph at a glance: every lesson as one square, a row per course,
 * coloured by what you have shown. A living map of what you know.
 */

const SQUARE: Record<DisplayStatus, string> = {
  mastered: "bg-correct",
  completed: "bg-correct/45",
  "in-progress": "bg-accent",
  available: "border-2 border-accent bg-accent-soft",
  skipped: "border-2 border-hint bg-hint-soft",
  locked: "border border-rule-strong bg-inset",
  unwritten: "border border-dashed border-rule-strong",
};

export const MAP_KEY: DisplayStatus[] = ["mastered", "completed", "in-progress", "available", "locked", "unwritten"];

export function MapSquare({ status, className }: { status: DisplayStatus; className?: string }) {
  return <span aria-hidden="true" className={clsx("block size-4 shrink-0 rounded-xs", SQUARE[status], className)} />;
}

export function MapKey() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-muted" aria-label="Key">
      {MAP_KEY.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <MapSquare status={s} className="size-3" />
          {STATUS_WORDS[s]}
        </li>
      ))}
    </ul>
  );
}

export function LessonMap({ courses }: { courses: CourseSummary[] }) {
  return (
    <div className="flex flex-col gap-1">
      {courses.map((c) => {
        const style = SUBJECT_STYLE[c.curriculum];
        return (
          <div key={c.code} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-3 rounded-md py-1.5 sm:grid-cols-[16rem_minmax(0,1fr)]">
            <Link href={`/courses/${c.code}`} className="group flex min-w-0 items-center gap-2 text-sm">
              <span className={clsx("tabular w-8 shrink-0 font-semibold", style.text)}>{c.code}</span>
              <span className="hidden truncate text-ink-muted group-hover:text-ink sm:inline">{c.title}</span>
              <span className="sr-only">
                : {c.counts.done} of {c.counts.total} lessons done
              </span>
            </Link>
            <ol className="flex flex-wrap gap-1" aria-hidden="true">
              {c.lessons.map((l) => (
                <li key={l.code}>
                  <Link href={`/lessons/${l.code}`} tabIndex={-1} title={`${l.code} ${l.title}: ${STATUS_WORDS[l.status]}`} className="block rounded-xs transition-transform hover:scale-125">
                    <MapSquare status={l.status} />
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}
