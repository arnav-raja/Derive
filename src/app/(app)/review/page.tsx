import type { Metadata } from "next";
import Link from "next/link";

import { ExerciseCard } from "@/components/exercise/exercise-card";
import { SocraticChat } from "@/components/tutor/socratic";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon } from "@/components/ui/icons";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { anthropicKey } from "@/lib/env";
import { loadLesson } from "@/lib/content/lesson";
import { variantView } from "@/lib/content/views";
import { orderDue } from "@/lib/learning/review-queue";
import { dueLabel, parseCardId } from "@/lib/learning/service";
import { tutorBudget } from "@/lib/tutor/budget";

export const metadata: Metadata = { title: "Review" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** How long an answered review stays on screen if the page is reloaded. */
const KEEP_MS = 6 * 3600 * 1000;

export default async function ReviewPage({ searchParams }: Props) {
  const query = await searchParams;
  const store = await getStore();
  const now = new Date();
  const [cards, recent, budget] = await Promise.all([
    store.cards(),
    store.attempts({ kinds: ["review"], limit: 100 }),
    tutorBudget(store, now),
  ]);
  const due = cards.filter((c) => new Date(c.due) <= now);
  const reviewedToday = recent.filter((a) => now.getTime() - Date.parse(a.createdAt) < 18 * 3600 * 1000).length;
  const last = typeof query.last === "string" ? query.last : null;
  const configured = anthropicKey() !== null;

  const header = (
    <PageHeader
      title="Review"
      description="Spaced questions from every lesson you have finished, mixed across the three curriculums, each a fresh question on an idea you have met."
    />
  );

  // The question just answered stays on screen, with its answer, until the learner moves on.
  if (last) {
    const attempt = recent.find((a) => a.cardId === last);
    const ref = parseCardId(last);
    const lesson = ref ? loadLesson(ref.lessonCode) : null;
    const ex = ref ? lesson?.byId.get(ref.exerciseId) : undefined;
    const variant = (attempt?.payload as { variant?: unknown } | null)?.variant;
    if (attempt && lesson && ex && typeof variant === "number" && now.getTime() - Date.parse(attempt.createdAt) < KEEP_MS) {
      const view = variantView(lesson, ex, variant, { mode: "review", cardId: last, variant }, { done: true, correct: attempt.correct });
      if (view) {
        return (
          <Page width="narrow">
            {header}
            <div className="flex flex-col gap-6">
              <p className="tabular text-sm text-ink-muted">
                {due.length === 0 ? "That was the last one due." : `${due.length} still due.`} From {lesson.code} {lesson.file.title}.
              </p>
              <ExerciseCard key={view.key} view={view} />
              {attempt.correct === false ? <SocraticChat cardId={last} configured={configured} budget={budget} /> : null}
              <div>
                {due.length ? (
                  <Link href="/review" className={buttonClasses("primary")}>
                    Next question
                    <ArrowRightIcon className="size-4" />
                  </Link>
                ) : (
                  <Link href="/today" className={buttonClasses("primary")}>
                    Back to Today
                    <ArrowRightIcon className="size-4" />
                  </Link>
                )}
              </div>
            </div>
          </Page>
        );
      }
    }
  }

  if (due.length === 0) {
    const nextDue = [...cards].sort((a, b) => a.due.localeCompare(b.due))[0];
    return (
      <Page width="narrow">
        {header}
        <EmptyState title={reviewedToday ? "All done for now" : "No reviews are due"}>
          {cards.length === 0
            ? "Each idea you learn comes back as a fresh question at growing intervals, timed for just before you would forget it. The first ones appear a few days after your first lesson."
            : `${reviewedToday ? `You answered ${reviewedToday} today. ` : ""}The next review is due ${nextDue ? dueLabel(nextDue, now) : "later"}.`}
        </EmptyState>
      </Page>
    );
  }

  const [card] = orderDue(due, recent[0]?.lessonCode ?? null);
  const ref = card ? parseCardId(card.cardId) : null;
  const lesson = ref ? loadLesson(ref.lessonCode) : null;
  const ex = ref ? lesson?.byId.get(ref.exerciseId) : undefined;
  const variants = ex?.review?.variants.length ?? 0;
  const view = card && lesson && ex && variants ? variantView(lesson, ex, card.nextVariant % variants, { mode: "review", cardId: card.cardId, variant: card.nextVariant % variants }) : null;

  return (
    <Page width="narrow">
      {header}
      <div className="flex flex-col gap-6">
        <p className="tabular text-sm text-ink-muted">
          {due.length} due{reviewedToday ? `, ${reviewedToday} answered today` : ""}. Commit to an answer before you look anything up.
        </p>
        {view ? (
          <ExerciseCard key={view.key} view={view} />
        ) : (
          <EmptyState title="This review could not be shown">
            Its lesson has changed since the card was made. It will be repaired with the next lesson update.
          </EmptyState>
        )}
      </div>
    </Page>
  );
}
