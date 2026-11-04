import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { EmptyState, Page, PageHeader, Panel, Section } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import type { NotebookEntry } from "@/lib/store/types";

import { resolveNote } from "./actions";
import { NoteForm } from "./note-form";

export const metadata: Metadata = { title: "Notebook" };

const KIND_LABEL: Record<NotebookEntry["kind"], string> = {
  gap: "Gap",
  question: "Question",
  misconception: "Misconception",
  explanation: "Explanation",
  confused: "This confused me",
};

const SOURCE_LABEL: Record<NotebookEntry["source"], string> = {
  learner: "You",
  tutor: "The tutor",
  system: "Derive",
};

function Entry({ entry }: { entry: NotebookEntry }) {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
  }).format(new Date(entry.createdAt));
  return (
    <li>
      <Panel className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="font-semibold text-ink">{KIND_LABEL[entry.kind]}</span>
          <span>{SOURCE_LABEL[entry.source]}</span>
          {entry.lessonCode ? <span className="tabular">{entry.lessonCode}</span> : null}
          <span className="tabular">{date}</span>
          {entry.status === "resolved" ? <span className="text-correct">Resolved</span> : null}
        </div>
        <p className="font-serif text-lg whitespace-pre-wrap text-ink">{entry.body}</p>
        {entry.status === "open" ? (
          <form action={resolveNote}>
            <input type="hidden" name="id" value={entry.id} />
            <Button type="submit" variant="ghost" size="sm">
              Mark as understood
            </Button>
          </form>
        ) : null}
      </Panel>
    </li>
  );
}

export default async function NotebookPage() {
  const store = await getStore();
  const entries = await store.notebook();
  const open = entries.filter((e) => e.status === "open");
  const resolved = entries.filter((e) => e.status === "resolved");

  return (
    <Page width="narrow">
      <PageHeader
        title="Notebook"
        description="Your notebook of things you do not know yet. You and the tutor add to it, and every open entry returns until you can explain it."
      />
      <div className="flex flex-col gap-10">
        <Panel>
          <NoteForm />
        </Panel>

        <Section title="Open">
          {open.length === 0 ? (
            <EmptyState title="No open questions">
              When something confuses you, write it down here, or press &ldquo;This confused
              me&rdquo; inside a lesson.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {open.map((e) => (
                <Entry key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </Section>

        {resolved.length ? (
          <Section title="Understood">
            <ul className="flex flex-col gap-3">
              {resolved.map((e) => (
                <Entry key={e.id} entry={e} />
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </Page>
  );
}
