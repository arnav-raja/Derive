import { clsx } from "clsx";
import type { Metadata } from "next";
import Link from "next/link";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckIcon, NotebookIcon } from "@/components/ui/icons";
import { EmptyState, Page, PageHeader, Panel } from "@/components/ui/page";
import { Tabs } from "@/components/ui/tabs";
import { getStore } from "@/lib/auth";
import { lesson as lessonMeta } from "@/lib/curriculum/data";
import { SUBJECT_STYLE, subjectOf } from "@/lib/design/subject";
import type { NotebookEntry } from "@/lib/store/types";

import { resolveNote } from "./actions";
import { NoteForm } from "./note-form";

export const metadata: Metadata = { title: "Notebook" };

const KIND: Record<NotebookEntry["kind"], { label: string; tone: BadgeTone }> = {
  gap: { label: "Gap", tone: "warning" },
  question: { label: "Question", tone: "accent" },
  misconception: { label: "Misconception", tone: "incorrect" },
  explanation: { label: "Explanation", tone: "correct" },
  confused: { label: "This confused me", tone: "hint" },
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
  const meta = entry.lessonCode ? lessonMeta(entry.lessonCode) : null;
  return (
    <li>
      <Panel padding="none" className={clsx("flex flex-col", entry.status === "resolved" && "bg-surface/70")}>
        <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
          <Badge tone={KIND[entry.kind].tone}>{KIND[entry.kind].label}</Badge>
          {entry.status === "resolved" ? (
            <Badge tone="correct" icon={<CheckIcon className="size-3" strokeWidth={2.25} />}>
              Understood
            </Badge>
          ) : null}
          <span className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
            <span>{SOURCE_LABEL[entry.source]}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular">{date}</span>
          </span>
        </div>
        <p className="px-5 pt-3 pb-4 font-serif text-lg leading-relaxed whitespace-pre-wrap text-ink">{entry.body}</p>
        {entry.lessonCode || entry.status === "open" ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-2.5">
            {entry.lessonCode ? (
              <Link href={`/lessons/${entry.lessonCode}`} className="flex min-w-0 items-center gap-2 text-sm text-ink-muted hover:text-ink">
                <span className={clsx("tabular font-semibold", SUBJECT_STYLE[subjectOf(entry.lessonCode)].text)}>{entry.lessonCode}</span>
                <span className="truncate">{meta?.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {entry.status === "open" ? (
              <form action={resolveNote}>
                <input type="hidden" name="id" value={entry.id} />
                <Button type="submit" variant="ghost" size="sm">
                  <CheckIcon className="size-4" />
                  Mark as understood
                </Button>
              </form>
            ) : null}
          </div>
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
    <Page>
      <PageHeader
        eyebrow="Notebook"
        title="What you do not know yet"
        description="You and the tutor add to it, and every open entry returns until you can explain it."
      />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          <Tabs
            label="Notes"
            tabs={[
              {
                value: "open",
                label: "Open",
                count: open.length,
                content:
                  open.length === 0 ? (
                    <EmptyState icon={<NotebookIcon />} title="No open questions">
                      When something confuses you, write it down here, or press &ldquo;This confused me&rdquo; inside a lesson.
                    </EmptyState>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {open.map((e) => (
                        <Entry key={e.id} entry={e} />
                      ))}
                    </ul>
                  ),
              },
              {
                value: "resolved",
                label: "Understood",
                count: resolved.length,
                content:
                  resolved.length === 0 ? (
                    <EmptyState icon={<CheckIcon />} title="Nothing marked as understood yet">
                      Once you can explain an open entry, mark it as understood and it moves here.
                    </EmptyState>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {resolved.map((e) => (
                        <Entry key={e.id} entry={e} />
                      ))}
                    </ul>
                  ),
              },
            ]}
          />
        </div>
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <Panel className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-ink">Add a note</h2>
              <p className="text-sm text-ink-muted">Write it as a question. Derive brings it back until it is resolved.</p>
            </div>
            <NoteForm />
          </Panel>
        </aside>
      </div>
    </Page>
  );
}
