import type { Metadata } from "next";

import { Page, PageHeader } from "@/components/ui/page";
import { getStore } from "@/lib/auth";
import { CURRICULUM_NAMES, curriculum, stageOfCourse } from "@/lib/curriculum/data";
import { overview } from "@/lib/learning/service";

import { MapView, type MapCourse, type LessonState } from "./map-view";

export const metadata: Metadata = { title: "Map" };

export default async function MapPage() {
  const store = await getStore();
  const ov = await overview(store);
  const data = curriculum();

  function state(code: string): LessonState {
    const s = ov.status.get(code);
    if (s === "drafting" || s === "unwritten" || s === undefined) return "unwritten";
    if (s === "skipped") return "available";
    return s;
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
