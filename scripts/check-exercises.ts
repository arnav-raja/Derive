/*
 * Verifies every exercise in every written lesson by running it with the same
 * Pyodide build and harness the browser uses:
 *
 *   - a build or debug exercise's reference solution passes all its tests, the
 *     same way on every run, and each deliberately wrong solution fails;
 *   - a break-it exercise has exactly one outcome that holds;
 *   - an expression's reference has the shape it asks for, its listed inputs
 *     are accepted or rejected as stated, and checks.json is up to date.
 *
 *   npm run check:exercises              verify
 *   npm run check:exercises -- --write   also regenerate checks.json
 */

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import path from "node:path";

import {
  expressionKey,
  type Answer,
  type ChecksFile,
  type Exercise,
} from "../src/lib/content/exercise-schema";
import {
  lessonDir,
  readChecksFile,
  readExercisesFile,
  writtenLessonCodes,
} from "../src/lib/content/files";

import { startPython, type NodePython } from "./lib/python-node";

const write = process.argv.includes("--write");
const only = process.argv.find((a) => /^[MLE]\d{1,2}\.\d{1,2}$/.test(a));

type ExpressionSpec = Extract<Answer, { type: "expression" }>;
type CodeSpec = Extract<Answer, { type: "code" }>;
type BreakitSpec = Extract<Answer, { type: "breakit" }>;

const POINTS = 6;

function sourceHash(spec: ExpressionSpec): string {
  return createHash("sha256")
    .update(JSON.stringify({ r: spec.reference, s: spec.symbols, f: spec.form, n: POINTS }))
    .digest("hex")
    .slice(0, 16);
}

function sameResult(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type CodeRun = ChecksFile["runs"][string];

function checkCode(py: NodePython, where: string, spec: CodeSpec, errors: string[]): CodeRun | null {
  const base = { tests: spec.tests, maxSteps: spec.maxSteps, files: spec.files, stdin: spec.stdin };
  const first = py.run({ code: spec.reference, ...base });
  if (!first.passed) {
    const failed = first.error
      ? `${first.error.type}: ${first.error.message}`
      : first.tests.filter((t) => !t.passed).map((t) => `${t.name} (${t.message})`).join(", ");
    errors.push(`${where}: the reference solution fails: ${failed}`);
    return null;
  }
  if (first.tests.length === 0) errors.push(`${where}: the tests define no test_* functions.`);
  const second = py.run({ code: spec.reference, ...base });
  if (!sameResult(first, second)) errors.push(`${where}: the tests give different results on two runs.`);
  let firstWrong: CodeRun | null = null;
  spec.wrong.forEach((wrong, i) => {
    const result = py.run({ code: wrong.code, ...base });
    if (result.passed) errors.push(`${where}: wrong solution ${i + 1} passes every test (${wrong.why}).`);
    // A wrong solution should fail only for the reason it gives. A NameError usually means it left
    // out a name the script defines, such as the data its tests use.
    const unnamed = result.tests.filter((t) => !t.passed && /^NameError\b/.test(t.message ?? "")).map((t) => t.name);
    if (result.error?.type === "NameError") unnamed.push("the script");
    if (unnamed.length && !/NameError/.test(wrong.why)) {
      errors.push(
        `${where}: wrong solution ${i + 1} fails with NameError (${unnamed.join(", ")}), so it leaves out a name the ` +
          `reference defines; it should fail only for the reason it gives (${wrong.why}).`,
      );
    }
    if (i === 0) {
      firstWrong = {
        tests: result.tests.map((t) => ({
          name: t.name,
          description: t.description,
          passed: t.passed,
          message: t.message ?? null,
        })),
        error: result.error ? { type: result.error.type, message: result.error.message, line: result.error.line ?? null } : null,
        output: result.output.slice(0, 2000),
      };
    }
  });
  if (spec.starter.trim()) {
    const starter = py.run({ code: spec.starter, ...base });
    if (starter.passed) errors.push(`${where}: the starter code already passes every test.`);
  }
  return firstWrong;
}

function checkBreakit(py: NodePython, where: string, spec: BreakitSpec, errors: string[]) {
  const result = py.breakit({ code: spec.code, broken: spec.broken, options: spec.options });
  if (result.baseError) {
    errors.push(`${where}: the working program fails: ${result.baseError.type}: ${result.baseError.message}`);
  }
  if (result.matches.length !== 1) {
    errors.push(
      `${where}: exactly one outcome must hold after the change, but ${result.matches.length} do` +
        (result.matches.length ? ` (${result.matches.join(", ")})` : "") +
        (result.error ? `; the run raised ${result.error.type}` : ""),
    );
  }
}

function checkExpression(
  py: NodePython,
  where: string,
  key: string,
  lesson: string,
  spec: ExpressionSpec,
  checks: ChecksFile,
  fresh: ChecksFile,
  errors: string[],
) {
  py.loadSympy();
  const fp = py.fingerprint({
    reference: spec.reference,
    symbols: spec.symbols,
    form: spec.form,
    seed: `${lesson}/${key}`,
    count: POINTS,
  });
  if (fp.unknown.length) errors.push(`${where}: the reference uses undeclared names: ${fp.unknown.join(", ")}.`);
  if (fp.formMessage) errors.push(`${where}: the reference does not have its own required shape (${fp.formMessage}).`);
  const entry = { source: sourceHash(spec), points: fp.points, values: fp.values };
  fresh.expressions[key] = entry;
  const existing = checks.expressions[key];
  if (!write && (!existing || !sameResult(existing, entry))) {
    errors.push(`${where}: checks.json is out of date; run npm run check:exercises -- --write.`);
  }
  const verdict = (input: string) =>
    py.checkExpression({ input, symbols: spec.symbols, points: fp.points, values: fp.values, form: spec.form });
  const self = verdict(spec.reference);
  if (self.status !== "correct") errors.push(`${where}: the reference is not accepted by its own check (${self.status}).`);
  for (const input of spec.accept) {
    const r = verdict(input);
    if (r.status !== "correct") errors.push(`${where}: "${input}" should be accepted but is ${r.status}.`);
  }
  for (const input of spec.reject) {
    const r = verdict(input);
    if (r.status === "correct") errors.push(`${where}: "${input}" should be rejected but is accepted.`);
  }
}

function checkAnswer(
  py: NodePython,
  lesson: string,
  where: string,
  key: string,
  answer: Answer,
  checks: ChecksFile,
  fresh: ChecksFile,
  errors: string[],
) {
  switch (answer.type) {
    case "code": {
      const run = checkCode(py, where, answer, errors);
      if (run) {
        fresh.runs[key] = run;
        if (!write && !sameResult(checks.runs[key], run)) {
          errors.push(`${where}: checks.json is out of date; run npm run check:exercises -- --write.`);
        }
      }
      break;
    }
    case "breakit":
      checkBreakit(py, where, answer, errors);
      break;
    case "expression":
      checkExpression(py, where, key, lesson, answer, checks, fresh, errors);
      break;
    default:
      break;
  }
}

async function main() {
  const codes = writtenLessonCodes().filter((c) => !only || c === only);
  const errors: string[] = [];
  let verified = 0;
  let py: NodePython | null = null;

  for (const code of codes) {
    const file = readExercisesFile(code);
    if (!file.ok) {
      errors.push(...file.errors);
      continue;
    }
    const checksResult = readChecksFile(code);
    const checks: ChecksFile = checksResult.ok ? checksResult.value : { version: 1, expressions: {}, runs: {} };
    if (!checksResult.ok) errors.push(...checksResult.errors);
    const fresh: ChecksFile = { version: 1, expressions: {}, runs: {} };

    py ??= await startPython();
    for (const ex of file.value.exercises as Exercise[]) {
      checkAnswer(py, code, `${code}/${ex.id}`, expressionKey(ex.id), ex.answer, checks, fresh, errors);
      verified++;
      ex.review?.variants.forEach((variant, i) => {
        checkAnswer(
          py!,
          code,
          `${code}/${ex.id} variant ${i + 1}`,
          expressionKey(ex.id, i),
          variant.answer,
          checks,
          fresh,
          errors,
        );
        verified++;
      });
    }

    const stale = [
      ...Object.keys(checks.expressions).filter((k) => !(k in fresh.expressions)),
      ...Object.keys(checks.runs).filter((k) => !(k in fresh.runs)),
    ];
    if (!write && stale.length) {
      errors.push(`${code}/checks.json has entries for items that no longer exist: ${stale.join(", ")}.`);
    }
    if (write) {
      const sortedEntries = <T,>(o: Record<string, T>) =>
        Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
      const sorted: ChecksFile = {
        version: 1,
        expressions: sortedEntries(fresh.expressions),
        runs: sortedEntries(fresh.runs),
      };
      const target = path.join(lessonDir(code), "checks.json");
      if (Object.keys(sorted.expressions).length || Object.keys(sorted.runs).length) {
        writeFileSync(target, `${JSON.stringify(sorted, null, 2)}\n`);
      }
    }
  }

  console.log(`Exercises: ${verified} items verified across ${codes.length} lesson${codes.length === 1 ? "" : "s"}.`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`\nThe exercise check failed with ${errors.length} error${errors.length === 1 ? "" : "s"}.`);
    process.exit(1);
  }
  console.log("The exercise check passed.");
  process.exit(0);
}

void main();
