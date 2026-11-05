"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";

import { TutorDock, TutorSheet, TutorToggle, useTutor, useWide } from "@/components/tutor/tutor";
import { Button } from "@/components/ui/button";
import { CheckIcon, CrossIcon, LockIcon, PanelLeftIcon } from "@/components/ui/icons";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
import type { PhaseState } from "@/lib/learning/state";
import type { PhaseId } from "@/lib/store/types";
import { useMedia, usePreference } from "@/lib/use-preference";

import { PHASE_ICONS } from "./phase-icons";

/*
 * The lesson workspace: a full-screen frame for working through a phase,
 * like an editor rather than a web page. A bar across the top holds the way
 * out, the lesson and the six phases; the outline sits on the left, the
 * reading in the middle with its own footer, and the tutor on the right.
 * Both side panels fold away, and the choice is remembered.
 */

export type WorkspacePhase = {
  id: PhaseId;
  title: string;
  state: PhaseState;
  /** Where the phase opens, or null while it is locked. */
  href: string | null;
};

const STATE_WORDS: Record<PhaseState, string> = { completed: "completed", started: "in progress", available: "ready", locked: "locked" };

function StepDot({ phase, here }: { phase: WorkspacePhase; here: boolean }) {
  const Icon = PHASE_ICONS[phase.id];
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors [&>svg]:size-3.5",
        here
          ? "border-accent bg-accent text-on-accent shadow-xs"
          : phase.state === "completed"
            ? "border-correct/40 bg-correct-soft text-correct"
            : phase.state === "started"
              ? "border-accent bg-surface text-accent"
              : phase.state === "available"
                ? "border-rule-strong bg-surface text-ink-muted"
                : "border-rule bg-inset text-ink-faint",
      )}
    >
      {phase.state === "completed" && !here ? <CheckIcon strokeWidth={2.25} /> : phase.state === "locked" ? <LockIcon /> : <Icon />}
    </span>
  );
}

/** The six phases as steps joined by a line, the current one named. */
export function PhaseStepper({ phases, current, className }: { phases: WorkspacePhase[]; current: PhaseId; className?: string }) {
  return (
    <nav aria-label="Phases of this lesson" className={className}>
      <ol className="flex items-center">
        {phases.map((p, i) => {
          const here = p.id === current;
          const body = (
            <>
              <StepDot phase={p} here={here} />
              <span className={clsx("text-sm font-semibold whitespace-nowrap", here ? "text-ink max-[25rem]:sr-only" : "sr-only")}>
                {p.title}
                <span className="sr-only">
                  , phase {i + 1} of {phases.length}, {STATE_WORDS[p.state]}
                </span>
              </span>
            </>
          );
          return (
            <li key={p.id} className="flex items-center">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={clsx("h-0.5 w-3 rounded-full sm:w-5", phases[i - 1]!.state === "completed" ? "bg-correct/50" : "bg-rule-strong")}
                />
              ) : null}
              {p.href ? (
                <Link
                  href={p.href}
                  aria-current={here ? "step" : undefined}
                  title={here ? undefined : `${p.title}: ${STATE_WORDS[p.state]}`}
                  className={clsx("flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-inset", here && "pr-3 max-[25rem]:pr-0.5")}
                >
                  {body}
                </Link>
              ) : (
                <span title={`${p.title}: locked`} className={clsx("flex items-center gap-2 p-0.5", here && "pr-3 max-[25rem]:pr-0.5")}>
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function LessonWorkspace({
  code,
  lessonTitle,
  phases,
  current,
  outline,
  footer,
  showTutor,
  children,
}: {
  code: string;
  lessonTitle: string;
  phases: WorkspacePhase[];
  current: PhaseId;
  outline: ReactNode;
  footer?: ReactNode;
  /** The tutor joins once the phase is under way. */
  showTutor: boolean;
  children: ReactNode;
}) {
  const tutor = useTutor();
  const wide = useWide();
  const xl = useMedia("(min-width: 1280px)", true);
  const [outlineOpen, setOutlineOpen] = usePreference("derive:outline-open", true);
  const [drawer, setDrawer] = useState(false);
  const index = phases.findIndex((p) => p.id === current);
  const style = SUBJECT_STYLE[subjectOf(code)];

  const tutorShown = showTutor && wide && (tutor?.docked ?? false);
  const outlineShown = xl && outlineOpen;
  const columns = outlineShown
    ? tutorShown
      ? "lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[17rem_minmax(0,1fr)_24rem]"
      : "xl:grid-cols-[17rem_minmax(0,1fr)]"
    : tutorShown
      ? "lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]"
      : null;

  return (
    <div className="min-h-dvh bg-paper">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to the lesson
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-surface/95 backdrop-blur">
        <div className="grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 sm:px-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <div className="flex min-w-0 items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm">
              <Link href={`/lessons/${code}`} aria-label="Leave the workspace" title="Leave the workspace">
                <CrossIcon className="size-4" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => (xl ? setOutlineOpen(!outlineOpen) : setDrawer(true))}
              aria-label={xl && outlineOpen ? "Hide the outline" : "Show the outline"}
              aria-pressed={xl ? outlineOpen : undefined}
              title="Outline"
            >
              <PanelLeftIcon className="size-4" />
            </Button>
            <span aria-hidden="true" className="mx-1.5 h-6 w-px bg-rule" />
            <Link href={`/lessons/${code}`} className="flex min-w-0 flex-col rounded-md">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
                <span className={clsx("tabular", style.text)}>{code}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Phase {index + 1} of {phases.length}
                </span>
              </span>
              <span className="truncate text-sm font-semibold text-ink">{lessonTitle}</span>
            </Link>
          </div>
          <PhaseStepper phases={phases} current={current} className="hidden md:block" />
          <div className="flex items-center justify-end gap-2">{showTutor ? <TutorToggle /> : null}</div>
        </div>
        <div className="flex justify-center border-t border-rule px-3 py-2 md:hidden">
          <PhaseStepper phases={phases} current={current} />
        </div>
      </header>

      <div className={clsx("grid grid-cols-1", columns)}>
        {outlineShown ? (
          <aside aria-label="Outline" className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] overflow-y-auto border-r border-rule bg-surface xl:block">
            {outline}
          </aside>
        ) : null}
        <div className="flex min-h-[calc(100dvh-3.5rem)] min-w-0 flex-col">
          <main id="main" className="flex-1">
            {children}
          </main>
          {footer ? <div className="sticky bottom-0 z-20">{footer}</div> : null}
        </div>
        {tutorShown ? (
          <div className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] border-l border-rule bg-surface lg:block">
            <TutorDock />
          </div>
        ) : null}
      </div>

      {showTutor ? <TutorSheet /> : null}

      <Dialog.Root open={drawer && !xl} onOpenChange={setDrawer}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-xs" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-y-0 left-0 z-50 flex w-80 max-w-[85vw] flex-col border-r border-rule bg-surface shadow-lg"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-rule px-4">
              <Dialog.Title className="text-sm font-semibold text-ink">Outline</Dialog.Title>
              <Dialog.Close asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Close the outline">
                  <CrossIcon className="size-4" />
                </Button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto" onClick={(e) => (e.target as HTMLElement).closest("a") && setDrawer(false)}>
              {outline}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
