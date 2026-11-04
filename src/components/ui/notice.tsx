import { clsx } from "clsx";
import type { ReactNode } from "react";

import { StateIcon } from "./icons";

export type NoticeTone = "info" | "correct" | "incorrect" | "hint" | "warning";

const tones: Record<NoticeTone, { box: string; text: string; word: string }> = {
  info: { box: "border-rule bg-inset", text: "text-ink-muted", word: "Note" },
  correct: { box: "border-correct/40 bg-correct-soft", text: "text-correct", word: "Correct" },
  incorrect: { box: "border-incorrect/40 bg-incorrect-soft", text: "text-incorrect", word: "Not yet" },
  hint: { box: "border-hint/40 bg-hint-soft", text: "text-hint", word: "Hint" },
  warning: { box: "border-warning/40 bg-warning-soft", text: "text-warning", word: "Check" },
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
    <div
      role={role}
      className={clsx("flex gap-3 rounded-md border px-4 py-3 text-sm text-ink", t.box, className)}
    >
      <StateIcon tone={tone} className={clsx("mt-0.5 size-4 shrink-0", t.text)} />
      <div className="min-w-0 flex-1">
        <p className={clsx("font-semibold", t.text)}>{title ?? t.word}</p>
        {children ? <div className="mt-1 text-ink">{children}</div> : null}
      </div>
    </div>
  );
}
