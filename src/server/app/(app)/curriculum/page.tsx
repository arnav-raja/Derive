import type { Metadata } from "next";
import Link from "next/link";

import { CapstoneCard, type CapstoneSummary } from "@/components/course/capstone-card";
import { CourseCard } from "@/components/course/course-card";
import { LessonMap, MapKey } from "@/components/course/lesson-map";
import { StagePath, stageSummaries } from "@/components/course/stage-path";
import { Button } from "@/components/ui/button";
import { ArrowRightIcon, BookIcon, CheckCircleIcon, LayersIcon, TargetIcon } from "@/components/ui/icons";
import { Page, PageHeader, Section, StatStrip } from "@/components/ui/page";
import { Tabs } from "@/components/ui/tabs";
import { getStore } from "@/lib/auth";
import { CURRICULUM_NAMES, curriculum, type CurriculumCode } from "@/lib/curriculum/data";
import { subjectOf } from "@/lib/design/subject";
import { courseSummaries } from "@/lib/learning/catalogue";
import { overview } from "@/lib/learning/service";

export const metadata: Metadata = { title: "Curriculum" };

/** Digits grouped in threes (500,050), as everywhere in Derive. */
const n = (x: number) => x.toLocaleString("en-GB");

export default async function CurriculumPage() {
  const store = await getStore();
  const ov = await overview(store);
  const data = curriculum();
  const courses = courseSummaries(ov);
  const stages = stageSummaries(data.stages, courses);

  const sum = (f: (c: (typeof courses)[number]) => number) => courses.reduce((a, c) => a + f(c), 0);
  const lessons = sum((c) => c.counts.total);
  const done = sum((c) => c.counts.done);
  const mastered = sum((c) => c.counts.mastered);
  const written = sum((c) => c.counts.written);
  const coursesDone = courses.filter((c) => c.state === "completed").length;
  const hours = data.stages.reduce((a, s) => a + s.hours, 0);
  const months = Math.round(hours / Math.max(1, ov.learner.weeklyHours) / 4.345);

  const focus = ov.current ?? ov.nextLesson;
  const focusTitle = focus ? data.lessons[focus]?.title : null;

  const capstones: CapstoneSummary[] = data.capstones.map((cap) => ({
    code: cap.code,
    title: cap.title,
    description: cap.description,
    after: cap.after.split(/,\s*/),
    gpuBudget: cap.gpuBudget,
    skills: cap.skills,
    met: cap.requires.filter((code) => ov.status.get(code) === "mastered").length,
    total: cap.requires.length,
  }));

  const byCurriculum = (code: CurriculumCode) => courses.filter((c) => c.curriculum === code);

  return (
    <Page>
      <PageHeader
        eyebrow="Curriculum"
        title="From first principles to the frontier"
        description={`Three curriculums braided into one graph of ${n(lessons)} lessons. A lesson opens once everything it requires is mastered, so you can always see what comes next and why.`}
        actions={
          focus ? (
            <Button asChild size="lg">
              <Link href={`/lessons/${focus}`}>
                {ov.current ? "Continue" : "Start"} {focus}
                <ArrowRightIcon className="size-4" />
              </Link>
            </Button>
          ) : null
        }
      >
        {focus && focusTitle ? (
          <p className="text-sm text-ink-muted">
            {ov.current ? "Under way" : "Up next"}: <span className="font-medium text-ink">{focus} {focusTitle}</span>
          </p>
        ) : null}
      </PageHeader>

      <div className="flex flex-col gap-12">
        <StatStrip
          items={[
            { icon: <CheckCircleIcon />, label: "Lessons done", value: n(done), detail: `of ${n(lessons)} in the graph` },
            { icon: <TargetIcon />, label: "Lessons mastered", value: n(mastered), detail: "produced, explained and recalled" },
            { icon: <LayersIcon />, label: "Courses finished", value: n(coursesDone), detail: `of ${n(courses.length)} courses` },
            { icon: <BookIcon />, label: "Lessons written", value: n(written), detail: `${n(lessons - written)} still being written` },
          ]}
        />

        <Section
          title="Your path"
          description={`Five stages, about ${n(hours)} hours: roughly ${n(months)} months at your ${n(ov.learner.weeklyHours)} hours a week.`}
        >
          <StagePath stages={stages} />
        </Section>

        <Section title="Courses" description="Every course, with how far you are and what to open next.">
          <Tabs
            label="Courses by curriculum"
            defaultValue={focus ? subjectOf(focus) : "M"}
            tabs={[
              ...data.curricula.map((cur) => ({
                value: cur.code,
                label: CURRICULUM_NAMES[cur.code],
                count: cur.courses.length,
                content: (
                  <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {byCurriculum(cur.code).map((c) => (
                      <li key={c.code}>
                        <CourseCard course={c} />
                      </li>
                    ))}
                  </ul>
                ),
              })),
              {
                value: "capstones",
                label: "Capstones",
                count: capstones.length,
                content: (
                  <div className="flex flex-col gap-4">
                    <p className="max-w-2xl text-sm text-ink-muted">
                      Nine projects, each proving one or more of the ten skills a frontier lab looks for. Each opens once
                      the lessons it rests on are mastered, and each has a compute budget set in advance.
                    </p>
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {capstones.map((c) => (
                        <li key={c.code}>
                          <CapstoneCard capstone={c} />
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
              },
              {
                value: "map",
                label: "Lesson map",
                content: (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-2xl text-sm text-ink-muted">
                        Every lesson as one square, a row per course. Select a square to open its lesson.
                      </p>
                      <MapKey />
                    </div>
                    {data.curricula.map((cur) => (
                      <section key={cur.code} className="flex flex-col gap-2" aria-label={CURRICULUM_NAMES[cur.code]}>
                        <h3 className="text-sm font-semibold text-ink">{CURRICULUM_NAMES[cur.code]}</h3>
                        <div className="rounded-lg border border-rule bg-surface px-4 py-2 shadow-xs">
                          <LessonMap courses={byCurriculum(cur.code)} />
                        </div>
                      </section>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </Section>
      </div>
    </Page>
  );
}
