import "@/app/fonts/serif";

import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";

import { ExerciseCard } from "@/components/exercise/exercise-card";
import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, CheckIcon, TargetIcon } from "@/components/ui/icons";
import { EmptyState, Page, PageHeader, Panel, Section } from "@/components/ui/page";
import { ProgressBar, ProgressRing } from "@/components/ui/progress";
import { getStore } from "@/lib/auth";
import { variantView } from "@/lib/content/views";
import { CURRICULUM_NAMES, course as courseMeta } from "@/lib/curriculum/data";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
import { placementCourses, placementLessons, placementState } from "@/lib/learning/placement";

import { endPlacement } from "./actions";

export const metadata: Metadata = { title: "Placement" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STEPS = [
  { title: "Answer only what you know", body: "A guess helps nobody. Low confidence counts as not known." },
  { title: "One miss ends a branch", body: "Lessons that build on a missed idea are not tested, so the check stays short." },
  { title: "Reviews confirm the rest", body: "Skipped ideas come back as reviews. Two right answers confirm each one." },
];

const plural = (x: number, one: string, many: string) => `${x.toLocaleString("en-GB")} ${x === 1 ? one : many}`;

export default async function PlacementPage({ searchParams }: Props) {
  const query = await searchParams;
  const courses = placementCourses();
  const course = typeof query.course === "string" && courses.includes(query.course) ? query.course : null;
  const store = await getStore();

  if (!course) {
    const learner = await store.learner();
    return (
      <Page width="narrow">
        <PageHeader
          eyebrow="Skip what you know"
          title="Placement"
          description="A short check per early course lets you skip what you already know. Anything skipped stays provisional until spaced reviews over the next weeks confirm it."
        />
        <div className="flex flex-col gap-10">
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3 rounded-lg border border-rule bg-surface p-4 shadow-xs sm:flex-col">
                <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
                  {i + 1}
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-sm font-semibold text-ink">{s.title}</span>
                  <span className="text-sm text-ink-muted">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>

          {courses.length === 0 ? (
            <EmptyState icon={<TargetIcon />} title="No placement check is ready yet">
              It appears once the first lessons are written.
            </EmptyState>
          ) : (
            <Section title="Courses with a check" description="Each takes a few minutes and can be stopped at any point.">
              <ul className="flex flex-col gap-3">
                {courses.map((c) => {
                  const record = learner.placement?.[c];
                  const style = SUBJECT_STYLE[subjectOf(c)];
                  const checkable = placementLessons(c).length;
                  return (
                    <li key={c}>
                      <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <span
                            className={clsx(
                              "tabular flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold",
                              style.soft,
                              style.text,
                            )}
                          >
                            {c}
                          </span>
                          <div className="flex min-w-0 flex-col gap-1">
                            <p className="text-base font-semibold text-ink">{courseMeta(c)?.title}</p>
                            <p className="text-sm text-ink-muted">
                              {CURRICULUM_NAMES[subjectOf(c)]} · {plural(checkable, "lesson", "lessons")} can be checked
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          {record ? (
                            <Badge tone="correct" icon={<CheckIcon className="size-3.5" strokeWidth={2.25} />}>
                              Taken · {record.skippedLessons.length} skipped
                            </Badge>
                          ) : null}
                          <Link href={`/placement?course=${c}`} className={buttonClasses(record ? "secondary" : "primary")}>
                            {record ? "See the result" : "Start the check"}
                            <ArrowRightIcon className="size-4" />
                          </Link>
                        </div>
                      </Panel>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}
        </div>
      </Page>
    );
  }

  const [state, learner, progress] = await Promise.all([placementState(store, course), store.learner(), store.progress()]);
  const meta = courseMeta(course);
  const record = learner.placement?.[course];
  const begun = progress.some((p) => p.lessonCode.startsWith(`${course}.`));
  const style = SUBJECT_STYLE[subjectOf(course)];
  const header = (
    <>
      <Breadcrumbs items={[{ href: "/placement", label: "Placement" }, { label: course }]} className="mb-6" />
      <PageHeader
        eyebrow={
          <span>
            Placement · <span className={clsx("tabular font-semibold", style.text)}>{course}</span>
          </span>
        }
        title={meta?.title ?? course}
        description="Answer only what you know; a guess helps nobody. One miss stops the check for the lessons that build on it, so it stays short."
      />
    </>
  );

  if (record) {
    const skipped = new Set(record.skippedLessons);
    return (
      <Page width="narrow">
        {header}
        <Panel padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
            <ProgressRing
              value={skipped.size}
              max={Math.max(1, state.lessons.length)}
              size={64}
              tone="accent"
              label={`${skipped.size} of ${state.lessons.length} lessons skipped`}
            >
              <span className="tabular text-sm font-semibold text-ink">
                {skipped.size}/{state.lessons.length}
              </span>
            </ProgressRing>
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="text-lg font-semibold text-ink">
                {skipped.size === 0 ? "Nothing is skipped" : `${plural(skipped.size, "lesson", "lessons")} skipped for now`}
              </h2>
              <p className="text-sm text-ink-muted">
                {skipped.size === 0
                  ? "Every lesson in this course is worth doing. That is a fine result; it means the course is pitched where you are."
                  : "Their questions come back as reviews over the next weeks: two right answers confirm each idea, and one miss opens the lesson again."}
              </p>
            </div>
          </div>
          <ul className="divide-y divide-rule border-t border-rule">
            {state.lessons.map((l) => (
              <li key={l.code} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                <span className="tabular w-12 shrink-0 text-sm font-semibold text-ink-muted">{l.code}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{l.file.title}</span>
                {skipped.has(l.code) ? <Badge tone="hint">Skipped, to confirm</Badge> : <Badge tone="neutral">To study</Badge>}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-3 border-t border-rule bg-inset px-5 py-3 sm:px-6">
            <Link href={`/courses/${course}`} className={buttonClasses("secondary")}>
              Open the course
            </Link>
            <Link href="/today" className={buttonClasses("primary")}>
              Back to Today
              <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </Panel>
      </Page>
    );
  }

  if (begun && state.answered === 0) {
    return (
      <Page width="narrow">
        {header}
        <EmptyState
          icon={<TargetIcon />}
          title="You have already begun this course"
          action={
            <Link href={`/courses/${course}`} className={buttonClasses("secondary")}>
              Open the course
            </Link>
          }
        >
          Placement is for skipping lessons before you start them. The lessons you have begun already show what you know.
        </EmptyState>
      </Page>
    );
  }

  const q = state.next;
  const view = q
    ? variantView(q.lesson, q.ex, q.variant, { mode: "placement", cardId: q.cardId, variant: q.variant, course }, null)
    : null;
  const total = state.answered + state.remaining;

  return (
    <Page width="narrow">
      {header}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 rounded-xl border border-rule bg-surface px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <TargetIcon className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="tabular text-sm font-semibold text-ink">
                {q ? `Question ${state.answered + 1}` : "The check is complete"}
                <span className="font-normal text-ink-muted">
                  {" "}
                  · {state.answered} answered{q ? `, at most ${state.remaining} to go` : ""}
                </span>
              </p>
              {q ? (
                <p className="truncate text-xs text-ink-muted">
                  About <span className={clsx("tabular font-semibold", style.text)}>{q.lesson.code}</span> {q.lesson.file.title}
                </p>
              ) : null}
            </div>
          </div>
          {total > 0 ? (
            <div className="flex items-center gap-3 sm:w-56">
              <ProgressBar value={state.answered} max={total} size="sm" label={`${state.answered} of at most ${total} questions answered`} />
              <span className="tabular shrink-0 text-xs font-medium text-ink-muted">
                {state.answered}/{total}
              </span>
            </div>
          ) : null}
        </div>

        {view ? (
          <div className="[&>section]:my-0">
            <ExerciseCard key={view.key} view={view} />
          </div>
        ) : (
          <Panel className="flex flex-col gap-1">
            <h2 className="text-base font-semibold text-ink">That is the whole check</h2>
            <p className="text-sm text-ink-muted">Record the result to see which lessons are skipped.</p>
          </Panel>
        )}

        <div className="flex flex-col gap-3 border-t border-rule pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            {view ? "Unsure of the rest? Stop now: anything not answered stays to study." : "Nothing is skipped until the result is recorded."}
          </p>
          <ActionButton action={endPlacement.bind(null, course)} variant={view ? "secondary" : "primary"} pendingText="Recording">
            {view ? "Stop and record the result" : "Record the result"}
          </ActionButton>
        </div>
      </div>
    </Page>
  );
}
