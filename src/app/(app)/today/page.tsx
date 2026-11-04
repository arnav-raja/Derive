import type { Metadata } from "next";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { EmptyState, Page, PageHeader, Panel, Section } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { writtenLessonCodes } from "@/lib/content/files";
import { allLessons } from "@/lib/curriculum/data";
import { longDate } from "@/lib/learning/time";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const store = await getStore();
  const now = new Date().toISOString();
  const [learner, due] = await Promise.all([store.learner(), store.cards({ dueBefore: now })]);
  const written = new Set(writtenLessonCodes());
  const first = allLessons()[0]!;

  return (
    <Page width="narrow">
      <PageHeader
        eyebrow={longDate(now)}
        title="Today"
        description="Reviews come first, then the next phase of your lesson."
      />

      <div className="flex flex-col gap-10">
        <Section title="Reviews">
          {due.length === 0 ? (
            <EmptyState title="Nothing to review yet">
              Review questions appear here after your first lesson, at the moment you are about to
              forget them.
            </EmptyState>
          ) : (
            <Panel className="flex items-center justify-between gap-4">
              <p className="text-base text-ink">
                <span className="tabular font-semibold">{due.length}</span>{" "}
                {due.length === 1 ? "review is" : "reviews are"} due.
              </p>
              <Link href="/review" className={buttonClasses("primary")}>
                Start reviews
                <ArrowRightIcon className="size-4" />
              </Link>
            </Panel>
          )}
        </Section>

        <Section title="Next lesson">
          {written.has(first.code) ? (
            <Panel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-medium text-ink-muted">{first.code}</p>
                <p className="font-serif text-xl font-semibold text-ink">{first.title}</p>
              </div>
              <Link href={`/lessons/${first.code}`} className={buttonClasses("primary")}>
                Begin
                <ArrowRightIcon className="size-4" />
              </Link>
            </Panel>
          ) : (
            <EmptyState title={`${first.code} ${first.title} is being written`}>
              Your first lesson opens here once it has passed every check: verified exercises,
              recomputed numbers, an independent review and the tutor&apos;s leak tests. Until
              then there is nothing to do.
            </EmptyState>
          )}
        </Section>

        <p className="text-sm text-ink-muted">
          Your pace is set to <span className="tabular">{learner.weeklyHours}</span> hours a week.
          You can change it in{" "}
          <Link href="/settings" className="font-medium text-accent hover:text-accent-strong">
            Settings
          </Link>
          .
        </p>
      </div>
    </Page>
  );
}
