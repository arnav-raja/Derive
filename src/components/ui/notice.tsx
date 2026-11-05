import { clsx } from "clsx";
import type { ReactNode } from "react";

import { StateIcon } from "./icons";

export type NoticeTone = "info" | "correct" | "incorrect" | "hint" | "warning";

const tones: Record<NoticeTone, { box: string; icon: string; text: string; word: string }> = {
  info: { box: "border-rule bg-inset", icon: "bg-surface text-ink-muted", text: "text-ink", word: "Note" },
  correct: { box: "border-correct/30 bg-correct-soft", icon: "bg-correct text-surface", text: "text-correct", word: "Correct" },
  incorrect: { box: "border-incorrect/30 bg-incorrect-soft", icon: "bg-incorrect text-surface", text: "text-incorrect", word: "Not yet" },
  hint: { box: "border-hint/30 bg-hint-soft", icon: "bg-hint text-surface", text: "text-hint", word: "Hint" },
  warning: { box: "border-warning/30 bg-warning-soft", icon: "bg-warning text-surface", text: "text-warning", word: "Check" },
};

type NoticeProps = {
  tone?: NoticeTone;
  /** The word that names the state. Colour is never the only signal. */
  title?: string;
  children?: ReactNode;
  className?: string;
  role?: "status" | "alert";
};

export function Notice({ tone = "info", title, children, className, role }: NoticeProps) {
  const t = tones[tone];
  return (
    <div role={role} className={clsx("flex gap-3 rounded-lg border px-4 py-3 text-sm text-ink", t.box, className)}>
      <span className={clsx("mt-px flex size-5 shrink-0 items-center justify-center rounded-full", t.icon)}>
        <StateIcon tone={tone} className="size-3.5" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={clsx("font-semibold", t.text)}>{title ?? t.word}</p>
        {children ? <div className="mt-1 text-ink">{children}</div> : null}
      </div>
    </div>
  );
}
