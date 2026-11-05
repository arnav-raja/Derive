import { clsx } from "clsx";
import Link from "next/link";

import { CheckIcon } from "@/components/ui/icons";
import { ProgressBar } from "@/components/ui/progress";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
import type { CourseSummary } from "@/lib/learning/catalogue";

/*
 * The five stages of study in order, from Foundations to Frontier, with the
 * courses each holds and how much of it is done. The current stage is the
 * first with lessons left to do.
 */

export type StageSummary = {
  stage: number;
  title: string;
  hours: number;
  courses: CourseSummary[];
  done: number;
  total: number;
};

export function stageSummaries(stages: { stage: number; title: string; hours: number; courses: string[] }[], courses: CourseSummary[]): StageSummary[] {
  return stages.map((s) => {
    const list = s.courses.map((code) => courses.find((c) => c.code === code)).filter((c): c is CourseSummary => Boolean(c));
    return {
      stage: s.stage,
      title: s.title,
      hours: s.hours,
      courses: list,
      done: list.reduce((n, c) => n + c.counts.done, 0),
      total: list.reduce((n, c) => n + c.counts.total, 0),
    };
  });
}

export function StagePath({ stages }: { stages: StageSummary[] }) {
  const current = stages.find((s) => s.done < s.total)?.stage ?? null;
  return (
    <ol className="-mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:-mx-8 sm:scroll-px-8 sm:px-8 xl:mx-0 xl:grid xl:grid-cols-5 xl:overflow-visible xl:px-0 xl:pb-0">
      {stages.map((s) => {
        const here = s.stage === current;
        const finished = s.total > 0 && s.done === s.total;
        return (
          <li
            key={s.stage}
            className={clsx(
              "relative flex w-60 shrink-0 snap-start flex-col gap-3 rounded-lg border bg-surface p-4 shadow-xs xl:w-auto",
              here ? "border-accent ring-1 ring-accent" : "border-rule",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={clsx(
                  "tabular flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                  finished ? "bg-correct text-surface" : here ? "bg-accent text-on-accent" : "bg-inset text-ink-muted",
                )}
              >
                {finished ? <CheckIcon className="size-4" strokeWidth={2.25} title="Stage complete" /> : s.stage}
              </span>
              {here ? <span className="text-xs font-semibold text-accent">You are here</span> : null}
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-medium text-ink-muted">Stage {s.stage}</p>
              <p className="text-base font-semibold text-ink">{s.title}</p>
              <p className="tabular text-xs text-ink-muted">About {s.hours.toLocaleString("en-GB")} hours</p>
            </div>
            <ul className="flex flex-wrap gap-1" aria-label={`Courses in stage ${s.stage}`}>
              {s.courses.map((c) => {
                const style = SUBJECT_STYLE[subjectOf(c.code)];
                return (
                  <li key={c.code}>
                    <Link
                      href={`/courses/${c.code}`}
                      title={c.title}
                      className={clsx("tabular inline-flex h-6 items-center rounded-sm px-1.5 text-xs font-semibold transition-opacity hover:opacity-80", style.soft, style.text)}
                    >
                      {c.code}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex flex-col gap-1.5">
              <ProgressBar value={s.done} max={s.total} size="sm" tone={finished ? "correct" : "accent"} label={`Stage ${s.stage}: ${s.done} of ${s.total} lessons done`} />
              <p className="tabular text-xs text-ink-muted">
                {s.done} of {s.total} lessons
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
