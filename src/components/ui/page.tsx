import { clsx } from "clsx";
import type { ReactNode } from "react";

/** The standard page frame: a width, a gutter and vertical rhythm. */
export function Page({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "wide" | "narrow";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-4 py-8 sm:px-6 sm:py-10",
        width === "wide" ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        {eyebrow ? <p className="text-sm font-medium text-ink-muted">{eyebrow}</p> : null}
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-base text-ink-muted">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-rule bg-surface p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-rule-strong px-5 py-8 sm:px-8">
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {children ? <div className="max-w-xl text-sm text-ink-muted">{children}</div> : null}
      {action}
    </div>
  );
}

export function Meter({
  value,
  max,
  label,
  tone = "accent",
}: {
  value: number;
  max: number;
  label: string;
  tone?: "accent" | "warning" | "incorrect";
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-inset"
    >
      <div
        className={clsx(
          "h-full rounded-full",
          tone === "accent" && "bg-accent",
          tone === "warning" && "bg-warning",
          tone === "incorrect" && "bg-incorrect",
        )}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}
