import "server-only";

import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ReactNode } from "react";

import { ExerciseCard } from "@/components/exercise/exercise-card";
import { ExpressionTree, FloatLine, FunctionPlot, MappingDiagram, PartialSums, ProgramTrace, ScaleLine, Staircase } from "@/components/figures";
import { HintIcon, LockIcon } from "@/components/ui/icons";
import { loadLesson, type LoadedLesson } from "@/lib/content/lesson";
import { exerciseView, variantView } from "@/lib/content/views";
import type { CheckItem } from "@/lib/learning/mixed-check";
import { hintsFrom, type ExerciseState } from "@/lib/learning/state";
import type { Attempt, PhaseId } from "@/lib/store/types";

import { Callback, Definition, Figure, Foreshadow, Note, Stated, Step, Steps, Sym } from "./prose";

/*
 * The components a lesson phase's MDX is rendered with. Gated content is
 * decided here, on the server: a Reveal's children are not sent to the
 * browser until its exercise is done, and a Reteach only after a miss.
 */

export type PhaseContext = {
  lesson: LoadedLesson;
  phase: PhaseId;
  states: Map<string, ExerciseState>;
  attempts: Attempt[];
  check: { items: CheckItem[]; attempts: Attempt[] } | null;
};

function Problem({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="not-prose my-4 rounded-md border border-warning/50 bg-warning-soft px-3 py-2 font-sans text-sm text-ink">
      <span className="font-semibold">Lesson error: </span>
      {children}
    </p>
  );
}

export function phaseComponents(ctx: PhaseContext): MDXComponents {
  const { lesson, phase, states, attempts } = ctx;

  function ExerciseSlot({ id }: { id: string }) {
    const ex = lesson.byId.get(id);
    if (!ex) return <Problem>there is no exercise called {id}.</Problem>;
    if (ex.phase !== phase) return <Problem>exercise {id} belongs to another phase.</Problem>;
    return (
      <div id={`exercise-${id}`} className="scroll-mt-32">
        <ExerciseCard view={exerciseView(lesson, ex, states.get(id), hintsFrom(attempts, id))} />
      </div>
    );
  }

  function Reveal({ for: id, children }: { for: string; children: ReactNode }) {
    const ex = lesson.byId.get(id);
    if (!ex) return <Problem>a reveal waits for {id}, which does not exist.</Problem>;
    if (states.get(id)?.done) return <div className="reveal">{children}</div>;
    return (
      <div className="not-prose my-8 flex items-center gap-3 rounded-xl border border-dashed border-rule-strong bg-surface/60 px-4 py-4 font-sans text-sm text-ink-muted">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-inset text-ink-muted">
          <LockIcon className="size-4" />
        </span>
        <span>
          The next part opens once you have answered{" "}
          {ex.title ? (
            <a href={`#exercise-${id}`} className="font-semibold text-ink underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
              {ex.title}
            </a>
          ) : (
            "the exercise above"
          )}
          .
        </span>
      </div>
    );
  }

  function Reteach({ for: id, children }: { for: string; children: ReactNode }) {
    const s = states.get(id);
    if (!lesson.byId.has(id)) return <Problem>a re-teach follows {id}, which does not exist.</Problem>;
    if (!s?.done || s.solved) return null;
    return (
      <aside className="not-prose my-8 flex gap-3 rounded-lg border border-hint/30 bg-hint-soft py-3 pr-4 pl-3 font-sans text-base leading-relaxed">
        <span aria-hidden="true" className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-hint">
          <HintIcon className="size-3.5" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-sm font-semibold text-hint">A short re-teach</p>
          <div className="text-ink [&>*+*]:mt-2">{children}</div>
        </div>
      </aside>
    );
  }

  /** A scale line whose ordinary-scale view waits for an exercise, so the view cannot answer it. */
  function ScaleLineSlot({ linearAfter, ...props }: ComponentProps<typeof ScaleLine> & { linearAfter?: string }) {
    if (linearAfter && !lesson.byId.has(linearAfter)) {
      return <Problem>a scale line waits for {linearAfter}, which does not exist.</Problem>;
    }
    return <ScaleLine {...props} linearLocked={linearAfter ? !states.get(linearAfter)?.done : false} />;
  }

  /** What a figure's locked part waits for, said with the exercise's title. */
  function opensNote(id: string, what: string) {
    const title = lesson.byId.get(id)?.title;
    return `${what} opens once you have answered ${title ? `"${title}"` : "the question below"}.`;
  }

  /** A staircase whose turned copy waits for an exercise, so the copy cannot answer it. */
  function StaircaseSlot({ turnedAfter, ...props }: ComponentProps<typeof Staircase> & { turnedAfter?: string }) {
    if (turnedAfter && !lesson.byId.has(turnedAfter)) {
      return <Problem>a staircase waits for {turnedAfter}, which does not exist.</Problem>;
    }
    return (
      <Staircase
        {...props}
        turnedLocked={turnedAfter ? !states.get(turnedAfter)?.done : false}
        lockedNote={turnedAfter ? opensNote(turnedAfter, "More of the figure") : undefined}
      />
    );
  }

  /** Partial sums whose marker of where the sum is heading waits for an exercise. */
  function PartialSumsSlot({ limitAfter, ...props }: ComponentProps<typeof PartialSums> & { limitAfter?: string }) {
    if (limitAfter && !lesson.byId.has(limitAfter)) {
      return <Problem>a partial-sums figure waits for {limitAfter}, which does not exist.</Problem>;
    }
    return (
      <PartialSums
        {...props}
        limitLocked={limitAfter ? !states.get(limitAfter)?.done : false}
        lockedNote={limitAfter ? opensNote(limitAfter, "The marker") : undefined}
      />
    );
  }

  function MixedCheck() {
    if (phase !== "explain") return <Problem>the mixed check belongs in the Explain phase.</Problem>;
    const items = ctx.check?.items ?? [];
    if (items.length === 0) {
      return (
        <p className="not-prose my-6 rounded-md border border-dashed border-rule-strong px-4 py-3 font-sans text-sm text-ink-muted">
          There are no review questions to mix in yet, so this lesson has no mixed check.
        </p>
      );
    }
    const answered = new Map((ctx.check?.attempts ?? []).filter((a) => a.cardId).map((a) => [a.cardId!, a]));
    const done = items.filter((i) => answered.has(i.cardId)).length;
    return (
      <section aria-labelledby="mixed-check" className="not-prose my-12 flex flex-col gap-2 font-sans">
        <p className="text-sm font-semibold text-accent">
          <span className="tabular">{done}</span> of {items.length} answered
        </p>
        <h2 id="mixed-check" className="scroll-mt-32 text-2xl font-semibold tracking-tight text-ink">
          Mixed check
        </h2>
        <p className="text-base text-ink-muted">
          {items.length} questions{" "}
          {items.every((i) => i.cardId.startsWith(`${lesson.code}/`))
            ? "on this lesson's ideas"
            : "on this lesson's ideas and earlier ones"}
          , in no particular order. Part of the work is recognising which idea each one needs.{" "}
          <span className="tabular">{done}</span> of {items.length} answered.
        </p>
        {items.map((item) => {
          const ref = /^([MLE]\d{1,2}\.\d{1,2})\/([a-z0-9-]+)$/.exec(item.cardId);
          const source = ref ? loadLesson(ref[1]!) : null;
          const ex = ref ? source?.byId.get(ref[2]!) : undefined;
          if (!source || !ex) return null;
          const a = answered.get(item.cardId);
          const view = variantView(
            source,
            ex,
            item.variant,
            { mode: "check", cardId: item.cardId, variant: item.variant, lessonCode: lesson.code },
            a ? { done: true, correct: a.correct } : null,
          );
          return view ? <ExerciseCard key={item.cardId} view={view} /> : null;
        })}
      </section>
    );
  }

  return {
    Exercise: ExerciseSlot,
    Reveal,
    Reteach,
    MixedCheck,
    Note,
    Stated,
    Definition,
    Callback,
    Foreshadow,
    Sym,
    Steps,
    Step,
    Figure,
    ScaleLine: ScaleLineSlot,
    FunctionPlot,
    ExpressionTree,
    MappingDiagram,
    ProgramTrace,
    Staircase: StaircaseSlot,
    PartialSums: PartialSumsSlot,
    FloatLine,
  };
}
