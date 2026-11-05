"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getStore } from "@/lib/auth";

export type SettingsField = "displayName" | "weeklyHours" | "dailyTutorBudgetUsd" | "monthlyComputeBudgetUsd";

/** A failed save names the field at fault, so the form can mark it. */
export type SettingsFormState = { error?: string; field?: SettingsField; saved?: boolean } | null;

const settings = z.object({
  displayName: z.string().trim().max(80),
  weeklyHours: z.coerce
    .number({ message: "Enter a number of hours." })
    .min(1, { message: "Use at least 1 hour a week." })
    .max(60, { message: "Use at most 60 hours a week." }),
  dailyTutorBudgetUsd: z.coerce
    .number({ message: "Enter an amount in US dollars." })
    .min(0, { message: "The budget cannot be negative." })
    .max(20, { message: "Use at most $20 a day." }),
  monthlyComputeBudgetUsd: z.coerce
    .number({ message: "Enter an amount in US dollars." })
    .min(0, { message: "The budget cannot be negative." })
    .max(100, { message: "Use at most $100 a month." }),
});

export async function saveSettings(
  _prev: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const parsed = settings.safeParse({
    displayName: formData.get("displayName") ?? "",
    weeklyHours: formData.get("weeklyHours"),
    dailyTutorBudgetUsd: formData.get("dailyTutorBudgetUsd"),
    monthlyComputeBudgetUsd: formData.get("monthlyComputeBudgetUsd"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    return {
      error: issue?.message ?? "Check the values.",
      field: typeof field === "string" && field in settings.shape ? (field as SettingsField) : undefined,
    };
  }
  const store = await getStore();
  await store.updateLearner({
    displayName: parsed.data.displayName || null,
    weeklyHours: Math.round(parsed.data.weeklyHours * 2) / 2,
    dailyTutorBudgetUsd: Math.round(parsed.data.dailyTutorBudgetUsd * 100) / 100,
    monthlyComputeBudgetUsd: Math.round(parsed.data.monthlyComputeBudgetUsd * 100) / 100,
  });
  revalidatePath("/", "layout");
  return { saved: true };
}
