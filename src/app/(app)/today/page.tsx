import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";

import { CourseArt, CourseMark } from "@/components/course/course-art";
import { PHASE_ICONS } from "@/components/lesson/phase-icons";
import { buttonClasses } from "@/components/ui/button";
import {
  ArrowRightIcon,
  BookIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  NotebookIcon,
  ReviewIcon,
  SparkIcon,
  TargetIcon,
} from "@/components/ui/icons";
import { EmptyState, Page, Panel } from "@/components/ui/page";
import { ProgressBar } from "@/components/ui/progress";
import { getStore } from "@/lib/auth";
import { anthropicKey } from "@/lib/env";
import { loadLesson } from "@/lib/content/lesson";
import { allLessons, course as courseMeta, curriculum, lesson as lessonMeta } from "@/lib/curriculum/data";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
import { courseSummaries } from "@/lib/learning/catalogue";
import { placementCourses } from "@/lib/learning/placement";
import { reviewMinutes } from "@/lib/learning/reviews";
import { TIME_ZONE, dueLabel, overview } from "@/lib/learning/service";
import { PHASE_TITLES } from "@/lib/learning/state";
import { longDate } from "@/lib/learning/time";
import { PHASES } from "@/lib/store/types";
import { tutorBudget } from "@/lib/tutor/budget";

export const metadata: Metadata = { title: "Today" };

function greeting(now: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: TIME_ZONE }).format(now));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function TodayPage() {
  const store = await getStore();
  const now = new Date();
  const [ov, budget, notes] = await Promise.all([overview(store, now), tutorBudget(store, now), store.notebook({ status: "open" })]);
  const { governor, dueNow, cards } = ov;
  const revisit = notes.filter((n) => n.revisitAt && new Date(n.revisitAt) <= now);
  const recall = ov.lastWeekReviews.total ? Math.round((100 * ov.lastWeekReviews.correct) / ov.lastWeekReviews.total) : null;
  const courses = courseSummaries(ov);

  const currentCode = ov.current;
  const current = currentCode ? loadLesson(currentCode) : null;
  const currentProgress = currentCode ? ov.progress.get(currentCode) : undefined;
  const currentPhase = currentProgress?.current ?? null;
  const nextCode = ov.nextLesson;
  const next = nextCode ? loadLesson(nextCode) : null;
  const heroCode = current ? currentCode : next ? nextCode : null;
  const heroCourse = heroCode ? courseMeta(heroCode.split(".")[0]!) : null;
  const firstUnwritten = allLessons().find((l) => ov.status.get(l.code) === "unwritten" || ov.status.get(l.code) === "drafting");
  const nextDue = [...cards].filter((c) => new Date(c.due) > now).sort((a, b) => a.due.localeCompare(b.due))[0];
  const placementOffer = placementCourses().filter(
    (c) => !ov.learner.placement?.[c] && ![...ov.progress.keys()].some((code) => code.startsWith(`${c}.`)),
  );
  const active = courses.filter((c) => c.state === "in-progress").slice(0, 4);
  const data = curriculum();
  const stage = data.stages.find((s) => {
    const list = courses.filter((c) => s.courses.includes(c.code));
    return list.some((c) => c.counts.done < c.counts.total);
  });
  const stageCourses = stage ? courses.filter((c) => stage.courses.includes(c.code)) : [];
  const stageDone = stageCourses.reduce((n, c) => n + c.counts.done, 0);
  const stageTotal = stageCourses.reduce((n, c) => n + c.counts.total, 0);
  const name = ov.learner.displayName?.split(" ")[0];

  return (
    <Page>
      <div className="mb-8 flex flex-col gap-2">
        <p className="text-sm font-medium text-ink-muted">{longDate(now)}</p>
        <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {greeting(now)}
          {name ? `, ${name}` : ""}
        </h1>
        <p className="text-base text-ink-muted">Reviews come first, then the next phase of your lesson.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {heroCode && (current || next) ? (
            <section aria-labelledby="hero-title" className="overflow-hidden rounded-xl border border-rule bg-surface shadow-sm">
              <div className="grid sm:grid-cols-[12rem_minmax(0,1fr)]">
                <div className="relative hidden border-r border-rule sm:block">
                  <CourseArt code={heroCode.split(".")[0]!} className="absolute inset-0" />
                </div>
                <div className="flex flex-col gap-5 p-6">
                  <div className="flex flex-col gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                      <span className="text-accent">{current ? "Continue learning" : "Up next"}</span>
                      <span className="text-ink-faint" aria-hidden="true">
                        ·
                      </span>
                      <span className={clsx("tabular", SUBJECT_STYLE[subjectOf(heroCode)].text)}>{heroCode}</span>
                      {heroCourse ? <span className="font-medium text-ink-muted">{heroCourse.title.split(":")[0]}</span> : null}
                    </p>
                    <h2 id="hero-title" className="text-2xl font-semibold tracking-tight text-ink">
                      {(current ?? next)!.file.title}
                    </h2>
                    {!current && next ? <p className="text-sm text-ink-muted">{next.file.summary}</p> : null}
                  </div>

                  {current && currentProgress ? (
                    <ol className="grid grid-cols-6 gap-1.5" aria-label="Phases">
                      {PHASES.map((p) => {
                        const state = currentProgress.phases[p];
                        const here = p === currentPhase;
                        const Icon = PHASE_ICONS[p];
                        return (
                          <li key={p} className="flex min-w-0 flex-col gap-1.5">
                            <span
                              aria-hidden="true"
                              className={clsx(
                                "h-1.5 rounded-full",
                                state === "completed" ? "bg-correct" : here ? "bg-accent" : "bg-inset",
                              )}
                            />
                            <span
                              className={clsx(
                                "hidden items-center gap-1 truncate text-xs md:flex",
                                here ? "font-semibold text-ink" : "text-ink-muted",
                              )}
                            >
                              {state === "completed" ? (
                                <CheckIcon className="size-3 shrink-0 text-correct" strokeWidth={2.25} />
                              ) : (
                                <Icon className="size-3 shrink-0" />
                              )}
                              <span className="truncate">{PHASE_TITLES[p]}</span>
                            </span>
                            <span className="sr-only">
                              {PHASE_TITLES[p]}: {state === "completed" ? "completed" : here ? "next" : "to come"}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-4">
                    {current && currentCode ? (
                      <Link
                        href={`/lessons/${currentCode}${currentPhase ? `/${currentPhase}` : ""}`}
                        className={buttonClasses(governor.canStartPhase ? "primary" : "secondary", "lg")}
                      >
                        Continue{currentPhase ? ` ${PHASE_TITLES[currentPhase]}` : ""}
                        <ArrowRightIcon className="size-4" />
                      </Link>
                    ) : next && nextCode ? (
                      <Link href={`/lessons/${nextCode}`} className={buttonClasses(governor.canBeginLesson ? "primary" : "secondary", "lg")}>
                        {governor.canBeginLesson ? "Begin the lesson" : "Look at it"}
                        <ArrowRightIcon className="size-4" />
                      </Link>
                    ) : null}
                    {current && !governor.canStartPhase && currentPhase ? (
                      <p className="text-sm text-ink-muted">Its next phase opens once today&apos;s reviews are done.</p>
                    ) : null}
                  </div>
                  {!current && next && !governor.canBeginLesson ? (
                    <ul className="flex flex-col gap-1 rounded-lg bg-inset/70 px-4 py-3 text-sm text-ink">
                      {governor.reasons.map((r) => (
                        <li key={r.text}>{r.text}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </section>
          ) : (
            <EmptyState icon={<BookIcon />} title={firstUnwritten ? `Next: ${firstUnwritten.code} ${firstUnwritten.title}` : "Nothing new is open"}>
              {firstUnwritten
                ? "This lesson is still being written. It opens here once it has passed every check: verified exercises, recomputed numbers, an independent review and the tutor's leak tests."
                : "Every lesson that is open to you is under way or done. The next ones open as you master what they require."}
            </EmptyState>
          )}

          <section aria-labelledby="reviews-title">
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  className={clsx(
                    "flex size-11 shrink-0 items-center justify-center rounded-lg",
                    dueNow.length ? "bg-accent text-on-accent" : "bg-inset text-ink-muted",
                  )}
                >
                  <ReviewIcon className="size-5" />
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h2 id="reviews-title" className="text-base font-semibold text-ink">
                    {dueNow.length ? (
                      <>
                        <span className="tabular">{dueNow.length}</span> {dueNow.length === 1 ? "review is" : "reviews are"} due
                      </>
                    ) : cards.length ? (
                      "Nothing due right now"
                    ) : (
                      "Nothing to review yet"
                    )}
                  </h2>
                  <p className="text-sm text-ink-muted">
                    {dueNow.length
                      ? `About ${reviewMinutes(dueNow.length)} minutes.${ov.overdue.length ? ` ${ov.overdue.length} of them were due before today.` : ""}`
                      : cards.length
                        ? `Your next review is due ${nextDue ? dueLabel(nextDue, now) : "later"}.`
                        : "Review questions appear here after your first lesson, at the moment you are about to forget them."}
                  </p>
                </div>
              </div>
              {dueNow.length ? (
                <Link href="/review" className={buttonClasses("primary")}>
                  Start reviews
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : null}
            </Panel>
          </section>

          {active.length ? (
            <section aria-labelledby="courses-title" className="flex flex-col gap-4">
              <div className="flex items-end justify-between gap-4">
                <h2 id="courses-title" className="text-lg font-semibold tracking-tight text-ink">
                  Your courses
                </h2>
                <Link href="/curriculum" className="flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent-strong">
                  The whole curriculum
                  <ChevronRightIcon className="size-4" />
                </Link>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {active.map((c) => (
                  <li key={c.code}>
                    <Link
                      href={`/courses/${c.code}`}
                      className="group flex h-full flex-col gap-3 rounded-lg border border-rule bg-surface p-4 shadow-xs transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <CourseMark code={c.code} />
                        <div className="flex min-w-0 flex-col">
                          <span className="text-xs font-semibold text-ink-muted">{c.curriculumName}</span>
                          <span className="text-sm leading-snug font-semibold text-ink group-hover:text-accent">{c.title}</span>
                        </div>
                      </div>
                      <div className="mt-auto flex flex-col gap-1.5">
                        <ProgressBar
                          value={c.counts.done}
                          secondary={c.counts.inProgress}
                          max={c.counts.total}
                          size="sm"
                          tone={SUBJECT_STYLE[c.curriculum].tone}
                          label={`${c.code}: ${c.counts.done} of ${c.counts.total} lessons done`}
                        />
                        <p className="tabular text-xs text-ink-muted">
                          {c.counts.done} of {c.counts.total} lessons done
                          {c.counts.inProgress ? `, ${c.counts.inProgress} under way` : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {placementOffer.length ? (
            <Panel className="flex flex-col gap-4">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-hint-soft text-hint">
                  <TargetIcon className="size-5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-ink">Already know some of this?</h2>
                  <p className="text-sm text-ink-muted">
                    A short placement check lets you skip lessons you already know. Anything skipped is confirmed by spaced
                    reviews over the next weeks, and a miss opens the lesson again.
                  </p>
                </div>
              </div>
              <ul className="flex flex-wrap gap-2 sm:pl-15">
                {placementOffer.map((c) => (
                  <li key={c}>
                    <Link href={`/placement?course=${c}`} className={buttonClasses("secondary", "sm")}>
                      {c} {courseMeta(c)?.title.split(":")[0]}
                      <ArrowRightIcon className="size-4" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          {revisit.length ? (
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-inset text-ink-muted">
                  <NotebookIcon className="size-5" />
                </span>
                <p className="text-sm text-ink">
                  <span className="tabular font-semibold">{revisit.length}</span> {revisit.length === 1 ? "note is" : "notes are"} ready to revisit
                  {revisit[0]?.lessonCode ? `, starting with one from ${revisit[0].lessonCode} ${lessonMeta(revisit[0].lessonCode)?.title ?? ""}` : ""}.
                </p>
              </div>
              <Link href="/notebook" className={buttonClasses("secondary")}>
                Open the notebook
              </Link>
            </Panel>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <Panel padding="sm" className="flex flex-col gap-5">
            <h2 className="text-sm font-semibold text-ink">This week</h2>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-ink-muted">New lessons begun</p>
                <p className="tabular text-sm font-semibold text-ink">
                  {governor.startedThisWeek} of {governor.weeklyLimit}
                </p>
              </div>
              <ProgressBar value={governor.startedThisWeek} max={governor.weeklyLimit} size="sm" label="New lessons begun this week" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-ink-muted">Recall, last 7 days</p>
                <p className="tabular text-sm font-semibold text-ink">{recall === null ? "None yet" : `${recall}%`}</p>
              </div>
              <p className="text-xs text-ink-muted">
                {recall === null ? "Shown once you have done some reviews." : `Over ${ov.lastWeekReviews.total} reviews. Below 85% pauses new lessons.`}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                  <SparkIcon className="size-3.5" /> Tutor today
                </p>
                {anthropicKey() ? (
                  <p className="tabular text-sm font-semibold text-ink">
                    ${budget.spentUsd.toFixed(2)} of ${budget.limitUsd.toFixed(2)}
                  </p>
                ) : null}
              </div>
              {anthropicKey() ? (
                <ProgressBar
                  value={budget.spentUsd}
                  max={budget.limitUsd}
                  size="sm"
                  label="Today's tutor budget used"
                  tone={budget.exhausted ? "warning" : "accent"}
                />
              ) : (
                <p className="text-xs text-ink-muted">Not connected yet; hints come from the lessons&apos; own notes.</p>
              )}
            </div>
          </Panel>

          {stage ? (
            <Panel padding="sm" className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">
                  Stage {stage.stage}: {stage.title}
                </h2>
                <span className="tabular text-xs text-ink-muted">
                  {stageDone} of {stageTotal}
                </span>
              </div>
              <ProgressBar value={stageDone} max={stageTotal} size="sm" label={`Stage ${stage.stage}: ${stageDone} of ${stageTotal} lessons done`} />
              <ul className="flex flex-wrap gap-1">
                {stage.courses.map((code) => (
                  <li key={code}>
                    <Link
                      href={`/courses/${code}`}
                      className={clsx(
                        "tabular inline-flex h-6 items-center rounded-sm px-1.5 text-xs font-semibold transition-opacity hover:opacity-80",
                        SUBJECT_STYLE[subjectOf(code)].soft,
                        SUBJECT_STYLE[subjectOf(code)].text,
                      )}
                    >
                      {code}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel padding="sm" className="flex flex-col gap-2">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <ClockIcon className="size-4 text-ink-muted" /> Your pace
            </h2>
            <p className="text-sm text-ink-muted">
              <span className="tabular font-semibold text-ink">{ov.learner.weeklyHours}</span> hours a week, which allows{" "}
              {governor.weeklyLimit} new {governor.weeklyLimit === 1 ? "lesson" : "lessons"} a week.
            </p>
            <Link href="/settings" className="text-sm font-semibold text-accent hover:text-accent-strong">
              Change it in Settings
            </Link>
          </Panel>
        </aside>
      </div>
    </Page>
  );
}
