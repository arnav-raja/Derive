import type { Metadata } from "next";

import { Page, PageHeader, Panel } from "@/components/ui/page";
import { getStore } from "@/lib/auth";

import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const store = await getStore();
  const learner = await store.learner();

  return (
    <Page width="narrow">
      <PageHeader title="Settings" description={learner.email ?? undefined} />
      <Panel>
        <SettingsForm
          values={{
            displayName: learner.displayName ?? "",
            weeklyHours: learner.weeklyHours,
            dailyTutorBudgetUsd: learner.dailyTutorBudgetUsd,
            monthlyComputeBudgetUsd: learner.monthlyComputeBudgetUsd,
          }}
        />
      </Panel>
    </Page>
  );
}
