"use client";

import { clsx } from "clsx";
import { DropdownMenu } from "radix-ui";
import Link from "next/link";

import { signOut } from "@/app/(auth)/actions";
import { CheckIcon, ChevronDownIcon, LogOutIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from "@/components/ui/icons";
import type { ThemePreference } from "@/lib/store/types";

import { applyTheme, useThemePreference } from "./theme";

const itemClasses =
  "flex h-9 cursor-default items-center gap-2.5 rounded-sm px-2 text-sm text-ink outline-none select-none data-[highlighted]:bg-inset [&>svg]:size-4 [&>svg]:text-ink-muted";

function Avatar({ letter, size = "md" }: { letter: string; size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-on-accent",
        size === "sm" ? "size-8 text-sm" : "size-9 text-sm",
      )}
    >
      {letter}
    </span>
  );
}

const THEMES = [
  ["system", "Match this device", MonitorIcon],
  ["light", "Light", SunIcon],
  ["dark", "Dark", MoonIcon],
] as const;

export function AccountMenu({
  email,
  name,
  variant = "sidebar",
}: {
  email: string | null;
  name: string | null;
  /** The sidebar shows the name beside the avatar; the phone top bar shows the avatar alone. */
  variant?: "sidebar" | "compact";
}) {
  const current = useThemePreference();

  function choose(value: string) {
    applyTheme(value as ThemePreference);
  }

  const label = name?.trim() || "Your account";
  const letter = (name?.trim() || email || "?").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={clsx(
          "flex items-center gap-3 rounded-md text-left transition-colors hover:bg-inset",
          variant === "sidebar" ? "w-full p-2" : "p-1",
        )}
        aria-label="Account, theme and sign out"
      >
        <Avatar letter={letter} size={variant === "compact" ? "sm" : "md"} />
        {variant === "sidebar" ? (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold text-ink">{label}</span>
              {email ? <span className="truncate text-xs text-ink-muted">{email}</span> : null}
            </span>
            <ChevronDownIcon className="size-4 shrink-0 text-ink-faint" />
          </>
        ) : null}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={variant === "sidebar" ? "start" : "end"}
          side={variant === "sidebar" ? "top" : "bottom"}
          sideOffset={8}
          className="z-50 min-w-60 rounded-lg border border-rule bg-surface p-1.5 shadow-lg"
        >
          {email ? (
            <>
              <DropdownMenu.Label className="flex flex-col px-2 py-2">
                <span className="text-sm font-semibold text-ink">{label}</span>
                <span className="truncate text-xs text-ink-muted">{email}</span>
              </DropdownMenu.Label>
              <DropdownMenu.Separator className="my-1 h-px bg-rule" />
            </>
          ) : null}
          <DropdownMenu.Item asChild className={itemClasses}>
            <Link href="/settings">
              <SettingsIcon />
              Settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <DropdownMenu.Label className="px-2 pt-2 pb-1 text-xs font-semibold text-ink-muted">Theme</DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={current} onValueChange={choose}>
            {THEMES.map(([value, text, Icon]) => (
              <DropdownMenu.RadioItem key={value} value={value} className={itemClasses} onSelect={(event) => event.preventDefault()}>
                <Icon />
                <span className="flex-1">{text}</span>
                <DropdownMenu.ItemIndicator>
                  <CheckIcon className="size-4 text-accent" title="Chosen" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
          <DropdownMenu.Separator className="my-1 h-px bg-rule" />
          <form action={signOut}>
            <DropdownMenu.Item asChild className={itemClasses}>
              <button type="submit" className="w-full text-left">
                <LogOutIcon />
                Sign out
              </button>
            </DropdownMenu.Item>
          </form>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
