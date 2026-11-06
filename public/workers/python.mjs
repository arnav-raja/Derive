// Derive's Python worker. Loads Pyodide from Derive's own address, then runs
// the harness (harness.py) for code runs, tests, break-it outcomes, traces and
// SymPy checks. Messages are { id, type, payload }; replies are
// { id, ok, result } or { id, ok: false, error }, plus { type: "status" } events.

let pyodide = null;
let harness = null;
let manifest = null;
let starting = null;
let sympyLoading = null;

function status(state, detail) {
  self.postMessage({ type: "status", state, detail });
}

async function start() {
  if (harness) return;
  starting ??= (async () => {
    status("loading", "Starting Python");
    manifest = await (await fetch("/pyodide/manifest.json", { cache: "no-cache" })).json();
    const { loadPyodide } = await import(`${manifest.indexURL}pyodide.mjs`);
    pyodide = await loadPyodide({
      indexURL: manifest.indexURL,
      stdout: () => {},
      stderr: () => {},
      // A fixed hash seed, so that sets of strings and SymPy's searches come out the
      // same on every run, as they do in the checks (scripts/lib/python-node.ts).
      env: { PYTHONHASHSEED: "0" },
    });
    const source = await (await fetch("/workers/harness.py", { cache: "no-cache" })).text();
    pyodide.FS.mkdirTree("/home/pyodide/derive");
    pyodide.FS.writeFile("/home/pyodide/derive/derive_harness.py", source);
    pyodide.runPython(
      "import sys\nsys.path.insert(0, '/home/pyodide/derive')\nimport derive_harness",
    );
    harness = pyodide.pyimport("derive_harness");
    status("ready");
  })();
  try {
    await starting;
  } catch (error) {
    starting = null;
    status("error", String(error?.message ?? error));
    throw error;
  }
}

async function ensureSympy() {
  sympyLoading ??= (async () => {
    status("loading", "Loading SymPy");
    const site = pyodide.runPython("import site\nsite.getsitepackages()[0]");
    for (const name of ["mpmath", "sympy"]) {
      const url = manifest.wheels[name];
      if (!url) throw new Error(`The ${name} wheel is missing from the manifest.`);
      const buffer = await (await fetch(url)).arrayBuffer();
      pyodide.unpackArchive(new Uint8Array(buffer), "wheel", { extractDir: site });
    }
    pyodide.runPython("import sympy");
    status("ready");
  })();
  try {
    await sympyLoading;
  } catch (error) {
    sympyLoading = null;
    throw error;
  }
}

// Learner code may import SymPy, the library version of symbolic algebra; load it only then.
const SYMPY_IMPORT = /\b(?:import|from)\s+sympy\b/;
function needsSympy(payload) {
  return SYMPY_IMPORT.test(`${payload?.code ?? ""}\n${payload?.broken ?? ""}\n${payload?.tests ?? ""}`);
}

function call(name, payload) {
  return JSON.parse(harness[name](JSON.stringify(payload)));
}

self.onmessage = async (event) => {
  const { id, type, payload } = event.data ?? {};
  try {
    await start();
    let result;
    switch (type) {
      case "warm":
        if (payload?.sympy) await ensureSympy();
        result = { ready: true };
        break;
      case "run":
        if (needsSympy(payload)) await ensureSympy();
        result = call("run_json", payload);
        break;
      case "breakit":
        if (needsSympy(payload)) await ensureSympy();
        result = call("breakit_json", payload);
        break;
      case "trace":
        if (needsSympy(payload)) await ensureSympy();
        result = call("trace_json", payload);
        break;
      case "expression":
        await ensureSympy();
        result = call("check_expression_json", payload);
        break;
      default:
        throw new Error(`Unknown request: ${type}`);
    }
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    // After a fatal error Pyodide can run nothing more, and an overflow of the JavaScript stack
    // can leave it unsound, so the page starts a new worker for the next request.
    const message = String(error?.message ?? error);
    const fatal = Boolean(error?.pyodide_fatal_error) || /fatal|maximum call stack/i.test(message);
    self.postMessage({ id, ok: false, error: message, fatal });
  }
};
