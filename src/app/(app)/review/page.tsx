import type { Metadata } from "next";

import { EmptyState, Page, PageHeader } from "@/components/ui/page";
import { getStore } from "@/lib/auth";

export const metadata: Metadata = { title: "Review" };

export default async function ReviewPage() {
  const store = await getStore();
  const due = await store.cards({ dueBefore: new Date().toISOString() });

  return (
    <Page width="narrow">
      <PageHeader
        title="Review"
        description="Spaced questions from every lesson you have finished, mixed across all three curriculums."
      />
      {due.length === 0 ? (
        <EmptyState title="No reviews are due">
          Each idea you learn comes back as a fresh question at growing intervals, timed to just
          before you would forget it. The first ones appear the day after your first lesson.
        </EmptyState>
      ) : (
        <EmptyState title={`${due.length} reviews are due`}>
          Reviews open with the first lesson release.
        </EmptyState>
      )}
    </Page>
  );
}
