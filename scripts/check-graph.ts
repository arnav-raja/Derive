/*
 * Checks the lesson graph against the plan's rules. Run on every change:
 *
 *   npm run check:graph            report, and fail on any error
 *   npm run check:graph -- --fix   first copy written lessons' requires and
 *                                  builds-on links into curriculum.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { readAllLessonFiles } from "../src/lib/content/files";
import { curriculumSchema } from "../src/lib/curriculum/data";
import { checkGraph } from "../src/lib/curriculum/graph";

const CURRICULUM = path.join(process.cwd(), "content/curriculum/curriculum.json");

function main() {
  const fix = process.argv.includes("--fix");
  const raw = JSON.parse(readFileSync(CURRICULUM, "utf8"));
  const parsed = curriculumSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      console.error(`curriculum.json ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  const data = parsed.data;
  const { files, errors: fileErrors } = readAllLessonFiles();

  if (fix) {
    let changed = 0;
    for (const [code, file] of files) {
      const meta = data.lessons[code];
      if (!meta) continue;
      const requires = file.links.requires.map((l) => l.lesson);
      const buildsOn = file.links.buildsOn.map((l) => l.lesson);
      const leadsTo = [...new Set([...meta.leadsTo, ...file.links.foreshadows.map((l) => l.lesson)])];
      if (
        JSON.stringify([requires, buildsOn, leadsTo]) !==
        JSON.stringify([meta.requires, meta.buildsOn, meta.leadsTo])
      ) {
        meta.requires = requires;
        meta.buildsOn = buildsOn;
        meta.leadsTo = leadsTo;
        changed++;
      }
    }
    if (changed) {
      writeFileSync(CURRICULUM, `${JSON.stringify(data, null, 2)}\n`);
      console.log(`Updated ${changed} lesson${changed === 1 ? "" : "s"} in curriculum.json.`);
    }
  }

  const report = checkGraph(data, files);
  const errors = [...fileErrors, ...report.errors];
  const s = report.stats;

  console.log(
    `Graph: ${s.lessons} lessons, ${s.capstones} capstones, ${s.written} written; ` +
      `${s.prerequisiteLinks} prerequisite links (${s.crossCurriculumLinks} across curriculums), ` +
      `${s.forwardLinks} forward links.`,
  );
  for (const w of report.warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);

  if (errors.length) {
    console.error(`\nThe graph check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`);
    process.exit(1);
  }
  console.log("The graph check passed.");
}

main();
