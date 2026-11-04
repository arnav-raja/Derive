import type { Metadata } from "next";
import Link from "next/link";

import { ExerciseCard } from "@/components/exercise/exercise-card";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { EmptyState, Page, PageHeader, Panel } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { variantView } from "@/lib/content/views";
import { course as courseMeta } from "@/lib/curriculum/data";
import { placementCourses, placementState } from "@/lib/learning/placement";

import { endPlacement } from "./actions";

export const metadata: Metadata = { title: "Placement" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

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
          title="Placement"
          description="A short check per early course lets you skip what you already know. Anything skipped stays provisional until spaced reviews over the next weeks confirm it."
        />
        {courses.length === 0 ? (
          <EmptyState title="No placement check is ready yet">It appears once the first lessons are written.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {courses.map((c) => (
              <li key={c}>
                <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-ink-muted">{c}</p>
                    <p className="text-base font-semibold text-ink">{courseMeta(c)?.title}</p>
                    {learner.placement?.[c] ? <p className="text-sm text-ink-muted">Taken.</p> : null}
                  </div>
                  <Link href={`/placement?course=${c}`} className={buttonClasses(learner.placement?.[c] ? "secondary" : "primary")}>
                    {learner.placement?.[c] ? "See the result" : "Take it"}
                    <ArrowRightIcon className="size-4" />
                  </Link>
                </Panel>
              </li>
            ))}
          </ul>
        )}
      </Page>
    );
  }

  const [state, learner, progress] = await Promise.all([placementState(store, course), store.learner(), store.progress()]);
  const meta = courseMeta(course);
  const record = learner.placement?.[course];
  const begun = progress.some((p) => p.lessonCode.startsWith(`${course}.`));
  const header = (
    <PageHeader
      eyebrow={`Placement · ${course}`}
      title={meta?.title ?? course}
      description="Answer only what you know; a guess helps nobody. One miss stops the check for the lessons that build on it, so it stays short."
    />
  );

  if (record) {
    const skipped = new Set(record.skippedLessons);
    return (
      <Page width="narrow">
        {header}
        <Panel className="flex flex-col gap-4">
          <p className="text-base text-ink">
            {skipped.size === 0
              ? "Nothing is skipped: every lesson in this course is worth doing. That is a fine result; it means the course is pitched where you are."
              : `${skipped.size} ${skipped.size === 1 ? "lesson is" : "lessons are"} skipped for now. Their questions come back as reviews over the next weeks: two right answers confirm each idea, and one miss opens the lesson again.`}
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {state.lessons.map((l) => (
              <li key={l.code} className="flex gap-2">
                <span className="tabular w-12 shrink-0 text-ink-muted">{l.code}</span>
                <span className="text-ink">{l.file.title}</span>
                <span className="ml-auto shrink-0 text-ink-muted">{skipped.has(l.code) ? "skipped, to confirm" : "to study"}</span>
              </li>
            ))}
          </ul>
          <Link href="/today" className={buttonClasses("primary")}>
            Back to Today
            <ArrowRightIcon className="size-4" />
          </Link>
        </Panel>
      </Page>
    );
  }

  if (begun && state.answered === 0) {
    return (
      <Page width="narrow">
        {header}
        <EmptyState title="You have already begun this course" action={<Link href="/today" className={buttonClasses("secondary")}>Back to Today</Link>}>
          Placement is for skipping lessons before you start them. The lessons you have begun already show what you know.
        </EmptyState>
      </Page>
    );
  }

  const q = state.next;
  const view = q
    ? variantView(q.lesson, q.ex, q.variant, { mode: "placement", cardId: q.cardId, variant: q.variant, course }, null)
    : null;

  return (
    <Page width="narrow">
      {header}
      <div className="flex flex-col gap-6">
        <p className="tabular text-sm text-ink-muted">
          {state.answered} answered{q ? `, at most ${state.remaining} to go` : ""}.
          {q ? ` This question is about ${q.lesson.code} ${q.lesson.file.title}.` : ""}
        </p>
        {view ? (
          <ExerciseCard key={view.key} view={view} />
        ) : (
          <Panel>
            <p className="text-base text-ink">That is the whole check. Record the result to see what is skipped.</p>
          </Panel>
        )}
        <ActionButton action={endPlacement.bind(null, course)} variant={view ? "ghost" : "primary"} pendingText="Recording">
          {view ? "Stop here and record the result" : "Record the result"}
        </ActionButton>
      </div>
    </Page>
  );
}
