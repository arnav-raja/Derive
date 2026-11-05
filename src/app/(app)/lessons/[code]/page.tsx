import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseMark } from "@/components/course/course-art";
import { StatusBadge } from "@/components/course/status";
import { PHASE_ICONS } from "@/components/lesson/phase-icons";
import { ActionButton } from "@/components/ui/action-button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, BookIcon, CheckIcon, ChevronRightIcon, ClockIcon, LayersIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { EmptyState, Page, Panel } from "@/components/ui/page";
import { ProgressRing } from "@/components/ui/progress";
import { getStore } from "@/lib/auth";
import { loadLesson, readyLesson } from "@/lib/content/lesson";
import { renderInline } from "@/lib/content/markdown";
import { course, lesson as lessonMeta } from "@/lib/curriculum/data";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
import { displayStatus } from "@/lib/learning/catalogue";
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

  const style = SUBJECT_STYLE[subjectOf(code)];
  const crumbs = [
    { href: "/curriculum", label: "Curriculum" },
    ...(courseMeta ? [{ href: `/courses/${courseMeta.code}`, label: `${courseMeta.code} ${courseMeta.title}` }] : []),
    { label: code },
  ];

  if (!lesson) {
    return (
      <Page width="narrow">
        <Breadcrumbs className="mb-6" items={crumbs} />
        <div className="mb-8 flex flex-col gap-2">
          <p className={clsx("tabular text-sm font-semibold", style.text)}>{code}</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{meta.title}</h1>
        </div>
        <EmptyState title="This lesson is being written" icon={<BookIcon />}>
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
  const minutes = Object.values(lesson.file.minutes).reduce((a, b) => a + b, 0);
  const phasesDone = PHASES.filter((p) => progress.phases[p] === "completed").length;

  const unmet = hardPrerequisites(code).filter((req) => {
    const st = ov.status.get(req.lesson);
    if (req.concept) return !ov.concepts.get(req.concept)?.masteredAt && !ov.concepts.get(req.concept)?.provisional;
    return st !== "mastered";
  });

  const connections = (
    [
      ["Builds on", [...links.requires, ...links.buildsOn, ...links.revisits]],
      ["Seen another way", [...links.anotherViewOf, ...links.contrastsWith, ...links.applies]],
      ["Leads to", links.foreshadows],
    ] as const
  ).filter(([, list]) => list.length > 0);

  let action;
  if (status === "locked") {
    action = (
      <div className="flex flex-col gap-3 rounded-lg border border-rule bg-inset/60 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          <LockIcon className="size-4 text-ink-muted" /> Locked
        </p>
        <p className="text-sm text-ink-muted">This lesson opens once you have mastered what it requires:</p>
        <ul className="flex flex-col gap-1">
          {unmet.map((r) => (
            <li key={`${r.lesson}-${r.concept ?? ""}`}>
              <Link href={`/lessons/${r.lesson}`} className="flex items-center gap-2 text-sm font-medium text-accent hover:text-accent-strong">
                <span className="tabular">{r.lesson}</span>
                <span>{loadLesson(r.lesson)?.file.title ?? lessonMeta(r.lesson)?.title ?? ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  } else if (progress.begun) {
    action = (
      <div className="flex flex-wrap items-center gap-4">
        {progress.current ? (
          <Link href={`/lessons/${code}/${progress.current}`} className={buttonClasses("primary", "lg")}>
            {progress.phases[progress.current] === "started" ? "Continue" : "Start"} {PHASE_TITLES[progress.current]}
            <ArrowRightIcon className="size-4" />
          </Link>
        ) : (
          <Link href={`/lessons/${code}/puzzle`} className={buttonClasses("secondary", "lg")}>
            Revisit the lesson
          </Link>
        )}
        <p className="text-sm text-ink-muted">
          {progress.completed ? "You have finished this lesson. Any phase can be opened again." : "You are part way through."}
        </p>
      </div>
    );
  } else {
    action = (
      <div className="flex flex-col gap-3">
        {!ov.governor.canBeginLesson ? (
          <ul className="flex flex-col gap-1 rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-ink">
            {ov.governor.reasons.map((r) => (
              <li key={r.text}>{r.text}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          {ov.governor.canBeginLesson ? (
            <ActionButton action={beginLesson.bind(null, code)} pendingText="Opening the puzzle" size="lg">
              Begin the lesson
            </ActionButton>
          ) : ov.governor.reasons.some((r) => r.rule === 1) ? (
            <Link href="/review" className={buttonClasses("primary", "lg")}>
              Do the reviews first
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : null}
          <p className="text-sm text-ink-muted">It starts with a puzzle you cannot answer yet.</p>
        </div>
      </div>
    );
  }

  return (
    <Page>
      <Breadcrumbs className="mb-6" items={crumbs} />

      {finished ? (
        <Notice tone="correct" title="Lesson complete" role="status" className="mb-8">
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

      <section className="flex flex-col gap-6 rounded-xl border border-rule bg-surface p-6 shadow-sm sm:p-8 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx("tabular inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold", style.soft, style.text)}>
              {code}
            </span>
            <StatusBadge status={displayStatus(status)} />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl">{lesson.file.title}</h1>
            <p className="max-w-2xl text-base text-ink-muted sm:text-lg">{lesson.file.summary}</p>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <li className="flex items-center gap-2">
              <LayersIcon className="size-4 text-ink-faint" />
              <span>
                <span className="font-semibold text-ink">6</span> phases
              </span>
            </li>
            <li className="flex items-center gap-2">
              <ClockIcon className="size-4 text-ink-faint" />
              <span>
                about <span className="tabular font-semibold text-ink">{minutes}</span> minutes
              </span>
            </li>
            <li className="flex items-center gap-2">
              <BookIcon className="size-4 text-ink-faint" />
              <span>{lesson.file.sittings === 1 ? "one sitting" : `${lesson.file.sittings} sittings`}</span>
            </li>
          </ul>
          {action}
        </div>
        {progress.begun ? (
          <div className="flex shrink-0 items-center gap-4 rounded-lg border border-rule bg-inset/50 p-4 md:flex-col md:px-8 md:py-6">
            <ProgressRing value={phasesDone} max={6} size={88} stroke={8} tone={progress.completed ? "correct" : "accent"} label={`${phasesDone} of 6 phases done`}>
              <span className="tabular text-lg font-semibold text-ink">{phasesDone}/6</span>
            </ProgressRing>
            <p className="text-sm font-medium text-ink-muted">phases done</p>
          </div>
        ) : null}
      </section>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-10">
          <section aria-labelledby="phases-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="phases-heading" className="text-lg font-semibold tracking-tight text-ink">
                The six phases
              </h2>
              <p className="text-sm text-ink-muted">Each phase opens when the one before it is finished.</p>
            </div>
            <ol className="relative flex flex-col">
              {PHASES.map((phase, i) => {
                const state = progress.begun ? progress.phases[phase] : "locked";
                const open = state === "started" || state === "completed" || (progress.begun && state === "available");
                const here = progress.current === phase && !progress.completed;
                const Icon = PHASE_ICONS[phase];
                const body = (
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className={clsx(
                        "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 [&>svg]:size-4",
                        state === "completed"
                          ? "border-correct bg-correct text-surface"
                          : here
                            ? "border-accent bg-accent text-on-accent"
                            : state === "started" || state === "available"
                              ? "border-accent bg-surface text-accent"
                              : "border-rule-strong bg-surface text-ink-faint",
                      )}
                    >
                      {state === "completed" ? <CheckIcon strokeWidth={2.25} /> : <Icon />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
                      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className={clsx("text-base font-semibold", open ? "text-ink group-hover:text-accent" : "text-ink")}>
                          {PHASE_TITLES[phase]}
                        </span>
                        <span className="tabular text-xs font-medium text-ink-muted">
                          Phase {i + 1} · about {lesson.file.minutes[phase]} min
                        </span>
                      </p>
                      <p className="text-sm text-ink-muted">{PHASE_PURPOSE[phase]}</p>
                    </div>
                    <span className="hidden shrink-0 pt-1.5 text-xs font-semibold text-ink-muted sm:block">
                      {here && state !== "started" ? "Next" : STATE_WORDS[state]}
                    </span>
                    {open ? <ChevronRightIcon className="mt-2.5 size-4 shrink-0 text-ink-faint group-hover:text-ink-muted" /> : <span className="size-4 shrink-0" />}
                  </div>
                );
                return (
                  <li key={phase} className="relative pb-2 last:pb-0">
                    {i < PHASES.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={clsx(
                          "absolute top-12 bottom-0 left-9 w-0.5 -translate-x-1/2 rounded-full",
                          state === "completed" ? "bg-correct/50" : "bg-rule",
                        )}
                      />
                    ) : null}
                    {open ? (
                      <Link
                        href={`/lessons/${code}/${phase}`}
                        className={clsx(
                          "group block rounded-lg border px-4 py-3 transition-colors",
                          here ? "border-accent/40 bg-accent-soft/50" : "border-transparent hover:border-rule hover:bg-surface",
                        )}
                      >
                        {body}
                        <span className="sr-only">, {STATE_WORDS[state]}</span>
                      </Link>
                    ) : (
                      <div className="rounded-lg border border-transparent px-4 py-3">
                        {body}
                        <span className="sr-only">, {STATE_WORDS[state]}</span>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>

          <section aria-labelledby="ideas-heading" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 id="ideas-heading" className="text-lg font-semibold tracking-tight text-ink">
                What you will be able to do
              </h2>
              {progress.completed ? null : (
                <p className="text-sm text-ink-muted">
                  What each idea says, and how this lesson connects to others, is shown here once you have finished the
                  lesson, so that nothing on this page answers a question before the lesson asks it.
                </p>
              )}
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {taught.map((c) => {
                const ev = ov.concepts.get(c.id);
                return (
                  <li key={c.id}>
                    <Panel padding="sm" className="flex h-full flex-col gap-1.5">
                      <p className="flex items-start gap-2 text-base font-semibold text-ink">
                        {ev?.masteredAt ? (
                          <CheckIcon className="mt-1 size-4 shrink-0 text-correct" strokeWidth={2.25} title="Mastered" />
                        ) : null}
                        {c.name}
                      </p>
                      {/* What an idea says can answer the lesson's own questions, so it waits for the end. */}
                      {progress.completed ? <p className="text-sm text-ink-muted">{renderInline(c.summary)}</p> : null}
                    </Panel>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          {courseMeta ? (
            <Panel padding="sm" className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-ink">Course</h2>
              <Link href={`/courses/${courseMeta.code}`} className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-inset">
                <CourseMark code={courseMeta.code} size="sm" />
                <span className="min-w-0 flex-1 text-sm text-ink group-hover:text-accent">{courseMeta.title}</span>
                <ChevronRightIcon className="size-4 shrink-0 text-ink-faint" />
              </Link>
            </Panel>
          ) : null}
          {connections.length ? (
            <Panel padding="sm" className="flex flex-col gap-4">
              <h2 className="text-sm font-semibold text-ink">How it connects</h2>
              <dl className="flex flex-col gap-4">
                {connections.map(([label, list]) => (
                  <div key={label} className="flex flex-col gap-1.5">
                    <dt className="text-xs font-semibold text-ink-muted">{label}</dt>
                    {list.map((l) => (
                      <dd key={`${label}-${l.lesson}`} className="text-sm text-ink">
                        <Link href={`/lessons/${l.lesson}`} className="font-medium text-accent hover:text-accent-strong">
                          <span className="tabular">{l.lesson}</span> {lessonMeta(l.lesson)?.title ?? ""}
                        </Link>
                        {progress.completed ? <span className="mt-0.5 block text-ink-muted">{renderInline(l.bridge)}</span> : null}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            </Panel>
          ) : null}
        </aside>
      </div>
    </Page>
  );
}
