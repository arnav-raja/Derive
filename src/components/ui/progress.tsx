import { clsx } from "clsx";
import type { ReactNode } from "react";

/*
 * Progress drawn two ways: a bar for a share of something, and a ring for a
 * single headline number. Both are meters to assistive technology, with the
 * value said in words beside them.
 */

type Tone = "accent" | "correct" | "warning" | "incorrect" | "subject-m" | "subject-l" | "subject-e";

const fills: Record<Tone, string> = {
  accent: "bg-accent",
  correct: "bg-correct",
  warning: "bg-warning",
  incorrect: "bg-incorrect",
  "subject-m": "bg-subject-m",
  "subject-l": "bg-subject-l",
  "subject-e": "bg-subject-e",
};

const strokes: Record<Tone, string> = {
  accent: "stroke-accent",
  correct: "stroke-correct",
  warning: "stroke-warning",
  incorrect: "stroke-incorrect",
  "subject-m": "stroke-subject-m",
  "subject-l": "stroke-subject-l",
  "subject-e": "stroke-subject-e",
};

function ratioOf(value: number, max: number) {
  return max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
}

export function ProgressBar({
  value,
  max,
  label,
  tone = "accent",
  size = "md",
  className,
  /** A second, lighter segment drawn after the first, such as work started but not finished. */
  secondary,
}: {
  value: number;
  max: number;
  label: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
  secondary?: number;
}) {
  const ratio = ratioOf(value, max);
  const extra = secondary ? ratioOf(secondary, max) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      className={clsx(
        "flex w-full overflow-hidden rounded-full bg-inset",
        size === "sm" && "h-1.5",
        size === "md" && "h-2",
        size === "lg" && "h-3",
        className,
      )}
    >
      <div className={clsx("h-full rounded-full transition-[width] duration-500", fills[tone])} style={{ width: `${ratio * 100}%` }} />
      {extra > 0 ? (
        <div className={clsx("h-full opacity-35", fills[tone])} style={{ width: `${Math.min(extra, 1 - ratio) * 100}%` }} />
      ) : null}
    </div>
  );
}

export function ProgressRing({
  value,
  max,
  label,
  tone = "accent",
  size = 56,
  stroke = 6,
  children,
}: {
  value: number;
  max: number;
  label: string;
  tone?: Tone;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const ratio = ratioOf(value, max);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-inset" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className={clsx("transition-[stroke-dashoffset] duration-700", strokes[tone], ratio === 0 && "opacity-0")}
        />
      </svg>
      {children ? <div className="absolute inset-0 flex items-center justify-center">{children}</div> : null}
    </div>
  );
}

/** Six (or any number of) segments, for the phases of a lesson. */
export function SegmentedProgress({
  segments,
  label,
  className,
}: {
  segments: ("done" | "current" | "todo")[];
  label: string;
  className?: string;
}) {
  const done = segments.filter((s) => s === "done").length;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={segments.length}
      aria-valuenow={done}
      className={clsx("flex w-full gap-1", className)}
    >
      {segments.map((s, i) => (
        <span
          key={i}
          className={clsx(
            "h-1.5 flex-1 rounded-full",
            s === "done" && "bg-correct",
            s === "current" && "bg-accent",
            s === "todo" && "bg-inset",
          )}
        />
      ))}
    </div>
  );
}
