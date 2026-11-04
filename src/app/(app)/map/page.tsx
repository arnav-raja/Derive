import type { Metadata } from "next";

import { Page, PageHeader } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { writtenLessonCodes } from "@/lib/content/files";
import { CURRICULUM_NAMES, curriculum, stageOfCourse } from "@/lib/curriculum/data";
import { PHASES } from "@/lib/store/types";

import { MapView, type MapCourse, type LessonState } from "./map-view";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const store = await getStore();
  const progress = await store.progress();
  const written = new Set(writtenLessonCodes());
  const data = curriculum();

  const completedPhases = new Map<string, number>();
  const started = new Set<string>();
  for (const p of progress) {
    started.add(p.lessonCode);
    if (p.status === "completed") {
      completedPhases.set(p.lessonCode, (completedPhases.get(p.lessonCode) ?? 0) + 1);
    }
  }

  function state(code: string): LessonState {
    if ((completedPhases.get(code) ?? 0) >= PHASES.length) return "completed";
    if (started.has(code)) return "in-progress";
    if (!written.has(code)) return "unwritten";
    const requires = data.lessons[code]?.requires ?? [];
    const open = requires.every((r) => (completedPhases.get(r) ?? 0) >= PHASES.length);
    return open ? "available" : "locked";
  }

  const bands = data.curricula.map((cur) => ({
    code: cur.code,
    title: CURRICULUM_NAMES[cur.code],
    courses: cur.courses.map(
      (course): MapCourse => ({
        code: course.code,
        title: course.title,
        stage: stageOfCourse(course.code),
        lessons: course.lessons.map((code) => ({
          code,
          title: data.lessons[code]!.title,
          state: state(code),
        })),
      }),
    ),
  }));

  const lessonCount = Object.keys(data.lessons).length;

  return (
    <Page>
      <PageHeader
        title="Map"
        description={`Three curriculums, ${data.curricula.reduce((n, c) => n + c.courses.length, 0)} courses and ${lessonCount} lessons, joined into one graph. A lesson opens once everything it requires is mastered.`}
      />
      <MapView bands={bands} />
    </Page>
  );
}
