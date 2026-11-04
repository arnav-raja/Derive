import "server-only";

import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

import { ExerciseCard } from "@/components/exercise/exercise-card";
import { ExpressionTree, FunctionPlot, MappingDiagram, ProgramTrace, ScaleLine } from "@/components/figures";
import { LockIcon } from "@/components/ui/icons";
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
      <div id={`exercise-${id}`} className="scroll-mt-24">
        <ExerciseCard view={exerciseView(lesson, ex, states.get(id), hintsFrom(attempts, id))} />
      </div>
    );
  }

  function Reveal({ for: id, children }: { for: string; children: ReactNode }) {
    const ex = lesson.byId.get(id);
    if (!ex) return <Problem>a reveal waits for {id}, which does not exist.</Problem>;
    if (states.get(id)?.done) return <div className="reveal">{children}</div>;
    return (
      <p className="not-prose my-6 flex items-center gap-2 rounded-md border border-dashed border-rule-strong px-4 py-3 font-sans text-sm text-ink-muted">
        <LockIcon className="size-4 shrink-0" />
        <span>
          The next part opens once you have answered {ex.title ? <span className="font-medium text-ink">{ex.title}</span> : "the exercise above"}.
        </span>
      </p>
    );
  }

  function Reteach({ for: id, children }: { for: string; children: ReactNode }) {
    const s = states.get(id);
    if (!lesson.byId.has(id)) return <Problem>a re-teach follows {id}, which does not exist.</Problem>;
    if (!s?.done || s.solved) return null;
    return (
      <aside className="not-prose my-6 rounded-md border-l-2 border-hint bg-hint-soft py-3 pr-4 pl-4 font-sans text-base leading-relaxed">
        <p className="mb-1 text-xs font-semibold tracking-wide text-hint uppercase">A short re-teach</p>
        <div className="text-ink [&>*+*]:mt-2">{children}</div>
      </aside>
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
      <section aria-labelledby="mixed-check" className="not-prose my-10 flex flex-col gap-2 font-sans">
        <h2 id="mixed-check" className="font-serif text-2xl font-semibold text-ink">
          Mixed check
        </h2>
        <p className="text-base text-ink-muted">
          {items.length} questions, some from this lesson and some from earlier ones, in no particular order. Part of the work is
          recognising which idea each one needs. <span className="tabular">{done}</span> of {items.length} answered.
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
    ScaleLine,
    FunctionPlot,
    ExpressionTree,
    MappingDiagram,
    ProgramTrace,
  };
}
