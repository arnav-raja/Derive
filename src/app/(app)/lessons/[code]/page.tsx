import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, CheckIcon, CircleIcon, HalfCircleIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { EmptyState, Page, PageHeader, Panel, Section } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { loadLesson, readyLesson } from "@/lib/content/lesson";
import { course, lesson as lessonMeta } from "@/lib/curriculum/data";
import { hardPrerequisites, overview } from "@/lib/learning/service";
import { PHASE_PURPOSE, PHASE_TITLES, lessonProgress, type PhaseState } from "@/lib/learning/state";
import { PHASES } from "@/lib/store/types";

import { beginLesson } from "../actions";

type Props = {
  params: Promise<{ code: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const meta = lessonMeta(code);
  return { title: meta ? `${code} ${meta.title}` : "Lesson" };
}

function PhaseMark({ state }: { state: PhaseState }) {
  // Decorative: the state is also said in words beside it.
  if (state === "completed") return <CheckIcon className="size-4 text-correct" />;
  if (state === "started") return <HalfCircleIcon className="size-4 text-accent" />;
  if (state === "locked") return <LockIcon className="size-4 text-ink-faint" />;
  return <CircleIcon className="size-4 text-ink-muted" />;
}

const STATE_WORDS: Record<PhaseState, string> = {
  completed: "Completed",
  started: "In progress",
  available: "Next",
  locked: "Locked",
};

type ConceptEvidence = { producedAt?: string | null; explainedAt?: string | null; recalledAt?: string | null; masteredAt?: string | null };

function joinAnd(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** What an idea has shown and what it still needs, right first: "produced; still to explain it and recall it in a review". */
function conceptStatus(s: ConceptEvidence | undefined): string {
  if (s?.masteredAt) return "mastered";
  const done = [s?.producedAt ? "produced" : "", s?.explainedAt ? "explained" : "", s?.recalledAt ? "recalled" : ""].filter(Boolean);
  const left = [
    s?.producedAt ? "" : "produce it",
    s?.explainedAt ? "" : "explain it",
    s?.recalledAt ? "" : "recall it in a review",
  ].filter(Boolean);
  return `${done.length ? joinAnd(done) : "not yet shown"}; still to ${joinAnd(left)}`;
}

export default async function LessonPage({ params, searchParams }: Props) {
  const { code } = await params;
  const query = await searchParams;
  const meta = lessonMeta(code);
  if (!meta) notFound();
  const lesson = readyLesson(code);
  const courseMeta = course(meta.course);

  if (!lesson) {
    return (
      <Page width="narrow">
        <PageHeader eyebrow={`${code} · ${courseMeta?.title ?? meta.course}`} title={meta.title} />
        <EmptyState title="This lesson is being written">
          It opens here once it has passed every check: exercises verified by running them, numbers
          recomputed, an independent review and the tutor&apos;s leak tests.
        </EmptyState>
      </Page>
    );
  }

  const store = await getStore();
  const [ov, rows] = await Promise.all([overview(store), store.progress(code)]);
  const progress = lessonProgress(rows);
  const status = ov.status.get(code);
  const finished = query.finished === "1";
  const taught = lesson.file.concepts.taught;
  const links = lesson.file.links;

  const unmet = hardPrerequisites(code).filter((req) => {
    const st = ov.status.get(req.lesson);
    if (req.concept) return !ov.concepts.get(req.concept)?.masteredAt && !ov.concepts.get(req.concept)?.provisional;
    return st !== "mastered";
  });

  return (
    <Page width="narrow">
      <PageHeader eyebrow={`${code} · ${courseMeta?.title ?? meta.course}`} title={lesson.file.title} description={lesson.file.summary} />

      <div className="flex flex-col gap-10">
        {finished ? (
          <Notice tone="correct" title="Lesson complete" role="status">
            <p>
              Every phase is done. An idea counts as mastered once you have produced it yourself, explained it simply and
              recalled it in a later review.{" "}
              {taught.every((c) => ov.concepts.get(c.id)?.masteredAt || ov.concepts.get(c.id)?.explainedAt)
                ? "The reviews over the next few days finish the job."
                : "The list shows what each idea still needs."}
            </p>
            <ul className="mt-2 flex flex-col gap-1">
              {taught.map((c) => (
                <li key={c.id}>
                  <span className="font-medium">{c.name}:</span> {conceptStatus(ov.concepts.get(c.id))}
                </li>
              ))}
            </ul>
          </Notice>
        ) : null}

        <Panel className="flex flex-col gap-4">
          {status === "locked" ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-base font-semibold text-ink">
                <LockIcon className="size-4" /> Locked
              </p>
              <p className="text-sm text-ink-muted">
                This lesson opens once you have mastered what it requires:{" "}
                {unmet.map((r) => `${r.lesson} ${loadLesson(r.lesson)?.file.title ?? lessonMeta(r.lesson)?.title ?? ""}`.trim()).join("; ")}.
              </p>
            </div>
          ) : progress.begun ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-ink-muted">{progress.completed ? "You have finished this lesson." : "You are part way through."}</p>
                <p className="text-base font-semibold text-ink">
                  {progress.current ? `Next: ${PHASE_TITLES[progress.current]}` : "Revisit any phase below"}
                </p>
              </div>
              {progress.current ? (
                <Link href={`/lessons/${code}/${progress.current}`} className={buttonClasses("primary")}>
                  Continue
                  <ArrowRightIcon className="size-4" />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink-muted">
                {lesson.file.sittings === 1 ? "One sitting" : `${lesson.file.sittings} sittings`}, about{" "}
                {Object.values(lesson.file.minutes).reduce((a, b) => a + b, 0)} minutes in all. It starts with a puzzle
                you cannot answer yet.
              </p>
              {!ov.governor.canBeginLesson ? (
                <ul className="flex flex-col gap-1 text-sm text-ink">
                  {ov.governor.reasons.map((r) => (
                    <li key={r.text}>{r.text}</li>
                  ))}
                </ul>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                {ov.governor.canBeginLesson ? (
                  <ActionButton action={beginLesson.bind(null, code)} pendingText="Opening the puzzle">
                    Begin the lesson
                  </ActionButton>
                ) : ov.governor.reasons.some((r) => r.rule === 1) ? (
                  <Link href="/review" className={buttonClasses("primary")}>
                    Do the reviews first
                    <ArrowRightIcon className="size-4" />
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </Panel>

        <Section title="The six phases">
          <ol className="flex flex-col gap-2">
            {PHASES.map((phase, i) => {
              const state = progress.begun ? progress.phases[phase] : "locked";
              const open = state === "started" || state === "completed" || (progress.begun && state === "available");
              const body = (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">
                    <PhaseMark state={state} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="flex flex-wrap items-baseline gap-x-2 text-base font-medium text-ink">
                      <span className="tabular text-sm text-ink-muted">{i + 1}</span>
                      {PHASE_TITLES[phase]}
                      <span className="text-xs font-normal text-ink-muted">
                        {STATE_WORDS[state]} · about {lesson.file.minutes[phase]} min
                      </span>
                    </p>
                    <p className="text-sm text-ink-muted">{PHASE_PURPOSE[phase]}</p>
                  </div>
                </div>
              );
              return (
                <li key={phase}>
                  {open ? (
                    <Link href={`/lessons/${code}/${phase}`} className="block rounded-md border border-rule bg-surface px-4 py-3 hover:border-rule-strong">
                      {body}
                    </Link>
                  ) : (
                    <div className="rounded-md border border-rule px-4 py-3">{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </Section>

        <Section title="What you will be able to do">
          <ul className="flex flex-col gap-3">
            {taught.map((c) => (
              <li key={c.id} className="flex flex-col gap-0.5">
                <p className="text-base font-medium text-ink">{c.name}</p>
                <p className="text-sm text-ink-muted">{c.summary}</p>
              </li>
            ))}
          </ul>
        </Section>

        {[...links.requires, ...links.buildsOn, ...links.revisits].length ||
        [...links.anotherViewOf, ...links.contrastsWith, ...links.applies].length ||
        links.foreshadows.length ? (
          <Section title="How it connects">
            <dl className="flex flex-col gap-4">
              {(
                [
                  ["Builds on", [...links.requires, ...links.buildsOn, ...links.revisits]],
                  ["Seen another way", [...links.anotherViewOf, ...links.contrastsWith, ...links.applies]],
                  ["Leads to", links.foreshadows],
                ] as const
              ).map(([label, list]) =>
                list.length ? (
                  <div key={label} className="flex flex-col gap-1">
                    <dt className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</dt>
                    {list.map((l) => (
                      <dd key={`${label}-${l.lesson}`} className="text-sm text-ink">
                        <Link href={`/lessons/${l.lesson}`} className="font-medium text-accent hover:text-accent-strong">
                          {l.lesson} {lessonMeta(l.lesson)?.title ?? ""}
                        </Link>
                        : {l.bridge}
                      </dd>
                    ))}
                  </div>
                ) : null,
              )}
            </dl>
          </Section>
        ) : null}
      </div>
    </Page>
  );
}
