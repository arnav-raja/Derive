"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

import { saveSettings, type SettingsFormState } from "./actions";

type Values = {
  displayName: string;
  weeklyHours: number;
  dailyTutorBudgetUsd: number;
  monthlyComputeBudgetUsd: number;
};

export function SettingsForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(saveSettings, null);

  return (
    <form action={action} className="flex flex-col gap-6">
      {state?.error ? (
        <Notice tone="incorrect" title="Not saved" role="alert">
          {state.error}
        </Notice>
      ) : null}
      {state?.saved ? (
        <Notice tone="correct" title="Saved" role="status">
          Your settings are updated.
        </Notice>
      ) : null}

      <TextField
        label="Name"
        name="displayName"
        autoComplete="given-name"
        defaultValue={values.displayName}
        hint="Optional. The tutor uses it sparingly."
      />
      <TextField
        label="Study hours a week"
        name="weeklyHours"
        type="number"
        inputMode="decimal"
        min={1}
        max={60}
        step={0.5}
        required
        defaultValue={values.weeklyHours}
        hint="At 10 hours, three new lessons start each week. Fewer hours means fewer lessons, never a faster pace."
      />
      <TextField
        label="Tutor budget a day, in US dollars"
        name="dailyTutorBudgetUsd"
        type="number"
        inputMode="decimal"
        min={0}
        max={20}
        step={0.25}
        required
        defaultValue={values.dailyTutorBudgetUsd}
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
        defaultValue={values.monthlyComputeBudgetUsd}
        hint="For CPU and GPU jobs from stage 2 onwards. Jobs that would pass it ask you first."
      />
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
