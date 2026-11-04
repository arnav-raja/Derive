/*
 * Checks every lesson folder in content/lessons: the metadata parses, every
 * phase file is present, and nothing private is reachable from the browser.
 *
 *   npm run check:content
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

import { LESSONS_DIR, readLessonFile, writtenLessonCodes } from "../src/lib/content/files";

const PHASE_FILES = [
  "1-puzzle.mdx",
  "2-recall.mdx",
  "3-explore.mdx",
  "4-derive.mdx",
  "5-build.mdx",
  "6-explain.mdx",
];
const REQUIRED = ["lesson.yaml", ...PHASE_FILES, "exercises.yaml", "tutor.yaml"];

function main() {
  const errors: string[] = [];
  const codes = writtenLessonCodes();

  if (existsSync(LESSONS_DIR)) {
    for (const entry of readdirSync(LESSONS_DIR, { withFileTypes: true })) {
      if (entry.isDirectory() && !codes.includes(entry.name)) {
        errors.push(`content/lessons/${entry.name} has no lesson.yaml.`);
      }
    }
  }

  for (const code of codes) {
    const dir = path.join(LESSONS_DIR, code);
    for (const file of REQUIRED) {
      if (!existsSync(path.join(dir, file))) errors.push(`${code} is missing ${file}.`);
    }
    const result = readLessonFile(code);
    if (!result.ok) errors.push(...result.errors);
  }

  if (existsSync(path.join(process.cwd(), "public", "lessons"))) {
    errors.push("public/lessons must not exist: lesson files are served only through the app.");
  }

  console.log(`Content: ${codes.length} lesson${codes.length === 1 ? "" : "s"} written.`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`\nThe content check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`);
    process.exit(1);
  }
  console.log("The content check passed.");
}

main();
