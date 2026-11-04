import { describe, expect, it } from "vitest";

import type { LessonFile } from "@/lib/content/lesson-schema";

import { curriculum, type CurriculumData } from "./data";
import { checkGraph, findCycle } from "./graph";

function tiny(): CurriculumData {
  return {
    version: 1,
    note: "test",
    curricula: [
      {
        code: "M",
        title: "Mathematics",
        courses: [{ code: "M1", title: "One", lessons: ["M1.1", "M1.2", "M1.3"] }],
      },
    ],
    lessons: {
      "M1.1": { title: "A", course: "M1", requires: [], buildsOn: [], leadsTo: ["M1.2"] },
      "M1.2": { title: "B", course: "M1", requires: ["M1.1"], buildsOn: [], leadsTo: [] },
      "M1.3": { title: "C", course: "M1", requires: ["M1.2"], buildsOn: [], leadsTo: ["X1"] },
    },
    capstones: [
      {
        code: "X1",
        title: "Cap",
        after: "M1",
        description: "d",
        gpuBudget: "None",
        requires: ["M1.3"],
        skills: [1],
      },
    ],
    skills: Array.from({ length: 10 }, (_, i) => `Skill ${i + 1}`),
    stages: [{ stage: 1, title: "S", courses: ["M1"], hours: 10 }],
  };
}

function lessonFile(code: string, overrides: Partial<LessonFile> = {}): LessonFile {
  return {
    code,
    title: "A",
    course: "M1",
    status: "draft",
    summary: "A summary that is long enough to pass the schema's minimum length.",
    sittings: 1,
    minutes: { puzzle: 10, recall: 10, explore: 30, derive: 30, build: 45, explain: 20 },
    concepts: { taught: [], used: [] },
    links: {
      requires: [],
      buildsOn: [],
      anotherViewOf: [],
      contrastsWith: [],
      applies: [],
      revisits: [],
      foreshadows: [],
    },
    skills: [],
    ...overrides,
  };
}

describe("checkGraph", () => {
  it("passes on the real curriculum", () => {
    const report = checkGraph(curriculum());
    expect(report.errors).toEqual([]);
    expect(report.stats.lessons).toBe(282);
    expect(report.stats.capstones).toBe(9);
  });

  it("passes on a small consistent graph", () => {
    expect(checkGraph(tiny()).errors).toEqual([]);
  });

  it("finds a cycle", () => {
    const data = tiny();
    data.lessons["M1.1"]!.requires = ["M1.3"];
    const report = checkGraph(data);
    expect(report.errors.some((e) => e.startsWith("Rule 1"))).toBe(true);
  });

  it("rejects a dependency on a later lesson of the same course", () => {
    const data = tiny();
    data.lessons["M1.2"]!.buildsOn = ["M1.3"];
    expect(checkGraph(data).errors.join("\n")).toMatch(/later lesson in the same course/);
  });

  it("rejects references to lessons that do not exist", () => {
    const data = tiny();
    data.lessons["M1.2"]!.leadsTo = ["M9.9"];
    expect(checkGraph(data).errors.join("\n")).toMatch(/M9\.9, which does not exist/);
  });

  it("requires a forward link", () => {
    const data = tiny();
    data.lessons["M1.3"]!.leadsTo = [];
    data.capstones[0]!.requires = ["M1.2"];
    expect(checkGraph(data).errors).toContain("Rule 5: M1.3 has no forward link.");
  });

  it("requires every course to reach a skill", () => {
    const data = tiny();
    data.capstones[0]!.skills = [];
    expect(checkGraph(data).errors.join("\n")).toMatch(/Rule 8: course M1/);
  });

  it("checks that concepts are taught before they are used", () => {
    const data = tiny();
    const written = new Map<string, LessonFile>([
      [
        "M1.2",
        lessonFile("M1.2", {
          title: "B",
          concepts: { taught: [], used: ["M1.3/later-idea"] },
          links: {
            ...lessonFile("M1.2").links,
            requires: [{ lesson: "M1.1", bridge: "B builds directly on the idea from A." }],
            anotherViewOf: [{ lesson: "M1.3", bridge: "C shows the same thing from another side." }],
          },
        }),
      ],
    ]);
    expect(checkGraph(data, written).errors.join("\n")).toMatch(/Rule 2: M1\.2 uses M1\.3\/later-idea/);
  });

  it("requires each taught concept to return twice", () => {
    const data = tiny();
    const written = new Map<string, LessonFile>([
      [
        "M1.1",
        lessonFile("M1.1", {
          concepts: {
            taught: [
              {
                id: "M1.1/once",
                name: "Once",
                summary: "A concept that is only used once afterwards.",
                usedBy: ["M1.2"],
              },
            ],
            used: [],
          },
        }),
      ],
    ]);
    expect(checkGraph(data, written).errors.join("\n")).toMatch(/Rule 4: M1\.1\/once/);
  });
});

describe("findCycle", () => {
  it("returns nothing for a chain", () => {
    const edges = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["c"])],
    ]);
    expect(findCycle(["a", "b", "c"], edges)).toEqual([]);
  });

  it("returns the nodes on a loop", () => {
    const edges = new Map([
      ["a", new Set(["b"])],
      ["b", new Set(["a"])],
    ]);
    expect(findCycle(["a", "b", "c"], edges).sort()).toEqual(["a", "b"]);
  });
});
