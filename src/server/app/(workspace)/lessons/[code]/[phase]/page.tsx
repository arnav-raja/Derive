import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { completePhase, startPhase } from "@/server/app/(app)/lessons/actions";
import { phaseComponents } from "@/components/lesson/phase-components";
import { PHASE_ICONS } from "@/components/lesson/phase-icons";
import { SymbolHighlighter } from "@/components/lesson/symbol-highlighter";
import { LessonWorkspace, type WorkspacePhase } from "@/components/lesson/workspace";
import { TutorProvider } from "@/components/tutor/tutor";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ChevronDownIcon, CircleIcon, HalfCircleIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { ProgressBar, SegmentedProgress } from "@/components/ui/progress";
import { getStore } from "@/lib/auth";
import { anthropicKey } from "@/lib/env";
import { readyLesson } from "@/lib/content/lesson";
import { MdxContent } from "@/lib/content/mdx";
import { course as courseMeta, lesson as lessonMeta } from "@/lib/curriculum/data";
import { chooseMixedCheck, hasMixedCheck, storedCheck, unansweredCheck, type CheckItem } from "@/lib/learning/mixed-check";
import { overview } from "@/lib/learning/service";
import {
  PHASE_PURPOSE,
  PHASE_TITLES,
  exerciseStates,
  lessonProgress,
  nextPhase,
  outstanding,
  type PhaseState,
} from "@/lib/learning/state";
import { PHASES, type Json, type PhaseId } from "@/lib/store/types";
import { tutorBudget } from "@/lib/tutor/budget";

type Props = {
  params: Promise<{ code: string; phase: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function isPhase(p: string): p is PhaseId {
  return (PHASES as readonly string[]).includes(p);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code, phase } = await params;
  const meta = lessonMeta(code);
  return { title: meta && isPhase(phase) ? `${PHASE_TITLES[phase]}: ${code} ${meta.title}` : "Lesson" };
}

const WORDS: Record<PhaseState, string> = { completed: "Completed", started: "In progress", available: "Ready", locked: "Locked" };

function OutlineDot({ phase, state, here }: { phase: PhaseId; state: PhaseState; here: boolean }) {
  const Icon = PHASE_ICONS[phase];
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex size-7 shrink-0 items-center justify-center rounded-full border [&>svg]:size-3.5",
        here
          ? "border-accent bg-accent text-on-accent"
          : state === "completed"
            ? "border-correct/40 bg-correct-soft text-correct"
            : state === "started"
              ? "border-accent bg-surface text-accent"
              : state === "available"
                ? "border-rule-strong bg-surface text-ink-muted"
                : "border-rule bg-inset text-ink-faint",
      )}
    >
      {state === "completed" && !here ? <CheckIcon strokeWidth={2.25} /> : state === "locked" ? <LockIcon /> : <Icon />}
    </span>
  );
}

export default async function PhasePage({ params, searchParams }: Props) {
  const { code, phase } = await params;
  const query = await searchParams;
  if (!isPhase(phase)) notFound();
  const lesson = readyLesson(code);
  if (!lesson) notFound();

  const store = await getStore();
  const [rows, attempts, ov, budget] = await Promise.all([
    store.progress(code),
    store.attempts({ lessonCode: code, limit: 2000 }),
    overview(store),
    tutorBudget(store),
  ]);
  const progress = lessonProgress(rows);
  if (!progress.begun) redirect(`/lessons/${code}`);
  const state = progress.phases[phase];
  const row = rows.find((r) => r.phase === phase);
  const states = exerciseStates(lesson.exercises, attempts);
  const inPhase = lesson.exercises.filter((e) => e.phase === phase);
  const left = outstanding(lesson.exercises, phase, states);

  // The Explain phase keeps its mixed check in its state; older rows get one now.
  let check: { items: CheckItem[]; attempts: typeof attempts } | null = null;
  if (phase === "explain" && row && hasMixedCheck(lesson)) {
    let items = storedCheck(row.state);
    if (!items) {
      items = await chooseMixedCheck(store, lesson);
      const base = row.state && typeof row.state === "object" && !Array.isArray(row.state) ? row.state : {};
      await store.savePhase({ lessonCode: code, phase, status: row.status, state: { ...base, mixedCheck: items } as Json });
    }
    check = { items, attempts: attempts.filter((a) => a.kind === "check") };
  }
  const checkLeft = check ? unansweredCheck(check.items, check.attempts).length : 0;

  const next = nextPhase(phase);
  const index = PHASES.indexOf(phase);
  const prev = index > 0 ? PHASES[index - 1]! : null;
  const components = phaseComponents({ lesson, phase, states, attempts, check });
  const meta = lessonMeta(code);
  const course = meta ? courseMeta(meta.course) : null;
  const phasesDone = PHASES.filter((p) => progress.phases[p] === "completed").length;
  const solvedHere = inPhase.filter((e) => states.get(e.id)?.done).length;
  const firstLeft = left[0] ?? null;
  const open = state === "started" || state === "completed";

  const workspacePhases: WorkspacePhase[] = PHASES.map((p) => ({
    id: p,
    title: PHASE_TITLES[p],
    state: progress.phases[p],
    href: progress.phases[p] !== "locked" ? `/lessons/${code}/${p}` : null,
  }));

  const outline = (
    <nav aria-label="Lesson outline" className="flex flex-col gap-6 px-4 py-5">
      <div className="flex flex-col gap-3">
        {course ? (
          <Link href={`/courses/${course.code}`} className="text-xs font-semibold text-ink-muted transition-colors hover:text-ink">
            <span className="tabular">{course.code}</span> · {course.title}
          </Link>
        ) : null}
        <Link href={`/lessons/${code}`} className="text-base leading-snug font-semibold text-ink transition-colors hover:text-accent">
          <span className="tabular text-ink-muted">{code}</span> {lesson.file.title}
        </Link>
        <SegmentedProgress
          segments={PHASES.map((p) => (progress.phases[p] === "completed" ? "done" : p === phase ? "current" : "todo"))}
          label={`${phasesDone} of 6 phases done`}
        />
        <p className="tabular text-xs text-ink-muted">{phasesDone} of 6 phases done</p>
      </div>
      <ol className="flex flex-col gap-0.5">
        {PHASES.map((p, i) => {
          const s = progress.phases[p];
          const here = p === phase;
          const inner = (
            <>
              <OutlineDot phase={p} state={s} here={here} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={clsx("text-sm", here ? "font-semibold text-ink" : "font-medium text-ink")}>
                  <span className="tabular mr-1.5 text-ink-faint">{i + 1}</span>
                  {PHASE_TITLES[p]}
                </span>
                <span className="text-xs text-ink-muted">
                  {WORDS[s]} · about {lesson.file.minutes[p]} min
                </span>
              </span>
            </>
          );
          return (
            <li key={p}>
              {s !== "locked" ? (
                <Link
                  href={`/lessons/${code}/${p}`}
                  aria-current={here ? "page" : undefined}
                  className={clsx("flex items-center gap-3 rounded-md px-2 py-2 transition-colors", here ? "bg-accent-soft" : "hover:bg-inset")}
                >
                  {inner}
                </Link>
              ) : (
                <span className="flex items-center gap-3 px-2 py-2 opacity-75">{inner}</span>
              )}
              {here && inPhase.length > 0 && open ? (
                <ul className="mt-1 mb-2 ml-[1.375rem] flex flex-col gap-0.5 border-l-2 border-rule py-1 pl-4">
                  {inPhase.map((e) => {
                    const es = states.get(e.id);
                    return (
                      <li key={e.id}>
                        <a
                          href={`#exercise-${e.id}`}
                          className="flex items-start gap-2 rounded-sm py-1 text-sm text-ink-muted transition-colors hover:text-ink"
                        >
                          {es?.solved ? (
                            <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-correct" strokeWidth={2.25} />
                          ) : es?.done ? (
                            <HalfCircleIcon className="mt-0.5 size-3.5 shrink-0 text-accent" />
                          ) : (
                            <CircleIcon className="mt-0.5 size-3.5 shrink-0" />
                          )}
                          <span className="min-w-0">{e.title ?? e.id}</span>
                          <span className="sr-only">, {es?.solved ? "solved" : es?.done ? "answered" : "not done"}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );

  const Icon = PHASE_ICONS[phase];
  const header = (
    <header className="mb-10 flex flex-col gap-4 border-b border-rule pb-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          <Icon className="size-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-accent">
            Phase {index + 1} of 6
          </span>
          <span className="text-sm text-ink-muted">About {lesson.file.minutes[phase]} minutes</span>
        </div>
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{PHASE_TITLES[phase]}</h1>
      <p className="max-w-2xl text-lg text-ink-muted">{PHASE_PURPOSE[phase]}</p>
    </header>
  );

  let body;
  if (state === "locked") {
    body = (
      <Notice tone="info" title="Not open yet">
        Each phase opens when the one before it is finished.{" "}
        {progress.current ? (
          <Link href={`/lessons/${code}/${progress.current}`} className="font-medium text-accent hover:text-accent-strong">
            Go to {PHASE_TITLES[progress.current]}
          </Link>
        ) : null}
      </Notice>
    );
  } else if (state === "available") {
    body = (
      <div className="flex flex-col gap-4">
        {ov.governor.canStartPhase ? (
          <div className="flex flex-col items-start gap-4 rounded-xl border border-rule bg-surface p-6 shadow-xs">
            <p className="text-base text-ink">When you are ready, start the phase. Take it slowly; there is no prize for speed.</p>
            <ActionButton action={startPhase.bind(null, code, phase)} pendingText="Starting" size="lg">
              Start {PHASE_TITLES[phase]}
            </ActionButton>
          </div>
        ) : (
          <Notice tone="warning" title="Reviews first">
            <p>{ov.governor.reasons.find((r) => r.rule === 1)?.text} Reviewing first is what keeps earlier lessons alive while you learn new ones.</p>
            <Link href="/review" className={clsx(buttonClasses("primary", "sm"), "mt-3")}>
              Go to reviews
              <ArrowRightIcon className="size-4" />
            </Link>
          </Notice>
        )}
      </div>
    );
  } else {
    body = (
      <>
        {query.recall === "1" ? (
          <Notice tone="warning" title="A recall round is waiting" className="mb-8" role="status">
            You moved through the last phase much faster than usual and missed some checks, so its questions are waiting in
            Review. It is worth slowing down where it felt shaky.
          </Notice>
        ) : null}
        <SymbolHighlighter>
          <div className="prose-derive">
            <MdxContent source={lesson.sources[phase]} components={components} />
          </div>
        </SymbolHighlighter>
        <section aria-label={`End of ${PHASE_TITLES[phase]}`} className="mt-14 flex flex-col gap-4 rounded-xl border border-rule bg-surface p-5 shadow-xs sm:p-6">
          <div className="flex items-center gap-3">
            <span
              className={clsx(
                "flex size-9 items-center justify-center rounded-full",
                state === "completed" || (left.length === 0 && checkLeft === 0) ? "bg-correct-soft text-correct" : "bg-inset text-ink-muted",
              )}
            >
              <CheckIcon className="size-4" strokeWidth={2.25} />
            </span>
            <div className="flex flex-col">
              <h2 className="text-base font-semibold text-ink">End of {PHASE_TITLES[phase]}</h2>
              <p className="text-sm text-ink-muted">
                {state === "completed"
                  ? "You finished this phase. You can come back to it at any time."
                  : left.length || checkLeft
                    ? "Answer what is still open, then finish the phase."
                    : next
                      ? `Everything required here is done. Finishing opens ${PHASE_TITLES[next]}.`
                      : "Everything required here is done. Finishing completes the lesson."}
              </p>
            </div>
          </div>
          {inPhase.length > 0 ? (
            <ul className="flex flex-col divide-y divide-rule rounded-lg border border-rule">
              {inPhase.map((e) => {
                const es = states.get(e.id);
                return (
                  <li key={e.id}>
                    <a href={`#exercise-${e.id}`} className="flex items-center gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-inset/60">
                      {es?.solved ? (
                        <CheckIcon className="size-4 shrink-0 text-correct" strokeWidth={2.25} />
                      ) : es?.done ? (
                        <HalfCircleIcon className="size-4 shrink-0 text-accent" />
                      ) : (
                        <CircleIcon className="size-4 shrink-0 text-ink-faint" />
                      )}
                      <span className="min-w-0 flex-1 text-ink">{e.title ?? e.id}</span>
                      <span className="shrink-0 text-xs text-ink-muted">
                        {es?.solved ? "Solved" : es?.movedOn ? "Moved on" : es?.done ? "Answered" : e.required === false ? "Optional" : "To do"}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </section>
      </>
    );
  }

  const footer = open ? (
    <div className="border-t border-rule bg-surface/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-3xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 flex-1 items-center">
          {prev ? (
            <Link href={`/lessons/${code}/${prev}`} className={buttonClasses("ghost", "sm")}>
              <ArrowLeftIcon className="size-4" />
              <span className="hidden sm:inline">{PHASE_TITLES[prev]}</span>
              <span className="sr-only sm:hidden">Previous phase: {PHASE_TITLES[prev]}</span>
            </Link>
          ) : null}
        </div>
        {inPhase.length > 0 ? (
          <div className="hidden min-w-0 flex-col items-center gap-1 sm:flex">
            <p className="tabular text-xs font-medium text-ink-muted">
              {solvedHere} of {inPhase.length} answered
            </p>
            <ProgressBar value={solvedHere} max={inPhase.length} size="sm" className="w-32" label={`${solvedHere} of ${inPhase.length} exercises answered`} />
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center justify-end">
          {state === "started" ? (
            firstLeft ? (
              <a href={`#exercise-${firstLeft.id}`} className={buttonClasses("secondary", "sm")}>
                Next exercise
                <ChevronDownIcon className="size-4" />
              </a>
            ) : checkLeft > 0 ? (
              <a href="#mixed-check" className={buttonClasses("secondary", "sm")}>
                Mixed check
                <ChevronDownIcon className="size-4" />
              </a>
            ) : (
              <ActionButton action={completePhase.bind(null, code, phase)} pendingText="Saving" size="sm">
                {next ? `Finish ${PHASE_TITLES[phase]}` : "Finish the lesson"}
                <ArrowRightIcon className="size-4" />
              </ActionButton>
            )
          ) : next && progress.phases[next] !== "locked" ? (
            <Link href={`/lessons/${code}/${next}`} className={buttonClasses("primary", "sm")}>
              {PHASE_TITLES[next]}
              <ArrowRightIcon className="size-4" />
            </Link>
          ) : (
            <Link href={`/lessons/${code}`} className={buttonClasses("secondary", "sm")}>
              Lesson overview
            </Link>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <TutorProvider
      lessonCode={code}
      phaseTitle={PHASE_TITLES[phase]}
      budget={{ spentUsd: budget.spentUsd, limitUsd: budget.limitUsd }}
      configured={anthropicKey() !== null}
    >
      <LessonWorkspace
        code={code}
        lessonTitle={lesson.file.title}
        phases={workspacePhases}
        current={phase}
        outline={outline}
        footer={footer}
        showTutor={open}
      >
        <article className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
          {header}
          {body}
        </article>
      </LessonWorkspace>
    </TutorProvider>
  );
}
