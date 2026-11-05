/*
 * Runs Derive's Python harness in Node with the same Pyodide build the browser
 * uses, so the exercise checks verify exactly what the learner's browser runs.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { loadPyodide } from "pyodide";

import type {
  BreakitResult,
  ExpressionResult,
  RunResult,
  TraceResult,
} from "../../src/lib/python/client";

export type FingerprintResult = {
  points: Record<string, string>[];
  values: string[];
  formMessage: string | null;
  unknown: string[];
  latex: string;
};

export type NodePython = Awaited<ReturnType<typeof startPython>>;

export async function startPython() {
  const root = process.cwd();
  const py = await loadPyodide({
    indexURL: `${path.join(root, "node_modules/pyodide")}/`,
    stdout: () => {},
    stderr: () => {},
  });
  py.FS.mkdirTree("/home/pyodide/derive");
  py.FS.writeFile(
    "/home/pyodide/derive/derive_harness.py",
    readFileSync(path.join(root, "public/workers/harness.py"), "utf8"),
  );
  py.runPython("import sys\nsys.path.insert(0, '/home/pyodide/derive')\nimport derive_harness");
  const harness = py.pyimport("derive_harness") as Record<string, (text: string) => string>;
  const manifest = JSON.parse(
    readFileSync(path.join(root, "public/pyodide/manifest.json"), "utf8"),
  ) as { wheels: Record<string, string> };

  let sympyLoaded = false;
  const call = <T>(name: string, payload: unknown): T =>
    JSON.parse(harness[name]!(JSON.stringify(payload))) as T;
  // As in the browser worker: SymPy is loaded only when learner code imports it.
  const needsSympy = (p: { code?: string; broken?: string; tests?: string }) =>
    /\b(?:import|from)\s+sympy\b/.test(`${p.code ?? ""}\n${p.broken ?? ""}\n${p.tests ?? ""}`);

  const api = {
    loadSympy() {
      if (sympyLoaded) return;
      const site = py.runPython("import site\nsite.getsitepackages()[0]") as string;
      for (const name of ["mpmath", "sympy"]) {
        const url = manifest.wheels[name];
        if (!url) throw new Error(`The ${name} wheel is missing; run npm install.`);
        const file = path.join(root, "public", url);
        py.unpackArchive(new Uint8Array(readFileSync(file)), "wheel", { extractDir: site });
      }
      py.runPython("import sympy");
      sympyLoaded = true;
    },
    run: (payload: { code: string; tests?: string; maxSteps?: number; stdin?: string[]; files?: Record<string, string> }) => {
      if (needsSympy(payload)) api.loadSympy();
      return call<RunResult>("run_json", payload);
    },
    breakit: (payload: { code: string; broken: string; options: { id: string; when: string }[]; maxSteps?: number }) => {
      if (needsSympy(payload)) api.loadSympy();
      return call<BreakitResult>("breakit_json", payload);
    },
    trace: (payload: { code: string; maxEvents?: number; stdin?: string[] }) => {
      if (needsSympy(payload)) api.loadSympy();
      return call<TraceResult>("trace_json", payload);
    },
    checkExpression: (payload: {
      input: string;
      symbols: { name: string; positive?: boolean; integer?: boolean }[];
      points: Record<string, string>[];
      values: string[];
      form: Record<string, unknown>;
    }) => call<ExpressionResult>("check_expression_json", payload),
    fingerprint: (payload: {
      reference: string;
      symbols: { name: string; positive?: boolean; integer?: boolean }[];
      form: Record<string, unknown>;
      seed: string;
      count?: number;
    }) => call<FingerprintResult>("fingerprint_json", payload),
  };
  return api;
}
