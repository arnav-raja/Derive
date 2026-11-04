import type { Metadata } from "next";

import { Meter, Page, PageHeader, Panel, Section } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { curriculum } from "@/lib/curriculum/data";
import { overview } from "@/lib/learning/service";

export const metadata: Metadata = { title: "Progress" };

/** Every lesson a node depends on, following hard prerequisites all the way down. */
function closure(start: string[], requires: (code: string) => string[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...start];
  while (stack.length) {
    const code = stack.pop()!;
    if (seen.has(code)) continue;
    seen.add(code);
    stack.push(...requires(code));
  }
  return seen;
}

export default async function ProgressPage() {
  const store = await getStore();
  const ov = await overview(store);
  const concepts = [...ov.concepts.values()];
  const data = curriculum();
  const requiresOf = (code: string) =>
    data.lessons[code]?.requires ?? data.capstones.find((c) => c.code === code)?.requires ?? [];
  const skillProgress = data.skills.map((_, i) => {
    const capstones = data.capstones.filter((c) => c.skills.includes(i + 1));
    const lessons = [...closure(capstones.map((c) => c.code), requiresOf)].filter((c) => data.lessons[c]);
    const mastered = lessons.filter((c) => ov.status.get(c) === "mastered").length;
    return { total: lessons.length, mastered };
  });
  const mastered = concepts.filter((c) => c.masteredAt).length;
  const provisional = concepts.filter((c) => c.provisional && !c.masteredAt).length;
  const totalHours = data.stages.reduce((n, s) => n + s.hours, 0);

  return (
    <Page>
      <PageHeader
        title="Progress"
        description="Progress means demonstrated mastery: an idea you produced yourself, explained simply and recalled later. Time spent does not count."
      />

      <div className="flex flex-col gap-10">
        <div className="grid gap-4 sm:grid-cols-3">
          <Panel>
            <p className="text-sm text-ink-muted">Concepts mastered</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink">{mastered}</p>
          </Panel>
          <Panel>
            <p className="text-sm text-ink-muted">Skipped by placement, awaiting confirmation</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink">{provisional}</p>
          </Panel>
          <Panel>
            <p className="text-sm text-ink-muted">Planned study</p>
            <p className="tabular mt-1 text-3xl font-semibold text-ink">
              {totalHours.toLocaleString("en-IN")} h
            </p>
          </Panel>
        </div>

        <Section
          title="Frontier-lab skills"
          description="The ten destination skills. Every lesson in the graph leads to at least one."
        >
          <ol className="flex flex-col gap-3">
            {data.skills.map((skill, i) => {
              const capstones = data.capstones.filter((c) => c.skills.includes(i + 1));
              return (
                <li key={skill}>
                  <Panel className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <span className="tabular w-6 shrink-0 text-sm font-semibold text-ink-muted">
                        {i + 1}
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="text-sm font-medium text-ink">{skill}</p>
                        <p className="text-xs text-ink-muted">
                          Proved in{" "}
                          {capstones.map((c) => `${c.code} ${c.title}`).join("; ") || "the lessons"}
                          .
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-xs text-ink-muted">
                        {skillProgress[i]!.mastered} of {skillProgress[i]!.total} lessons
                      </span>
                    </div>
                    <Meter value={skillProgress[i]!.mastered} max={Math.max(1, skillProgress[i]!.total)} label={`Lessons mastered towards skill ${i + 1}`} />
                  </Panel>
                </li>
              );
            })}
          </ol>
        </Section>

        <Section title="Stages" description="About 26 months at 10 hours a week.">
          <ol className="grid gap-3 md:grid-cols-5">
            {data.stages.map((stage) => (
              <li key={stage.stage}>
                <Panel className="h-full">
                  <p className="text-xs font-medium text-ink-muted">Stage {stage.stage}</p>
                  <p className="mt-1 text-sm font-semibold text-ink">{stage.title}</p>
                  <p className="tabular mt-2 text-xs text-ink-muted">
                    {stage.courses.join(", ")} · about {stage.hours} hours
                  </p>
                </Panel>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </Page>
  );
}
