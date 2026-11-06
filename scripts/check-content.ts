/*
 * Checks every lesson folder in content/lessons: the files parse, every phase
 * file is present and uses only Derive's components, every exercise is placed
 * once in its own phase, tutor notes cover every exercise that offers hints,
 * the lesson meets the plan's rule 7 (a derivation, a build and an
 * explain-back), and nothing private is reachable from the browser.
 *
 *   npm run check:content
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { HINT_KINDS, PRODUCE_KINDS, evidenceConcepts, type Exercise } from "../src/lib/content/exercise-schema";
import { leakStatus, readLeaksFile } from "../src/lib/content/leaks";
import {
  LESSONS_DIR,
  PHASE_FILES,
  exerciseIdsInSource,
  readExercisesFile,
  readLessonFile,
  readPhaseSource,
  readTutorFile,
  writtenLessonCodes,
} from "../src/lib/content/files";
import { MDX_COMPONENT_NAMES } from "../src/lib/content/mdx-names";
import { PHASES } from "../src/lib/store/types";
import { tutorText } from "../src/lib/tutor/lesson-text";
import { TUTOR_VERSION } from "../src/lib/tutor/prompts";

const REQUIRED = ["lesson.yaml", ...Object.values(PHASE_FILES), "exercises.yaml", "tutor.yaml"];
const ALLOWED = new Set<string>(MDX_COMPONENT_NAMES);

async function checkLesson(code: string, errors: string[], warnings: string[]) {
  const dir = path.join(LESSONS_DIR, code);
  for (const file of REQUIRED) {
    if (!existsSync(path.join(dir, file))) errors.push(`${code} is missing ${file}.`);
  }
  const lessonResult = readLessonFile(code);
  if (!lessonResult.ok) {
    errors.push(...lessonResult.errors);
    return;
  }
  const lesson = lessonResult.file;
  const exercisesResult = readExercisesFile(code);
  if (!exercisesResult.ok) {
    errors.push(...exercisesResult.errors);
    return;
  }
  const exercises = exercisesResult.value.exercises as Exercise[];
  const byId = new Map<string, Exercise>();
  for (const ex of exercises) {
    if (byId.has(ex.id)) errors.push(`${code}/${ex.id} is defined twice.`);
    byId.set(ex.id, ex);
  }

  const taught = new Set(lesson.concepts.taught.map((c) => c.id));
  const known = new Set([...taught, ...lesson.concepts.used]);

  for (const ex of exercises) {
    const where = `${code}/${ex.id}`;
    if (!known.has(ex.concept)) errors.push(`${where} practises ${ex.concept}, which the lesson neither teaches nor uses.`);
    for (const c of ex.covers ?? []) {
      if (!taught.has(c)) errors.push(`${where} covers ${c}, which the lesson does not teach.`);
    }
    const answers = [ex.answer, ...(ex.review?.variants.map((v) => v.answer) ?? [])];
    for (const answer of answers) {
      if (answer.type === "choice") {
        const ids = answer.options.map((o) => o.id);
        if (new Set(ids).size !== ids.length) errors.push(`${where} has two options with the same id.`);
        for (const c of answer.correct) {
          if (!ids.includes(c)) errors.push(`${where} marks ${c} correct, but there is no such option.`);
        }
        if (!answer.multiple && answer.correct.length !== 1) {
          errors.push(`${where} is single-choice but marks ${answer.correct.length} options correct.`);
        }
      }
      if (answer.type === "steps") {
        const rules = new Set(answer.rules.map((r) => r.id));
        answer.lines.forEach((line, i) => {
          if (!rules.has(line.rule)) errors.push(`${where} line ${i + 1} cites an unknown rule ${line.rule}.`);
        });
      }
    }
  }

  // Placement of exercises in the phase files.
  const placed = new Map<string, string>();
  for (const phase of PHASES) {
    const source = readPhaseSource(code, phase);
    if (source === null) continue;
    const file = `${code}/${PHASE_FILES[phase]}`;
    // Fenced code is shown as written, so an `import` line in a Python example is not MDX.
    const prose = source.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, "");
    if (/^\s*(import|export)\s/m.test(prose)) errors.push(`${file} must not import or export anything.`);
    for (const match of prose.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
      if (!ALLOWED.has(match[1]!)) errors.push(`${file} uses <${match[1]}>, which is not a Derive component.`);
    }
    for (const id of exerciseIdsInSource(source)) {
      const ex = byId.get(id);
      if (!ex) {
        errors.push(`${file} places exercise ${id}, which exercises.yaml does not define.`);
        continue;
      }
      if (ex.phase !== phase) errors.push(`${file} places ${id}, which belongs to the ${ex.phase} phase.`);
      if (placed.has(id)) errors.push(`${code}/${id} is placed twice.`);
      placed.set(id, phase);
    }
    for (const m of source.matchAll(/<(Reveal|Reteach)\s+(?:after|for)="([a-z0-9-]+)"/g)) {
      const ex = byId.get(m[2]!);
      if (!ex) errors.push(`${file} has <${m[1]}> for ${m[2]}, which does not exist.`);
      else if (m[1] === "Reteach" && ex.kind !== "recall") {
        errors.push(`${file} re-teaches after ${m[2]}, which is not a recall question.`);
      }
    }
    // A figure part that waits for an exercise: the ordinary scale, the turned staircase, the limit
    // marker, typing a number or a text of one's own, a quantifier grid's verdicts.
    for (const m of source.matchAll(/\b(?:linearAfter|turnedAfter|limitAfter|typingAfter|verdictsAfter)="([a-z0-9-]+)"/g)) {
      const ex = byId.get(m[1]!);
      if (!ex) errors.push(`${file} has a figure waiting for ${m[1]}, which does not exist.`);
      else if (ex.phase !== phase) errors.push(`${file} has a figure waiting for ${m[1]}, which is in another phase.`);
    }
    // A scale line's axis runs over every value on it, the kept-back one included, so a kept-back
    // value that is the largest or the smallest would sit at an end of the axis for all to see.
    for (const m of source.matchAll(/<ScaleLine\b([\s\S]*?)\/>/g)) {
      const body = m[1]!;
      const predict = /predict=\{\{([\s\S]*?)\}\}/.exec(body);
      const hidden = predict ? Number(/\bvalue:\s*([0-9.e+-]+)/.exec(predict[1]!)?.[1]) : NaN;
      if (!predict || !(hidden > 0)) continue;
      const shown = [...body.replace(predict[0], "").matchAll(/\bvalue:\s*([0-9.e+-]+)/g)].map((v) => Number(v[1]));
      const end = (name: string) => {
        const e = new RegExp(`\\b${name}=\\{(-?[0-9.]+)\\}`).exec(body);
        return e ? Number(e[1]) : undefined;
      };
      const lo = end("min");
      const hi = end("max");
      if (hidden >= Math.max(...shown) && !(hi !== undefined && hi > Math.ceil(Math.log10(hidden)))) {
        errors.push(`${file}: a scale line keeps back its largest value, so it must set max beyond it, or the end of the axis gives the value away.`);
      }
      if (hidden <= Math.min(...shown) && !(lo !== undefined && lo < Math.floor(Math.log10(hidden)))) {
        errors.push(`${file}: a scale line keeps back its smallest value, so it must set min below it, or the end of the axis gives the value away.`);
      }
    }
    try {
      await compile(source, { remarkPlugins: [remarkGfm, remarkMath], outputFormat: "function-body" });
    } catch (error) {
      errors.push(`${file} is not valid MDX: ${String(error).split("\n")[0]}`);
    }
  }
  for (const ex of exercises) {
    if (!placed.has(ex.id)) errors.push(`${code}/${ex.id} is never placed in its phase file.`);
  }

  // Tutor notes: five rungs for every exercise that offers hints.
  const tutorResult = readTutorFile(code);
  if (!tutorResult.ok) errors.push(...tutorResult.errors);
  else {
    const notes = tutorResult.value.exercises;
    for (const ex of exercises) {
      if (HINT_KINDS.includes(ex.kind) && !notes[ex.id]) {
        errors.push(`${code}/${ex.id} offers hints but tutor.yaml has no rungs for it.`);
      }
    }
    for (const id of Object.keys(notes)) {
      if (!byId.has(id)) errors.push(`${code}/tutor.yaml has rungs for ${id}, which does not exist.`);
    }
    if (tutorResult.value.novice.length < 3) {
      warnings.push(`${code}/tutor.yaml lists fewer than three novice questions.`);
    }

    // Leak tests: a ready lesson needs a current, passing record for every exercise with hints.
    const statuses = leakStatus(exercises, tutorResult.value, readLeaksFile(code), TUTOR_VERSION);
    const said: Record<string, string> = {
      failed: "failed its tutor leak test",
      stale: "has a leak test record that is out of date",
      missing: "has no tutor leak test record",
    };
    for (const s of statuses) {
      if (s.status === "passed") continue;
      (lesson.status === "ready" ? errors : warnings).push(`${code}/${s.id} ${said[s.status]}.`);
    }
  }

  // The tutor reads the lesson text with reveals removed, so the rest must not hold answers.
  const visible = PHASES.map((phase) => tutorText(readPhaseSource(code, phase) ?? "")).join("\n");
  const squashed = visible.toLowerCase().replace(/\s+/g, "");
  for (const ex of exercises) {
    const a = ex.answer;
    if (a.type === "code") {
      for (const raw of a.reference.split("\n")) {
        const line = raw.replace(/#.*$/, "").trim().toLowerCase().replace(/\s+/g, "");
        const publicText = `${a.starter}\n${a.tests}`.toLowerCase().replace(/\s+/g, "");
        if (line.length >= 16 && squashed.includes(line) && !publicText.includes(line)) {
          errors.push(`${code}/${ex.id}: a line of its reference solution appears in the lesson text outside a <Reveal>.`);
          break;
        }
      }
    }
    if (a.type === "expression") {
      const ref = a.reference.toLowerCase().replace(/\s+/g, "");
      if (ref.length >= 6 && squashed.includes(ref)) {
        errors.push(`${code}/${ex.id}: its reference expression appears in the lesson text outside a <Reveal>.`);
      }
    }
  }

  // The tests can be shown to the learner, so they must not hold a line of the answer. A line the
  // starter already has is not an answer, and short right-hand sides such as `100` say nothing.
  for (const ex of exercises) {
    const a = ex.answer;
    if (a.type !== "code") continue;
    const squash = (t: string) => t.toLowerCase().replace(/\s+/g, "");
    const starter = squash(a.starter);
    const tests = squash(a.tests);
    for (const raw of a.reference.split("\n")) {
      const line = squash(raw.replace(/#.*$/, ""));
      if (!line || starter.includes(line)) continue;
      const m = /^return(.+)$/.exec(line) ?? /^[a-z_][a-z0-9_]*=(?!=)(.+)$/.exec(line);
      const rhs = m?.[1];
      if (rhs && rhs.length >= 8 && tests.includes(rhs)) {
        errors.push(`${code}/${ex.id}: its tests contain \`${rhs}\` from the reference solution, and the learner can show the tests.`);
        break;
      }
    }
  }

  // A proof whose rules are listed in the order its lines use them can be done by position.
  for (const ex of exercises) {
    const a = ex.answer;
    if (a.type !== "steps") continue;
    const inPlace = a.lines.filter((l, i) => a.rules[i]?.id === l.rule).length;
    if (a.lines.length >= 2 && inPlace * 2 > a.lines.length) {
      warnings.push(`${code}/${ex.id}: ${inPlace} of its ${a.lines.length} lines use the rule in the same position in the list; list the rules in another order.`);
    }
    if (new Set(a.lines.map((l) => l.rule)).size === a.rules.length && a.rules.length === a.lines.length) {
      warnings.push(`${code}/${ex.id} uses every rule exactly once, so the last line can be filled in by elimination; add a rule that no line uses.`);
    }
  }

  // Options are shown in the order written, so a learner soon notices if the first is usually right.
  const positions: number[] = [];
  for (const ex of exercises) {
    for (const a of [ex.answer, ...(ex.review?.variants.map((v) => v.answer) ?? [])]) {
      if (a.type === "choice" && a.correct.length === 1) positions.push(a.options.findIndex((o) => o.id === a.correct[0]));
    }
  }
  const firstRight = positions.filter((p) => p === 0).length;
  if (positions.length >= 4 && firstRight * 3 > positions.length) {
    warnings.push(
      `${code}: the first option is the right one in ${firstRight} of ${positions.length} single-answer choice items; spread the right answers across positions.`,
    );
  }

  // Rule 7: a derivation, a build and an explain-back; about five new concepts.
  const kinds = new Set(exercises.map((e) => e.kind));
  if (!kinds.has("step") && !kinds.has("proof")) errors.push(`${code} has no derivation (step or proof).`);
  if (!kinds.has("build")) errors.push(`${code} has no build exercise.`);
  if (!kinds.has("explain")) errors.push(`${code} has no explain-back.`);
  if (taught.size > 5) warnings.push(`${code} teaches ${taught.size} concepts; the plan allows about five.`);

  // Mastery needs all three for every taught concept, so each must be produced,
  // explained and reviewed somewhere in the lesson, or it could never be mastered.
  for (const concept of taught) {
    const evidence = exercises.filter((e) => evidenceConcepts(e).includes(concept));
    if (!evidence.some((e) => PRODUCE_KINDS.includes(e.kind))) {
      errors.push(`${code}: ${concept} is never produced in a derivation or build, so it could never be mastered.`);
    }
    if (!evidence.some((e) => e.kind === "explain")) {
      errors.push(`${code}: ${concept} is covered by no explain-back, so it could never be mastered.`);
    }
    if (!exercises.some((e) => e.concept === concept && e.review)) errors.push(`${code}: ${concept} has no review card.`);
  }
  if (!exercises.some((e) => e.placement)) warnings.push(`${code} has no placement question.`);
  for (const e of exercises.filter((x) => x.placement && (!x.review || x.review.variants.length < 2))) {
    errors.push(`${code}/${e.id} is a placement question but has fewer than two review variants.`);
  }
  const explainSource = readPhaseSource(code, "explain") ?? "";
  if (!/<MixedCheck\b/.test(explainSource)) {
    errors.push(`${code}/${PHASE_FILES.explain} has no <MixedCheck />.`);
  }
  // The plan's Connect phase previews 1 to 3 later lessons.
  const previews = explainSource.match(/<Foreshadow\b/g)?.length ?? 0;
  if (previews < 1 || previews > 3) {
    errors.push(`${code}/${PHASE_FILES.explain} previews ${previews} later lessons; the plan allows 1 to 3.`);
  }

  const recall = exercises.filter((e) => e.phase === "recall" && e.kind === "recall");
  if (recall.length < 3 || recall.length > 5) {
    warnings.push(`${code} has ${recall.length} recall questions; the plan asks for 3 to 5.`);
  }
  const total = Object.values(lesson.minutes).reduce((a, b) => a + b, 0);
  if (total < 110 || total > 250) warnings.push(`${code} is planned at ${total} minutes; lessons run 2 to 4 hours.`);
}

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];
  const codes = writtenLessonCodes();

  if (existsSync(LESSONS_DIR)) {
    for (const entry of readdirSync(LESSONS_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && !codes.includes(entry.name)) {
        errors.push(`content/lessons/${entry.name} has no lesson.yaml.`);
      }
    }
  }

  for (const code of codes) await checkLesson(code, errors, warnings);

  if (existsSync(path.join(process.cwd(), "public", "lessons"))) {
    errors.push("public/lessons must not exist: lesson files are served only through the app.");
  }

  console.log(`Content: ${codes.length} lesson${codes.length === 1 ? "" : "s"} written.`);
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`\nThe content check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`);
    process.exit(1);
  }
  console.log("The content check passed.");
}

void main();
