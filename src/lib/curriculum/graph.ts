import type { LessonFile } from "@/lib/content/lesson-schema";
import { HORIZONTAL_LINKS } from "@/lib/content/lesson-schema";

import type { CurriculumData } from "./data";

/*
 * The rules the lesson graph must satisfy, from the plan's Structure section.
 * Lesson-level rules run on the whole curriculum. Concept-level rules run on
 * every lesson that has been written (has a lesson.yaml); unwritten lessons
 * are checked once they exist.
 */

export type GraphReport = {
  errors: string[];
  warnings: string[];
  stats: {
    lessons: number;
    capstones: number;
    written: number;
    prerequisiteLinks: number;
    crossCurriculumLinks: number;
    forwardLinks: number;
  };
};

const FIRST_LESSON = "M1.1";

function courseOf(code: string): string {
  return code.split(".")[0]!;
}

function orderKey(code: string): [string, number, number] | null {
  const m = /^([MLE])(\d+)\.(\d+)$/.exec(code);
  return m ? [m[1]!, Number(m[2]), Number(m[3])] : null;
}

/** The effective graph: lesson.yaml where written, curriculum.json elsewhere. */
export function effectiveEdges(data: CurriculumData, written: Map<string, LessonFile>) {
  const requires = new Map<string, string[]>();
  const buildsOn = new Map<string, string[]>();
  const leadsTo = new Map<string, string[]>();
  for (const [code, meta] of Object.entries(data.lessons)) {
    const file = written.get(code);
    requires.set(code, file ? file.links.requires.map((l) => l.lesson) : meta.requires);
    buildsOn.set(code, file ? file.links.buildsOn.map((l) => l.lesson) : meta.buildsOn);
    leadsTo.set(
      code,
      file
        ? [...new Set([...meta.leadsTo, ...file.links.foreshadows.map((l) => l.lesson)])]
        : meta.leadsTo,
    );
  }
  for (const cap of data.capstones) {
    requires.set(cap.code, cap.requires);
    buildsOn.set(cap.code, []);
    leadsTo.set(cap.code, []);
  }
  return { requires, buildsOn, leadsTo };
}

/** Kahn's algorithm; returns the nodes left on a cycle, if any. */
export function findCycle(nodes: string[], edges: Map<string, Set<string>>): string[] {
  const indegree = new Map(nodes.map((n) => [n, 0]));
  for (const targets of edges.values()) {
    for (const t of targets) indegree.set(t, (indegree.get(t) ?? 0) + 1);
  }
  const queue = nodes.filter((n) => indegree.get(n) === 0);
  let seen = 0;
  while (queue.length) {
    const u = queue.pop()!;
    seen++;
    for (const v of edges.get(u) ?? []) {
      const d = indegree.get(v)! - 1;
      indegree.set(v, d);
      if (d === 0) queue.push(v);
    }
  }
  if (seen === nodes.length) return [];
  return nodes.filter((n) => (indegree.get(n) ?? 0) > 0);
}

function ancestors(start: string, back: Map<string, string[]>): Set<string> {
  const out = new Set<string>();
  const stack = [...(back.get(start) ?? [])];
  while (stack.length) {
    const n = stack.pop()!;
    if (out.has(n)) continue;
    out.add(n);
    stack.push(...(back.get(n) ?? []));
  }
  return out;
}

export function checkGraph(
  data: CurriculumData,
  written: Map<string, LessonFile> = new Map(),
): GraphReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lessonCodes = Object.keys(data.lessons);
  const capstoneCodes = data.capstones.map((c) => c.code);
  const nodes = [...lessonCodes, ...capstoneCodes];
  const nodeSet = new Set(nodes);

  // Structure: every lesson sits in exactly one course, listed in order.
  const listed = new Map<string, string>();
  for (const cur of data.curricula) {
    for (const course of cur.courses) {
      if (!course.code.startsWith(cur.code)) {
        errors.push(`Course ${course.code} is filed under the wrong curriculum (${cur.code}).`);
      }
      for (const code of course.lessons) {
        if (listed.has(code)) errors.push(`Lesson ${code} is listed in two courses.`);
        listed.set(code, course.code);
        const meta = data.lessons[code];
        if (!meta) errors.push(`Course ${course.code} lists ${code}, which has no lesson entry.`);
        else if (meta.course !== course.code) {
          errors.push(`Lesson ${code} says it belongs to ${meta.course} but is listed in ${course.code}.`);
        }
      }
    }
  }
  for (const code of lessonCodes) {
    if (!listed.has(code)) errors.push(`Lesson ${code} is not listed in any course.`);
  }
  const staged = new Set(data.stages.flatMap((s) => s.courses));
  for (const cur of data.curricula) {
    for (const course of cur.courses) {
      if (!staged.has(course.code)) errors.push(`Course ${course.code} is not in any stage.`);
    }
  }

  const { requires, buildsOn, leadsTo } = effectiveEdges(data, written);

  // References must point at real lessons or capstones.
  for (const n of nodes) {
    for (const [kind, map] of [
      ["requires", requires],
      ["builds on", buildsOn],
      ["leads to", leadsTo],
    ] as const) {
      for (const target of map.get(n) ?? []) {
        if (!nodeSet.has(target)) errors.push(`${n} ${kind} ${target}, which does not exist.`);
        if (target === n) errors.push(`${n} ${kind} itself.`);
      }
    }
  }

  // Rule 1: hard prerequisites contain no cycles, even with forward links added.
  const edges = new Map<string, Set<string>>();
  const addEdge = (from: string, to: string) => {
    if (!nodeSet.has(from) || !nodeSet.has(to)) return;
    if (!edges.has(from)) edges.set(from, new Set());
    edges.get(from)!.add(to);
  };
  for (const n of nodes) {
    for (const p of requires.get(n) ?? []) addEdge(p, n);
    for (const p of buildsOn.get(n) ?? []) addEdge(p, n);
    for (const t of leadsTo.get(n) ?? []) addEdge(n, t);
  }
  const cycle = findCycle(nodes, edges);
  if (cycle.length) {
    errors.push(`Rule 1: the graph has a cycle through ${cycle.slice(0, 12).join(", ")}.`);
  }

  // Within a course, a lesson may only require earlier lessons of that course.
  for (const n of lessonCodes) {
    const k = orderKey(n)!;
    for (const p of [...(requires.get(n) ?? []), ...(buildsOn.get(n) ?? [])]) {
      const pk = orderKey(p);
      if (pk && pk[0] === k[0] && pk[1] === k[1] && pk[2] >= k[2]) {
        errors.push(`${n} depends on ${p}, a later lesson in the same course.`);
      }
    }
  }

  // Rule 5 (lesson level): a backward and a forward link for every lesson.
  const usedLater = new Set<string>();
  for (const n of nodes) {
    for (const p of requires.get(n) ?? []) usedLater.add(p);
    for (const p of buildsOn.get(n) ?? []) usedLater.add(p);
  }
  for (const n of lessonCodes) {
    const back = (requires.get(n)?.length ?? 0) + (buildsOn.get(n)?.length ?? 0);
    if (back === 0 && n !== FIRST_LESSON) {
      errors.push(`Rule 5: ${n} has no backward link.`);
    }
    if ((leadsTo.get(n)?.length ?? 0) === 0 && !usedLater.has(n)) {
      errors.push(`Rule 5: ${n} has no forward link.`);
    }
  }

  // Rule 8: every course has a path to at least one frontier-lab skill.
  const forward = new Map<string, Set<string>>(edges);
  const skillNodes = new Set(data.capstones.filter((c) => c.skills.length).map((c) => c.code));
  for (const [code, file] of written) {
    if (file.skills.length || file.concepts.taught.some((c) => c.skill)) skillNodes.add(code);
  }
  for (const cur of data.curricula) {
    for (const course of cur.courses) {
      const seen = new Set<string>();
      const stack = [...course.lessons];
      let reached = false;
      while (stack.length && !reached) {
        const n = stack.pop()!;
        if (seen.has(n)) continue;
        seen.add(n);
        if (skillNodes.has(n)) reached = true;
        stack.push(...(forward.get(n) ?? []));
      }
      if (!reached) errors.push(`Rule 8: course ${course.code} has no path to a frontier-lab skill.`);
    }
  }

  // Concept-level rules for written lessons.
  const back = new Map<string, string[]>();
  for (const n of nodes) back.set(n, [...(requires.get(n) ?? []), ...(buildsOn.get(n) ?? [])]);
  const teacher = new Map<string, string>();
  for (const [code, file] of written) {
    for (const c of file.concepts.taught) {
      if (!c.id.startsWith(`${code}/`)) {
        errors.push(`${code}: concept ${c.id} must be named after its lesson (${code}/...).`);
      }
      if (teacher.has(c.id)) errors.push(`Concept ${c.id} is taught twice.`);
      teacher.set(c.id, code);
    }
  }

  for (const [code, file] of written) {
    const meta = data.lessons[code];
    if (!meta) {
      errors.push(`content/lessons/${code} exists, but ${code} is not in the curriculum.`);
      continue;
    }
    if (file.course !== meta.course) {
      errors.push(`${code}: lesson.yaml says course ${file.course}, the curriculum says ${meta.course}.`);
    }
    if (file.title !== meta.title) {
      warnings.push(`${code}: the title differs from curriculum.json ("${meta.title}").`);
    }
    const sameSet = (a: string[], b: string[]) =>
      a.length === b.length && a.every((x) => b.includes(x));
    if (!sameSet(file.links.requires.map((l) => l.lesson), meta.requires)) {
      errors.push(
        `${code}: lesson.yaml requires [${file.links.requires.map((l) => l.lesson).join(", ")}] but curriculum.json says [${meta.requires.join(", ")}]. Run npm run check:graph -- --fix.`,
      );
    }
    if (!sameSet(file.links.buildsOn.map((l) => l.lesson), meta.buildsOn)) {
      errors.push(
        `${code}: lesson.yaml builds on [${file.links.buildsOn.map((l) => l.lesson).join(", ")}] but curriculum.json says [${meta.buildsOn.join(", ")}]. Run npm run check:graph -- --fix.`,
      );
    }

    // Rule 2: no concept is used before it is taught.
    const before = ancestors(code, back);
    for (const used of file.concepts.used) {
      const source = teacher.get(used);
      const owner = used.split("/")[0]!;
      if (!source) {
        if (written.has(owner) || !data.lessons[owner]) {
          errors.push(`Rule 2: ${code} uses ${used}, which no lesson teaches.`);
        } else if (!before.has(owner)) {
          errors.push(`Rule 2: ${code} uses ${used} from ${owner}, which is not a prerequisite.`);
        }
        continue;
      }
      if (!before.has(source)) {
        errors.push(`Rule 2: ${code} uses ${used}, taught in ${source}, which is not a prerequisite.`);
      }
    }

    // Rule 5 (concept level): at least one horizontal link, except the first lesson.
    const horizontal = HORIZONTAL_LINKS.reduce((n, k) => n + file.links[k].length, 0);
    if (horizontal === 0 && code !== FIRST_LESSON) {
      errors.push(`Rule 5: ${code} has no horizontal link (another view of, contrasts with, applies).`);
    }

    // Rule 6: a maths idea used in ML or MLE links to the lesson that teaches it.
    if (!code.startsWith("M")) {
      const linked = new Set(
        Object.values(file.links)
          .flat()
          .map((l) => l.lesson),
      );
      for (const used of file.concepts.used) {
        const source = teacher.get(used) ?? used.split("/")[0]!;
        if (source.startsWith("M") && !linked.has(source)) {
          errors.push(`Rule 6: ${code} uses the maths idea ${used} but has no link to ${source}.`);
        }
      }
    }

    // Rule 7: about five new concepts at most.
    const n = file.concepts.taught.length;
    if (n > 5) warnings.push(`Rule 7: ${code} teaches ${n} concepts; the target is five at most.`);

    // Rules 3 and 4: each taught concept is used later (twice, for revisiting),
    // or is itself a frontier-lab skill.
    for (const c of file.concepts.taught) {
      const declared = new Set(c.usedBy);
      for (const [other, otherFile] of written) {
        if (other !== code && otherFile.concepts.used.includes(c.id)) declared.add(other);
      }
      for (const target of c.usedBy) {
        if (!nodeSet.has(target)) {
          errors.push(`${code}: ${c.id} is said to be used by ${target}, which does not exist.`);
          continue;
        }
        if (!ancestors(target, back).has(code)) {
          errors.push(`${code}: ${c.id} is used by ${target}, but ${target} does not come after ${code}.`);
        }
        const targetFile = written.get(target);
        if (targetFile && !targetFile.concepts.used.includes(c.id)) {
          errors.push(`${target} is written but does not list ${c.id}, which ${code} says it uses.`);
        }
      }
      if (declared.size === 0 && !c.skill) {
        errors.push(`Rule 3: ${c.id} is taught in ${code} but never used later.`);
      } else if (declared.size < 2 && !c.skill) {
        errors.push(`Rule 4: ${c.id} returns in only ${declared.size} later lesson; it needs two.`);
      }
    }
  }

  const prerequisiteLinks = nodes.reduce(
    (n, x) => n + (requires.get(x)?.length ?? 0) + (buildsOn.get(x)?.length ?? 0),
    0,
  );
  const crossCurriculumLinks = nodes.reduce(
    (n, x) =>
      n +
      [...(requires.get(x) ?? []), ...(buildsOn.get(x) ?? [])].filter((p) => p[0] !== x[0]).length,
    0,
  );
  const forwardLinks = nodes.reduce((n, x) => n + (leadsTo.get(x)?.length ?? 0), 0);

  return {
    errors,
    warnings,
    stats: {
      lessons: lessonCodes.length,
      capstones: capstoneCodes.length,
      written: written.size,
      prerequisiteLinks,
      crossCurriculumLinks,
      forwardLinks,
    },
  };
}

export { courseOf };
