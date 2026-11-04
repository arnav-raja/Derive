import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { EmptyState, Meter, Page, PageHeader, Panel, Section } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { anthropicKey } from "@/lib/env";
import { loadLesson } from "@/lib/content/lesson";
import { allLessons, course as courseMeta, lesson as lessonMeta } from "@/lib/curriculum/data";
import { placementCourses } from "@/lib/learning/placement";
import { reviewMinutes } from "@/lib/learning/reviews";
import { dueLabel, overview } from "@/lib/learning/service";
import { PHASE_TITLES } from "@/lib/learning/state";
import { longDate } from "@/lib/learning/time";
import { tutorBudget } from "@/lib/tutor/budget";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const store = await getStore();
  const now = new Date();
  const [ov, budget, notes] = await Promise.all([overview(store, now), tutorBudget(store, now), store.notebook({ status: "open" })]);
  const { governor, dueNow, cards } = ov;
  const revisit = notes.filter((n) => n.revisitAt && new Date(n.revisitAt) <= now);
  const recall = ov.lastWeekReviews.total ? Math.round((100 * ov.lastWeekReviews.correct) / ov.lastWeekReviews.total) : null;

  const currentCode = ov.current;
  const current = currentCode ? loadLesson(currentCode) : null;
  const currentPhase = currentCode ? ov.progress.get(currentCode)?.current : null;
  const nextCode = ov.nextLesson;
  const next = nextCode ? loadLesson(nextCode) : null;
  const firstUnwritten = allLessons().find((l) => ov.status.get(l.code) === "unwritten" || ov.status.get(l.code) === "drafting");
  const nextDue = [...cards].filter((c) => new Date(c.due) > now).sort((a, b) => a.due.localeCompare(b.due))[0];
  const placementOffer = placementCourses().filter(
    (c) => !ov.learner.placement?.[c] && ![...ov.progress.keys()].some((code) => code.startsWith(`${c}.`)),
  );

  return (
    <Page width="narrow">
      <PageHeader eyebrow={longDate(now)} title="Today" description="Reviews come first, then the next phase of your lesson." />

      <div className="flex flex-col gap-10">
        <Section title="Reviews">
          {dueNow.length === 0 ? (
            <EmptyState title={cards.length ? "Nothing due right now" : "Nothing to review yet"}>
              {cards.length
                ? `Your next review is due ${nextDue ? dueLabel(nextDue, now) : "later"}.`
                : "Review questions appear here after your first lesson, at the moment you are about to forget them."}
            </EmptyState>
          ) : (
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-base text-ink">
                  <span className="tabular font-semibold">{dueNow.length}</span> {dueNow.length === 1 ? "review is" : "reviews are"} due, about{" "}
                  <span className="tabular">{reviewMinutes(dueNow.length)}</span> minutes.
                </p>
                {ov.overdue.length ? (
                  <p className="text-sm text-ink-muted">
                    <span className="tabular">{ov.overdue.length}</span> of them were due before today.
                  </p>
                ) : null}
              </div>
              <Link href="/review" className={buttonClasses("primary")}>
                Start reviews
                <ArrowRightIcon className="size-4" />
              </Link>
            </Panel>
          )}
        </Section>

        <Section title={current ? "Your lesson" : "Next lesson"}>
          {current && currentCode ? (
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-ink-muted">
                  {currentCode}
                  {currentPhase ? ` · next: ${PHASE_TITLES[currentPhase]}` : ""}
                </p>
                <p className="font-serif text-xl font-semibold text-ink">{current.file.title}</p>
                {!governor.canStartPhase && currentPhase ? (
                  <p className="text-sm text-ink-muted">Its next phase opens once today&apos;s reviews are done.</p>
                ) : null}
              </div>
              <Link href={`/lessons/${currentCode}${currentPhase ? `/${currentPhase}` : ""}`} className={buttonClasses(governor.canStartPhase ? "primary" : "secondary")}>
                Continue
                <ArrowRightIcon className="size-4" />
              </Link>
            </Panel>
          ) : next && nextCode ? (
            <Panel className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-sm font-medium text-ink-muted">{nextCode}</p>
                  <p className="font-serif text-xl font-semibold text-ink">{next.file.title}</p>
                  <p className="text-sm text-ink-muted">{next.file.summary}</p>
                </div>
                <Link href={`/lessons/${nextCode}`} className={buttonClasses(governor.canBeginLesson ? "primary" : "secondary")}>
                  {governor.canBeginLesson ? "Begin" : "Look at it"}
                  <ArrowRightIcon className="size-4" />
                </Link>
              </div>
              {!governor.canBeginLesson ? (
                <ul className="flex flex-col gap-1 border-t border-rule pt-3 text-sm text-ink">
                  {governor.reasons.map((r) => (
                    <li key={r.text}>{r.text}</li>
                  ))}
                </ul>
              ) : null}
            </Panel>
          ) : (
            <EmptyState title={firstUnwritten ? `${firstUnwritten.code} ${firstUnwritten.title} is being written` : "Nothing new is open"}>
              {firstUnwritten
                ? "A lesson opens here once it has passed every check: verified exercises, recomputed numbers, an independent review and the tutor's leak tests."
                : "Every lesson that is open to you is under way or done. The next ones open as you master what they require."}
            </EmptyState>
          )}
        </Section>

        {placementOffer.length ? (
          <Section title="Already know some of this?">
            <Panel className="flex flex-col gap-3">
              <p className="text-sm text-ink">
                A short placement check lets you skip lessons you already know. Anything skipped is confirmed by spaced
                reviews over the next weeks, and a miss opens the lesson again.
              </p>
              <ul className="flex flex-wrap gap-2">
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
          </Section>
        ) : null}

        <Section title="This week">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">New lessons begun</p>
              <p className="tabular text-2xl font-semibold text-ink">
                {governor.startedThisWeek} <span className="text-base font-normal text-ink-muted">of {governor.weeklyLimit}</span>
              </p>
              <Meter value={governor.startedThisWeek} max={governor.weeklyLimit} label="New lessons begun this week" />
            </Panel>
            <Panel className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">Recall in the last 7 days</p>
              <p className="tabular text-2xl font-semibold text-ink">{recall === null ? "None yet" : `${recall}%`}</p>
              {recall !== null ? (
                <p className="text-xs text-ink-muted">
                  Over {ov.lastWeekReviews.total} reviews. Below 85% pauses new lessons.
                </p>
              ) : null}
            </Panel>
            <Panel className="flex flex-col gap-2">
              <p className="text-sm text-ink-muted">Tutor today</p>
              {anthropicKey() ? (
                <>
                  <p className="tabular text-2xl font-semibold text-ink">
                    ${budget.spentUsd.toFixed(2)} <span className="text-base font-normal text-ink-muted">of ${budget.limitUsd.toFixed(2)}</span>
                  </p>
                  <Meter value={budget.spentUsd} max={budget.limitUsd} label="Today's tutor budget used" tone={budget.exhausted ? "warning" : "accent"} />
                </>
              ) : (
                <p className="text-sm text-ink">Not connected yet; hints come from the lessons&apos; own notes.</p>
              )}
            </Panel>
          </div>
        </Section>

        {revisit.length ? (
          <Section title="Notebook">
            <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-base text-ink">
                <span className="tabular font-semibold">{revisit.length}</span> {revisit.length === 1 ? "note is" : "notes are"} ready to revisit
                {revisit[0]?.lessonCode ? `, starting with one from ${revisit[0].lessonCode} ${lessonMeta(revisit[0].lessonCode)?.title ?? ""}` : ""}.
              </p>
              <Link href="/notebook" className={buttonClasses("secondary")}>
                Open the notebook
              </Link>
            </Panel>
          </Section>
        ) : null}

        <p className="text-sm text-ink-muted">
          Your pace is set to <span className="tabular">{ov.learner.weeklyHours}</span> hours a week, which allows{" "}
          {governor.weeklyLimit} new {governor.weeklyLimit === 1 ? "lesson" : "lessons"} a week. You can change it in{" "}
          <Link href="/settings" className="font-medium text-accent hover:text-accent-strong">
            Settings
          </Link>
          .
        </p>
      </div>
    </Page>
  );
}
