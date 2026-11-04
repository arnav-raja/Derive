import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PhaseComplete } from "@/components/lesson/phase-complete";
import { phaseComponents } from "@/components/lesson/phase-components";
import { SymbolHighlighter } from "@/components/lesson/symbol-highlighter";
import { AskTutorButton, TutorPanel, TutorProvider } from "@/components/tutor/tutor";
import { ActionButton } from "@/components/ui/action-button";
import { buttonClasses } from "@/components/ui/button";
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, CircleIcon, HalfCircleIcon, LockIcon } from "@/components/ui/icons";
import { Notice } from "@/components/ui/notice";
import { getStore } from "@/lib/auth";
import { anthropicKey } from "@/lib/env";
import { readyLesson } from "@/lib/content/lesson";
import { MdxContent } from "@/lib/content/mdx";
import { lesson as lessonMeta } from "@/lib/curriculum/data";
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

import { startPhase } from "../../actions";

export const maxDuration = 60;

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

function Mark({ state }: { state: PhaseState }) {
  if (state === "completed") return <CheckIcon className="size-4 shrink-0 text-correct" />;
  if (state === "started") return <HalfCircleIcon className="size-4 shrink-0 text-accent" />;
  if (state === "locked") return <LockIcon className="size-4 shrink-0 text-ink-faint" />;
  return <CircleIcon className="size-4 shrink-0 text-ink-muted" />;
}

const WORDS: Record<PhaseState, string> = { completed: "completed", started: "in progress", available: "next", locked: "locked" };

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

  const outline = (
    <nav aria-label="Phases of this lesson" className="flex flex-col gap-1">
      <p className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
        <Link href={`/lessons/${code}`} className="hover:text-ink">
          {code} {lesson.file.title}
        </Link>
      </p>
      <ol className="flex flex-col gap-0.5">
        {PHASES.map((p, i) => {
          const s = progress.phases[p];
          const here = p === phase;
          const reachable = s !== "locked";
          const inner = (
            <span className="flex items-center gap-2">
              <Mark state={s} />
              <span className="tabular text-xs text-ink-muted">{i + 1}</span>
              <span className={clsx("text-sm", here ? "font-semibold text-ink" : "text-ink-muted")}>{PHASE_TITLES[p]}</span>
              <span className="sr-only">, {WORDS[s]}</span>
            </span>
          );
          return (
            <li key={p}>
              {reachable ? (
                <Link
                  href={`/lessons/${code}/${p}`}
                  aria-current={here ? "page" : undefined}
                  className={clsx("block rounded-md px-2 py-1.5", here ? "bg-accent-soft" : "hover:bg-inset")}
                >
                  {inner}
                </Link>
              ) : (
                <span className="block px-2 py-1.5 opacity-70">{inner}</span>
              )}
              {here && inPhase.length > 0 && (state === "started" || state === "completed") ? (
                <ul className="mt-1 mb-2 ml-8 flex flex-col gap-1 border-l border-rule pl-3">
                  {inPhase.map((e) => {
                    const es = states.get(e.id);
                    return (
                      <li key={e.id}>
                        <a href={`#exercise-${e.id}`} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
                          {es?.solved ? <CheckIcon className="size-3 text-correct" /> : es?.done ? <HalfCircleIcon className="size-3" /> : <CircleIcon className="size-3" />}
                          <span>{e.title ?? e.id}</span>
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

  const header = (
    <header className="mb-8 flex flex-col gap-3 border-b border-rule pb-6">
      <p className="text-sm font-medium text-ink-muted">
        <Link href={`/lessons/${code}`} className="hover:text-ink">
          {code} {lesson.file.title}
        </Link>{" "}
        · Phase {index + 1} of 6
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{PHASE_TITLES[phase]}</h1>
        <AskTutorButton />
      </div>
      <p className="max-w-2xl text-base text-ink-muted">
        {PHASE_PURPOSE[phase]} About {lesson.file.minutes[phase]} minutes.
      </p>
      <ol className="flex flex-wrap gap-1.5 xl:hidden" aria-label="Phases">
        {PHASES.map((p, i) => (
          <li key={p}>
            {progress.phases[p] !== "locked" ? (
              <Link
                href={`/lessons/${code}/${p}`}
                aria-current={p === phase ? "page" : undefined}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
                  p === phase ? "border-accent bg-accent-soft text-accent-strong" : "border-rule text-ink-muted hover:border-rule-strong",
                )}
              >
                <Mark state={progress.phases[p]} />
                {i + 1}. {PHASE_TITLES[p]}
                <span className="sr-only">, {WORDS[progress.phases[p]]}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full border border-rule px-2.5 py-1 text-xs text-ink-faint">
                <Mark state="locked" />
                {i + 1}. {PHASE_TITLES[p]}
                <span className="sr-only">, locked</span>
              </span>
            )}
          </li>
        ))}
      </ol>
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
          <>
            <p className="text-base text-ink">When you are ready, start the phase. Take it slowly; there is no prize for speed.</p>
            <ActionButton action={startPhase.bind(null, code, phase)} pendingText="Starting">
              Start {PHASE_TITLES[phase]}
            </ActionButton>
          </>
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
        <div className="mt-12 flex flex-col gap-4 border-t border-rule pt-6">
          {state === "started" ? (
            <PhaseComplete
              code={code}
              phase={phase}
              left={left.length}
              checkLeft={checkLeft}
              label={next ? `Finish ${PHASE_TITLES[phase]}` : "Finish the lesson"}
            />
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <CheckIcon className="size-4 text-correct" /> You finished this phase. You can come back to it at any time.
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-3">
            {prev ? (
              <Link href={`/lessons/${code}/${prev}`} className={buttonClasses("ghost", "sm")}>
                <ArrowLeftIcon className="size-4" />
                {PHASE_TITLES[prev]}
              </Link>
            ) : (
              <span />
            )}
            {next && progress.phases[next] !== "locked" ? (
              <Link href={`/lessons/${code}/${next}`} className={buttonClasses("secondary", "sm")}>
                {PHASE_TITLES[next]}
                <ArrowRightIcon className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  return (
    <TutorProvider
      lessonCode={code}
      phaseTitle={PHASE_TITLES[phase]}
      budget={{ spentUsd: budget.spentUsd, limitUsd: budget.limitUsd }}
      configured={anthropicKey() !== null}
    >
      <div className="mx-auto grid w-full max-w-[92rem] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[14rem_minmax(0,1fr)_22rem]">
        <aside className="hidden xl:block">
          <div className="sticky top-20">{outline}</div>
        </aside>
        <article className="mx-auto w-full max-w-3xl min-w-0">
          {header}
          {body}
        </article>
        <div className="min-w-0">{state === "started" || state === "completed" ? <TutorPanel /> : null}</div>
      </div>
    </TutorProvider>
  );
}
