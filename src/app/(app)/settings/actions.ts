"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getStore } from "@/lib/auth";

export type SettingsFormState = { error?: string; saved?: boolean } | null;

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
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the values." };
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
