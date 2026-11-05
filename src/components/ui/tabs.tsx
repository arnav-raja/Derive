"use client";

import { clsx } from "clsx";
import { Tabs as RadixTabs } from "radix-ui";
import type { ReactNode } from "react";

/*
 * Tabs on Radix, styled as an underlined row. The panels are rendered on the
 * server and passed in, so switching tabs needs no request.
 */

export type TabSpec = { value: string; label: ReactNode; count?: number; content: ReactNode };

export function Tabs({
  tabs,
  defaultValue,
  label,
  className,
  trailing,
}: {
  tabs: TabSpec[];
  defaultValue?: string;
  label: string;
  className?: string;
  /** Something to show at the right end of the tab row, such as a key. */
  trailing?: ReactNode;
}) {
  return (
    <RadixTabs.Root defaultValue={defaultValue ?? tabs[0]?.value} className={clsx("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-3 border-b border-rule sm:flex-row sm:items-end sm:justify-between">
        <RadixTabs.List aria-label={label} className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <RadixTabs.Trigger
              key={t.value}
              value={t.value}
              className={clsx(
                "flex h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-3 text-sm font-semibold text-ink-muted transition-colors",
                "hover:text-ink data-[state=active]:border-accent data-[state=active]:text-ink",
              )}
            >
              {t.label}
              {t.count !== undefined ? (
                <span className="tabular rounded-full bg-inset px-2 py-0.5 text-xs font-semibold text-ink-muted">{t.count}</span>
              ) : null}
            </RadixTabs.Trigger>
          ))}
        </RadixTabs.List>
        {trailing ? <div className="pb-3">{trailing}</div> : null}
      </div>
      {tabs.map((t) => (
        <RadixTabs.Content key={t.value} value={t.value} className="outline-none">
          {t.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
