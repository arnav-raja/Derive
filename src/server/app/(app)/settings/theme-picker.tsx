"use client";

import { clsx } from "clsx";

import { applyTheme, useThemePreference } from "@/components/shell/theme";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import type { ThemePreference } from "@/lib/store/types";

const OPTIONS: { value: ThemePreference; label: string; detail: string; Icon: typeof SunIcon }[] = [
  { value: "system", label: "System", detail: "Follows this device", Icon: MonitorIcon },
  { value: "light", label: "Light", detail: "Light canvas, dark text", Icon: SunIcon },
  { value: "dark", label: "Dark", detail: "Dark canvas, light text", Icon: MoonIcon },
];

/**
 * A small drawing of the app in one theme, drawn with that theme's own tokens. On a phone it is
 * drawn smaller and tighter, so that every part of it fits its 96 by 64 pixel box.
 */
function Preview({ theme }: { theme: "light" | "dark" }) {
  return (
    <span data-preview={theme} className="flex h-full w-full bg-paper">
      <span className="flex w-1/4 flex-col gap-1 border-r border-rule bg-surface p-1 sm:gap-2 sm:p-2">
        <span className="h-2 w-3/4 rounded-full bg-accent" />
        <span className="h-1 w-full rounded-full bg-rule-strong" />
        <span className="h-1 w-2/3 rounded-full bg-rule-strong" />
        <span className="h-1 w-5/6 rounded-full bg-rule-strong" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1 p-1 sm:gap-2 sm:p-3">
        <span className="h-2 w-1/2 rounded-full bg-ink-faint" />
        <span className="flex flex-1 flex-col gap-1 rounded-sm border border-rule bg-surface p-1 sm:gap-2 sm:p-2">
          <span className="h-1 w-full rounded-full bg-rule-strong" />
          <span className="h-1 w-4/5 rounded-full bg-rule-strong" />
          <span className="mt-auto h-2 w-2/5 rounded-xs bg-accent sm:h-3 sm:w-10" />
        </span>
      </span>
    </span>
  );
}

export function ThemePicker() {
  const current = useThemePreference();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-semibold text-ink">Theme</legend>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {OPTIONS.map(({ value, label, detail, Icon }) => {
          const chosen = current === value;
          return (
            <label
              key={value}
              className={clsx(
                "flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border bg-surface p-2 transition-[border-color,box-shadow]",
                "sm:flex-col sm:items-stretch sm:gap-0 sm:p-0",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus",
                chosen ? "border-accent ring-1 ring-accent" : "border-rule-strong hover:border-ink-faint",
              )}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={chosen}
                onChange={() => applyTheme(value)}
                className="sr-only"
              />
              <span
                aria-hidden="true"
                className="relative block h-16 w-24 shrink-0 overflow-hidden rounded-md border border-rule sm:h-24 sm:w-auto sm:rounded-none sm:border-0 sm:border-b"
              >
                {value === "system" ? (
                  <>
                    <Preview theme="light" />
                    <span className="absolute inset-0 [clip-path:inset(0_0_0_50%)]">
                      <Preview theme="dark" />
                    </span>
                  </>
                ) : (
                  <Preview theme={value} />
                )}
              </span>
              <span className="flex min-w-0 flex-1 items-start gap-2 sm:p-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Icon className="size-4 shrink-0 text-ink-muted" />
                    {label}
                  </span>
                  <span className="text-xs text-ink-muted">{detail}</span>
                </span>
                {chosen ? <CheckIcon className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2.25} title="Chosen" /> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
