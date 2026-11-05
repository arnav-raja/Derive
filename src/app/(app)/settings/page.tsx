import type { Metadata } from "next";

import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { LogOutIcon } from "@/components/ui/icons";
import { Page, PageHeader } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { curriculum } from "@/lib/curriculum/data";

import { SettingsForm, SettingsGroup } from "./settings-form";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const store = await getStore();
  const learner = await store.learner();
  const curriculumHours = curriculum().stages.reduce((a, s) => a + s.hours, 0);
  const name = learner.displayName?.trim() || null;
  const letter = (name || learner.email || "D").slice(0, 1).toUpperCase();

  return (
    <Page width="medium">
      <PageHeader eyebrow="Account" title="Settings" description="Your name, your study pace, what the tutor and compute may spend, and how Derive looks." />
      <div className="flex flex-col gap-6">
        <section
          aria-label="Your account"
          className="flex flex-col gap-4 rounded-lg border border-rule bg-surface p-5 shadow-xs sm:flex-row sm:items-center sm:p-6"
        >
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <span
              aria-hidden="true"
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-semibold text-on-accent"
            >
              {letter}
            </span>
            <div className="flex min-w-0 flex-col">
              <p className="truncate text-base font-semibold text-ink">{name ?? "Your account"}</p>
              <p className="truncate text-sm text-ink-muted">
                {learner.email ?? "Local mode: your work is kept on this computer."}
              </p>
            </div>
          </div>
          {learner.email ? (
            <form action={signOut}>
              <Button type="submit" variant="secondary">
                <LogOutIcon className="size-4" />
                Sign out
              </Button>
            </form>
          ) : null}
        </section>

        <SettingsForm
          curriculumHours={curriculumHours}
          values={{
            displayName: learner.displayName ?? "",
            weeklyHours: learner.weeklyHours,
            dailyTutorBudgetUsd: learner.dailyTutorBudgetUsd,
            monthlyComputeBudgetUsd: learner.monthlyComputeBudgetUsd,
          }}
        />

        <div className="overflow-hidden rounded-lg border border-rule bg-surface shadow-xs">
          <SettingsGroup title="Appearance" description="Applies at once, on this device only.">
            <ThemePicker />
          </SettingsGroup>
        </div>
      </div>
    </Page>
  );
}
