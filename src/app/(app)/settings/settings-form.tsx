"use client";

import { useActionState, useState, useTransition, type FormEvent, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { CheckIcon, ClockIcon, WarningIcon } from "@/components/ui/icons";
import { weeklyLessonLimit } from "@/lib/learning/governor";

import { saveSettings, type SettingsField, type SettingsFormState } from "./actions";

type Values = {
  displayName: string;
  weeklyHours: number;
  dailyTutorBudgetUsd: number;
  monthlyComputeBudgetUsd: number;
};

/** Digits grouped in threes (500,050), as everywhere in Derive. */
const n = (x: number) => x.toLocaleString("en-GB");

/** One group of settings: what it is on the left, its fields on the right. */
export function SettingsGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-muted">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  );
}

/** What a weekly figure means for the pace, worked out as it is typed. */
function PacePreview({ hours, curriculumHours }: { hours: number; curriculumHours: number }) {
  if (!Number.isFinite(hours) || hours < 1 || hours > 60) return null;
  const lessons = weeklyLessonLimit(hours);
  const months = Math.max(1, Math.round(curriculumHours / hours / 4.345));
  return (
    <div className="flex items-start gap-3 rounded-md bg-inset px-4 py-3" aria-live="polite">
      <ClockIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" />
      <p className="text-sm text-ink-muted">
        At {n(hours)} {hours === 1 ? "hour" : "hours"} a week, up to{" "}
        <span className="font-semibold text-ink">
          {lessons} new {lessons === 1 ? "lesson" : "lessons"} a week
        </span>{" "}
        can begin, and the whole curriculum takes about{" "}
        <span className="font-semibold text-ink">
          {n(months)} {months === 1 ? "month" : "months"}
        </span>
        .
      </p>
    </div>
  );
}

export function SettingsForm({ values, curriculumHours }: { values: Values; curriculumHours: number }) {
  const [state, dispatch, pending] = useActionState<SettingsFormState, FormData>(saveSettings, null);
  const [, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [hours, setHours] = useState(values.weeklyHours);

  // Submitting by hand keeps what was typed when a value is refused; a form
  // action would reset the fields to the saved values either way.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setDirty(false);
    startTransition(() => dispatch(data));
  }

  const errorFor = (field: SettingsField) => (state?.field === field ? state.error : undefined);

  let status: ReactNode;
  if (pending) {
    status = <span className="text-ink-muted">Saving your settings</span>;
  } else if (dirty) {
    status = <span className="text-ink-muted">You have changes that are not saved yet.</span>;
  } else if (state?.error) {
    status = (
      <span role="alert" className="flex items-center gap-1.5 font-medium text-incorrect">
        <WarningIcon className="size-4 shrink-0" />
        Not saved. {state.field ? "Check the field marked above." : state.error}
      </span>
    );
  } else if (state?.saved) {
    status = (
      <span role="status" className="flex items-center gap-1.5 font-medium text-correct">
        <CheckIcon className="size-4 shrink-0" strokeWidth={2.25} />
        Saved
      </span>
    );
  } else {
    status = <span className="text-ink-muted">Changes apply once you save them.</span>;
  }

  return (
    <form
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className="overflow-hidden rounded-lg border border-rule bg-surface shadow-xs"
    >
      <div className="divide-y divide-rule">
        <SettingsGroup title="Profile" description="How Derive and the tutor address you.">
          <TextField
            label="Name"
            name="displayName"
            autoComplete="given-name"
            maxLength={80}
            defaultValue={values.displayName}
            error={errorFor("displayName")}
            hint="Optional. The tutor uses it sparingly."
          />
        </SettingsGroup>

        <SettingsGroup
          title="Study pace"
          description="Derive sets how many new lessons may begin from the hours you give it. Fewer hours means fewer lessons, never a faster pace."
        >
          <TextField
            label="Study hours a week"
            name="weeklyHours"
            type="number"
            inputMode="decimal"
            min={1}
            max={60}
            step={0.5}
            required
            trailing="hours a week"
            defaultValue={values.weeklyHours}
            onChange={(e) => setHours(Number(e.currentTarget.value))}
            error={errorFor("weeklyHours")}
            className="max-w-32"
          />
          <PacePreview hours={hours} curriculumHours={curriculumHours} />
        </SettingsGroup>

        <SettingsGroup
          title="Budgets"
          description="Spending limits for the tutor and for compute jobs, in US dollars."
        >
          <TextField
            label="Tutor budget a day, in US dollars"
            name="dailyTutorBudgetUsd"
            type="number"
            inputMode="decimal"
            min={0}
            max={20}
            step={0.25}
            required
            leading="$"
            trailing="a day"
            defaultValue={values.dailyTutorBudgetUsd}
            error={errorFor("dailyTutorBudgetUsd")}
            className="max-w-28"
            hint="The tutor pauses for the day when it is reached. About $0.90 covers a two-hour session."
          />
          <TextField
            label="Compute budget a month, in US dollars"
            name="monthlyComputeBudgetUsd"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={1}
            required
            leading="$"
            trailing="a month"
            defaultValue={values.monthlyComputeBudgetUsd}
            error={errorFor("monthlyComputeBudgetUsd")}
            className="max-w-28"
            hint="For CPU and GPU jobs from stage 2 onwards. Jobs that would pass it ask you first."
          />
        </SettingsGroup>
      </div>

      <div className="flex flex-col gap-3 border-t border-rule bg-inset px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm">{status}</p>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? "Saving" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
