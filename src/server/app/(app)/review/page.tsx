import "@/app/fonts/serif";

import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";

import { ExerciseCard } from "@/components/exercise/exercise-card";
import { SocraticChat } from "@/components/tutor/socratic";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, CheckCircleIcon, ReviewIcon } from "@/components/ui/icons";
import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { ProgressBar } from "@/components/ui/progress";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
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
      eyebrow="Spaced review"
      title="Review"
      description="Spaced questions from every lesson you have finished, mixed across the three curriculums, each a fresh question on an idea you have met."
    />
  );

  /** Where the session stands: answered today against what is still due, and where this question comes from. */
  const session = (from: { code: string; title: string } | null, extra?: string) => {
    const total = reviewedToday + due.length;
    return (
      <div className="flex flex-col gap-3 rounded-xl border border-rule bg-surface px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <ReviewIcon className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col">
            <p className="tabular text-sm font-semibold text-ink">
              {due.length === 0 ? "Nothing more due" : `${due.length} still due`}
              {reviewedToday ? <span className="font-normal text-ink-muted"> · {reviewedToday} answered today</span> : null}
            </p>
            {from ? (
              <p className="truncate text-xs text-ink-muted">
                From{" "}
                <span className={clsx("tabular font-semibold", SUBJECT_STYLE[subjectOf(from.code)].text)}>{from.code}</span> {from.title}
                {extra ? ` · ${extra}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        {total > 0 ? (
          <div className="flex items-center gap-3 sm:w-56">
            <ProgressBar value={reviewedToday} max={total} size="sm" tone="correct" label={`${reviewedToday} of ${total} reviews done today`} />
            <span className="tabular shrink-0 text-xs font-medium text-ink-muted">
              {reviewedToday}/{total}
            </span>
          </div>
        ) : null}
      </div>
    );
  };

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
              {session({ code: lesson.code, title: lesson.file.title }, due.length === 0 ? "that was the last one due" : undefined)}
              <div className="[&>section]:my-0">
                <ExerciseCard key={view.key} view={view} />
              </div>
              {attempt.correct === false ? <SocraticChat cardId={last} configured={configured} budget={budget} /> : null}
              <div className="flex flex-wrap items-center justify-end gap-3">
                {due.length ? (
                  <Link href="/review" className={buttonClasses("primary", "lg")}>
                    Next question
                    <ArrowRightIcon className="size-4" />
                  </Link>
                ) : (
                  <Link href="/today" className={buttonClasses("primary", "lg")}>
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
        <EmptyState icon={reviewedToday ? <CheckCircleIcon /> : <ReviewIcon />} title={reviewedToday ? "All done for now" : "No reviews are due"}>
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
        {session(lesson ? { code: lesson.code, title: lesson.file.title } : null, "commit to an answer before you look anything up")}
        {view ? (
          <div className="[&>section]:my-0">
            <ExerciseCard key={view.key} view={view} />
          </div>
        ) : (
          <EmptyState title="This review could not be shown">
            Its lesson has changed since the card was made. It will be repaired with the next lesson update.
          </EmptyState>
        )}
      </div>
    </Page>
  );
}
