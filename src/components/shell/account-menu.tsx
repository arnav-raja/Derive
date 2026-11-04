"use client";

import { DropdownMenu } from "radix-ui";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { signOut } from "@/app/(auth)/actions";
import { ChevronDownIcon } from "@/components/ui/icons";
import type { ThemePreference } from "@/lib/store/types";

import { applyTheme, readTheme } from "./theme";

const subscribe = () => () => {};

const itemClasses =
  "flex h-9 cursor-default items-center rounded-sm px-2 text-sm text-ink outline-none select-none data-[highlighted]:bg-inset";

export function AccountMenu({ email }: { email: string | null }) {
  // The saved theme is only known in the browser.
  const initial = useSyncExternalStore(subscribe, readTheme, () => "system" as ThemePreference);
  const [theme, setTheme] = useState<ThemePreference | null>(null);
  const current = theme ?? initial;

  function choose(value: string) {
    const next = value as ThemePreference;
    setTheme(next);
    applyTheme(next);
  }

  const initialLetter = (email ?? "?").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-ink-muted hover:bg-inset hover:text-ink"
        aria-label="Account and settings"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {initialLetter}
        </span>
        <ChevronDownIcon className="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-56 rounded-md border border-rule bg-surface p-1 shadow-md"
        >
          {email ? (
            <>
              <DropdownMenu.Label className="truncate px-2 py-2 text-xs text-ink-muted">
                {email}
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-rule" />
            </>
          ) : null}
          <DropdownMenu.Item asChild className={itemClasses}>
            <Link href="/settings">Settings</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <DropdownMenu.Label className="px-2 pt-2 pb-1 text-xs text-ink-muted">Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={current} onValueChange={choose}>
            {(
              [
                ["system", "Match this device"],
                ["light", "Light"],
                ["dark", "Dark"],
              ] as const
            ).map(([value, label]) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                className={`${itemClasses} justify-between`}
                onSelect={(event) => event.preventDefault()}
              >
                {label}
                <DropdownMenu.ItemIndicator className="text-xs font-medium text-accent">
                  On
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <form action={signOut}>
            <DropdownMenu.Item asChild className={itemClasses}>
              <button type="submit" className="w-full text-left">
                Sign out
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
