import { clsx } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { ArrowLeftIcon, ArrowRightIcon, InfoIcon, WarningIcon } from "@/components/ui/icons";
import { lesson as lessonMeta } from "@/lib/curriculum/data";

/*
 * The prose components a lesson's MDX may use. They are plain server
 * components: structure and emphasis, no state.
 */

const ASIDE_ICONS = { neutral: InfoIcon, accent: ArrowRightIcon, warning: WarningIcon, back: ArrowLeftIcon } as const;

function Aside({
  label,
  tone = "neutral",
  icon = tone,
  children,
}: {
  label: ReactNode;
  tone?: "neutral" | "accent" | "warning";
  icon?: keyof typeof ASIDE_ICONS;
  children: ReactNode;
}) {
  const Icon = ASIDE_ICONS[icon];
  return (
    <aside
      className={clsx(
        "not-prose flex gap-3 rounded-lg border py-3 pr-4 pl-3 font-sans text-base leading-relaxed",
        tone === "neutral" && "border-rule bg-inset/70",
        tone === "accent" && "border-accent/25 bg-accent-soft",
        tone === "warning" && "border-warning/30 bg-warning-soft",
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full [&>svg]:size-3.5",
          tone === "neutral" && "bg-surface text-ink-muted",
          tone === "accent" && "bg-surface text-accent",
          tone === "warning" && "bg-surface text-warning",
        )}
      >
        <Icon strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            "mb-1 text-sm font-semibold",
            tone === "neutral" && "text-ink",
            tone === "accent" && "text-accent",
            tone === "warning" && "text-warning",
          )}
        >
          {label}
        </p>
        <div className="prose-derive-inner text-ink [&>*+*]:mt-2">{children}</div>
      </div>
    </aside>
  );
}

/** An aside: a remark, a caution or a check worth doing. */
/** A table in lesson text. A wide one scrolls sideways in its own box on a phone, not the page. */
export function Table(props: ComponentProps<"table">) {
  return (
    <div className="table-scroll">
      <table {...props} />
    </div>
  );
}

export function Note({ title = "Note", children }: { title?: string; children: ReactNode }) {
  return <Aside label={title}>{children}</Aside>;
}

/**
 * A result used here without proof. Derive says so plainly, and says where it
 * is proved, so nothing is taken on trust silently.
 */
export function Stated({ where, children }: { where?: string; children: ReactNode }) {
  const meta = where ? lessonMeta(where) : null;
  return (
    <Aside
      tone="warning"
      label={
        where ? (
          <>
            Stated here, proved in{" "}
            <Link href={`/lessons/${where}`} className="underline underline-offset-2">
              {where}
              {meta ? ` ${meta.title}` : ""}
            </Link>
          </>
        ) : (
          "Stated here without proof"
        )
      }
    >
      {children}
    </Aside>
  );
}

/** The name, given after the idea has been met. */
export function Definition({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="not-prose overflow-hidden rounded-lg border border-accent/30 bg-surface font-sans shadow-xs">
      <p className="flex items-center gap-2 border-b border-accent/20 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">
        <span className="text-xs font-semibold text-accent">Definition</span>
        <span aria-hidden="true">·</span>
        {term}
      </p>
      <div className="px-4 py-3 text-base leading-relaxed text-ink [&>*+*]:mt-2">{children}</div>
    </div>
  );
}

function LessonRef({ code }: { code: string }) {
  const meta = lessonMeta(code);
  return (
    <span>
      {code}
      {meta ? ` ${meta.title}` : ""}
    </span>
  );
}

/** A thread back to an earlier lesson. */
export function Callback({ lesson, children }: { lesson: string; children: ReactNode }) {
  return (
    <Aside icon="back" label={<>From <LessonRef code={lesson} /></>}>
      {children}
    </Aside>
  );
}

/** A thread forward to a later lesson. */
export function Foreshadow({ lesson, children }: { lesson: string; children: ReactNode }) {
  return (
    <Aside tone="accent" label={<>Later, in <LessonRef code={lesson} /></>}>
      {children}
    </Aside>
  );
}

/**
 * A symbol in the text linked to the same symbol in equations and figures:
 * hovering or focusing one highlights all of them.
 */
export function Sym({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span data-sym={id} tabIndex={0} className="sym rounded-sm">
      {children}
    </span>
  );
}

/** A worked chain of steps, each with its reason. */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="not-prose flex list-none flex-col gap-2 pl-0 font-sans">{children}</ol>;
}

export function Step({ why, children }: { why?: string; children: ReactNode }) {
  return (
    // The mathematics keeps its natural width and never breaks across lines. The reason sits beside
    // it when there is room and moves below it when there is not, so a long reason never squeezes
    // the mathematics; a step wider than the page scrolls within its own row.
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-lg border border-rule bg-surface px-4 py-2 shadow-xs">
      <div className="max-w-full overflow-x-auto overflow-y-hidden py-1 text-base whitespace-nowrap text-ink">{children}</div>
      {why ? <p className="min-w-48 flex-1 text-sm text-ink-muted sm:text-right">{why}</p> : null}
    </li>
  );
}

/** The frame around a figure: a title, the figure, and a description in words. */
export function Figure({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <figure className="not-prose my-10 flex flex-col overflow-hidden rounded-xl border border-rule bg-surface font-sans shadow-xs">
      <p className="border-b border-rule px-4 py-3 text-base font-semibold text-ink sm:px-5">{title}</p>
      <div className="flex flex-col gap-3 p-4 sm:p-5">
        {children}
        {caption ? <figcaption className="text-sm leading-relaxed text-ink-muted">{caption}</figcaption> : null}
      </div>
    </figure>
  );
}
