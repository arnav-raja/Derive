import { clsx } from "clsx";
import Link from "next/link";
import type { ReactNode } from "react";

import { lesson as lessonMeta } from "@/lib/curriculum/data";

/*
 * The prose components a lesson's MDX may use. They are plain server
 * components: structure and emphasis, no state.
 */

function Aside({
  label,
  tone = "neutral",
  children,
}: {
  label: ReactNode;
  tone?: "neutral" | "accent" | "warning";
  children: ReactNode;
}) {
  return (
    <aside
      className={clsx(
        "not-prose rounded-md border-l-2 py-3 pr-4 pl-4 font-sans text-base leading-relaxed",
        tone === "neutral" && "border-rule-strong bg-inset",
        tone === "accent" && "border-accent bg-accent-soft",
        tone === "warning" && "border-warning bg-warning-soft",
      )}
    >
      <p className="mb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
      <div className="prose-derive-inner text-ink [&>*+*]:mt-2">{children}</div>
    </aside>
  );
}

/** An aside: a remark, a caution or a check worth doing. */
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
            <Link href={`/map#${where}`} className="underline underline-offset-2">
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
    <div className="not-prose rounded-md border border-accent/40 bg-surface px-4 py-3 font-sans">
      <p className="text-sm font-semibold text-accent">{term}</p>
      <div className="mt-1 text-base leading-relaxed text-ink [&>*+*]:mt-2">{children}</div>
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
    <Aside label={<>From <LessonRef code={lesson} /></>}>
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
    <li className="grid grid-cols-1 gap-1 rounded-md border border-rule bg-surface px-4 py-2 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4">
      <div className="overflow-x-auto text-base text-ink">{children}</div>
      {why ? <p className="text-sm text-ink-muted">{why}</p> : null}
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
    <figure className="not-prose my-6 flex flex-col gap-3 rounded-lg border border-rule bg-surface p-4 font-sans sm:p-5">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children}
      {caption ? <figcaption className="text-sm text-ink-muted">{caption}</figcaption> : null}
    </figure>
  );
}
