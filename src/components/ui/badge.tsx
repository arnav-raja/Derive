import { clsx } from "clsx";
import type { ReactNode } from "react";

/*
 * Small labels: a lesson's state, a subject, a count. A state badge always
 * carries its word, so colour is never the only signal.
 */

export type BadgeTone = "neutral" | "accent" | "correct" | "incorrect" | "hint" | "warning" | "outline";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-inset text-ink-muted",
  accent: "bg-accent-soft text-accent",
  correct: "bg-correct-soft text-correct",
  incorrect: "bg-incorrect-soft text-incorrect",
  hint: "bg-hint-soft text-hint",
  warning: "bg-warning-soft text-warning",
  outline: "border border-rule-strong text-ink-muted",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  size = "sm",
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  size?: "xs" | "sm";
}) {
  return (
    <span
      className={clsx(
        "inline-flex max-w-full shrink-0 items-center gap-1 rounded-full font-semibold whitespace-nowrap",
        size === "xs" ? "h-5 px-2 text-xs" : "h-6 px-2.5 text-xs",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

/** A count beside a navigation item, such as the reviews due. */
export function CountBadge({ count, label, tone = "accent" }: { count: number; label: string; tone?: "accent" | "neutral" }) {
  if (count <= 0) return null;
  return (
    <span
      className={clsx(
        "tabular inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
        tone === "accent" ? "bg-accent text-on-accent" : "bg-inset text-ink-muted",
      )}
    >
      {count > 99 ? "99+" : count}
      <span className="sr-only"> {label}</span>
    </span>
  );
}

/** A keyboard key, for shortcuts shown beside a button. */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-rule-strong bg-surface px-1 font-sans text-xs font-medium text-ink-muted">
      {children}
    </kbd>
  );
}
