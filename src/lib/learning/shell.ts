import "server-only";

import { lesson as lessonMeta } from "@/lib/curriculum/data";
import { PHASES, type PhaseProgress, type Store } from "@/lib/store/types";

import { PHASE_TITLES, lessonProgress } from "./state";

/*
 * The little the app's frame needs on every page: how many reviews are due,
 * how many notes are open, and the lesson under way. Three small reads.
 */

export type ShellData = {
  name: string | null;
  counts: { reviewsDue: number; openNotes: number };
  current: {
    code: string;
    title: string;
    href: string;
    phaseTitle: string;
    phases: ("done" | "current" | "todo")[];
  } | null;
};

export async function shellData(store: Store, now = new Date()): Promise<ShellData> {
  const [due, notes, rows, learner] = await Promise.all([
    store.cards({ dueBefore: now.toISOString() }),
    store.notebook({ status: "open" }),
    store.progress(),
    store.learner(),
  ]);

  const byLesson = new Map<string, PhaseProgress[]>();
  for (const r of rows) byLesson.set(r.lessonCode, [...(byLesson.get(r.lessonCode) ?? []), r]);

  // The lesson worked on most recently that is begun but not finished.
  let current: ShellData["current"] = null;
  let latest = "";
  for (const [code, list] of byLesson) {
    const p = lessonProgress(list);
    if (!p.begun || p.completed || !p.current) continue;
    const touched = list.reduce((m, r) => (r.updatedAt > m ? r.updatedAt : m), "");
    if (touched <= latest) continue;
    const meta = lessonMeta(code);
    if (!meta) continue;
    latest = touched;
    current = {
      code,
      title: meta.title,
      href: `/lessons/${code}/${p.current}`,
      phaseTitle: PHASE_TITLES[p.current],
      phases: PHASES.map((ph) => (p.phases[ph] === "completed" ? "done" : ph === p.current ? "current" : "todo")),
    };
  }

  return {
    name: learner.displayName,
    counts: { reviewsDue: due.length, openNotes: notes.length },
    current,
  };
}
