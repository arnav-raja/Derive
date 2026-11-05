import { clsx } from "clsx";
import type { ReactNode } from "react";

import { ProgressBar } from "./progress";

/** The standard page frame: a width, a gutter and vertical rhythm. */
export function Page({
  children,
  width = "wide",
  className,
}: {
  children: ReactNode;
  width?: "wide" | "medium" | "narrow" | "full";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-4 py-6 sm:px-8 sm:py-10",
        width === "wide" && "max-w-6xl",
        width === "medium" && "max-w-4xl",
        width === "narrow" && "max-w-3xl",
        width === "full" && "max-w-[96rem]",
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
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          {eyebrow ? <div className="text-sm font-medium text-ink-muted">{eyebrow}</div> : null}
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">{title}</h1>
          {description ? <p className="max-w-2xl text-base text-ink-muted">{description}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx("flex flex-col gap-4", className)}>
      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
          {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** A white card on the canvas: the basic container of every page. */
export function Panel({
  children,
  className,
  padding = "md",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={clsx(
        "rounded-lg border border-rule bg-surface shadow-xs",
        padding === "sm" && "p-4",
        padding === "md" && "p-5 sm:p-6",
        padding === "lg" && "p-6 sm:p-8",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** A card's title row: a heading, a line under it and an action on the right. */
export function PanelHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-inset text-ink-muted [&>svg]:size-4">
            {icon}
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-base font-semibold text-ink">{title}</h3>
          {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** One headline number with its label and a line of context. */
export function Stat({
  label,
  value,
  detail,
  icon,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1", className)}>
      <p className="flex items-center gap-1.5 text-sm font-medium text-ink-muted [&>svg]:size-4">
        {icon}
        {label}
      </p>
      <p className="tabular text-3xl font-semibold tracking-tight text-ink">{value}</p>
      {detail ? <p className="text-sm text-ink-muted">{detail}</p> : null}
    </div>
  );
}

/** A row of headline numbers in one card, split by hairlines. */
export function StatStrip({
  items,
  className,
}: {
  items: { label: ReactNode; value: ReactNode; detail?: ReactNode; icon?: ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-rule bg-rule shadow-xs",
        items.length >= 4 ? "lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : null,
        className,
      )}
    >
      {items.map((item, i) => (
        <Stat
          key={i}
          label={item.label}
          value={item.value}
          detail={item.detail}
          icon={item.icon}
          className={clsx("bg-surface p-4 sm:p-5", items.length === 3 && i === 2 && "col-span-2 sm:col-span-1")}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-rule-strong bg-surface/60 px-5 py-8 sm:px-8",
        className,
      )}
    >
      {icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-inset text-ink-muted [&>svg]:size-5">{icon}</span>
      ) : null}
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
  return <ProgressBar value={value} max={max} label={label} tone={tone} size="sm" />;
}
