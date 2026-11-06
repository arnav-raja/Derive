/*
 * The browser side of in-browser Python: one web worker, started on first use,
 * running Pyodide from Derive's own address. A request that runs too long ends
 * the worker, which starts again on the next request.
 */

export type PyError = { type: string; message: string; line?: number | null; col?: number | null };

export type TestResult = {
  name: string;
  description: string;
  passed: boolean;
  message: string | null;
  line?: number | null;
};

export type RunResult = { output: string; error: PyError | null; tests: TestResult[]; passed: boolean };

export type BreakitResult = {
  matches: string[];
  output: string;
  error: PyError | null;
  baseOutput: string;
  baseError: PyError | null;
};

/**
 * One frame of the stack. `refs` gives, for each name that refers to a list, dict or set, that
 * object's tag for the whole trace, such as "list 1", so two names for one list share a tag.
 * `digests` gives a fingerprint of each such value's whole text, since `variables` cuts a long
 * value at 80 characters and a change further along would not show in it.
 */
export type TraceFrame = {
  function: string;
  /** A call of a function, as it began, such as `countdown(2)`; absent for the main program. */
  call?: string;
  line: number;
  variables: Record<string, string>;
  /** The tag of each name that refers to a list, dict or set, or to an object of the program's own classes, such as `Config 1`. */
  refs?: Record<string, string>;
  digests?: Record<string, number>;
  /** Each attribute, one by one, of an object that a name refers to, so that a question can ask for `self.count`. */
  attrs?: Record<string, Record<string, string>>;
};
export type TraceStep = {
  event: "line" | "return";
  line: number;
  stack: TraceFrame[];
  output: string;
  /** What the call gave back, at a return. */
  returned?: string;
  /** The error that stopped the call, at a return that gave nothing back. */
  raised?: string;
};
export type TraceResult = { steps: TraceStep[]; error: PyError | null; output: string };

export type ExpressionStatus = "correct" | "different" | "form" | "unparsed" | "unknown-names" | "empty";
export type ExpressionResult = { status: ExpressionStatus; message?: string; latex?: string };

export type RuntimeState = "idle" | "loading" | "ready" | "error";
export type RuntimeStatus = { state: RuntimeState; detail?: string };

type Pending = { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: number };

export class PythonTimeout extends Error {
  constructor() {
    super("The code ran for too long and was stopped.");
    this.name = "PythonTimeout";
  }
}

class PythonRuntime {
  private worker: Worker | null = null;
  private pending = new Map<number, Pending>();
  private nextId = 1;
  private status: RuntimeStatus = { state: "idle" };
  private listeners = new Set<() => void>();

  getStatus = (): RuntimeStatus => this.status;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private setStatus(next: RuntimeStatus) {
    this.status = next;
    for (const l of this.listeners) l();
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker("/workers/python.mjs", { type: "module", name: "derive-python" });
    worker.onmessage = (event: MessageEvent) => {
      const data = event.data as
        | { type: "status"; state: RuntimeState; detail?: string }
        | { id: number; ok: boolean; result?: unknown; error?: string; fatal?: boolean };
      if ("type" in data && data.type === "status") {
        this.setStatus({ state: data.state, detail: data.detail });
        return;
      }
      if (!("id" in data)) return;
      const entry = this.pending.get(data.id);
      if (!entry) return;
      this.pending.delete(data.id);
      window.clearTimeout(entry.timer);
      if (data.ok) entry.resolve(data.result);
      else {
        entry.reject(new Error(data.error ?? "Python failed."));
        // Pyodide can run nothing after a fatal error, so the next request starts a new worker.
        if (data.fatal) this.reset(new Error("Python stopped unexpectedly."));
      }
    };
    worker.onerror = (event) => {
      this.setStatus({ state: "error", detail: event.message });
      this.reset(new Error(event.message || "Python stopped unexpectedly."));
    };
    this.worker = worker;
    if (this.status.state === "idle") this.setStatus({ state: "loading", detail: "Starting Python" });
    return worker;
  }

  /** Ends the worker and fails everything waiting on it. */
  private reset(error: Error) {
    this.worker?.terminate();
    this.worker = null;
    for (const [, entry] of this.pending) {
      window.clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
    this.setStatus({ state: "idle" });
  }

  private request<T>(type: string, payload: unknown, timeoutMs: number): Promise<T> {
    const worker = this.ensureWorker();
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new PythonTimeout());
        this.reset(new PythonTimeout());
      }, timeoutMs);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timer });
      worker.postMessage({ id, type, payload });
    });
  }

  /** Starts Python (and SymPy) ahead of time so the first check is quick. */
  warm(options: { sympy?: boolean } = {}) {
    return this.request<{ ready: boolean }>("warm", options, 120_000).catch(() => undefined);
  }

  run(payload: {
    code: string;
    tests?: string;
    maxSteps?: number;
    stdin?: string[];
    files?: Record<string, string>;
  }) {
    // The first run also starts Python, which can take several seconds.
    return this.request<RunResult>("run", payload, this.status.state === "ready" ? 20_000 : 90_000);
  }

  breakit(payload: {
    code: string;
    broken: string;
    options: { id: string; when: string }[];
    maxSteps?: number;
  }) {
    return this.request<BreakitResult>("breakit", payload, this.status.state === "ready" ? 20_000 : 90_000);
  }

  trace(payload: { code: string; maxEvents?: number; stdin?: string[] }) {
    return this.request<TraceResult>("trace", payload, this.status.state === "ready" ? 20_000 : 90_000);
  }

  checkExpression(payload: {
    input: string;
    symbols: { name: string; positive?: boolean; integer?: boolean }[];
    points: Record<string, string>[];
    values: string[];
    form: Record<string, unknown>;
  }) {
    return this.request<ExpressionResult>("expression", payload, 120_000);
  }
}

let runtime: PythonRuntime | null = null;

/** The shared runtime. Only call from the browser. */
export function python(): PythonRuntime {
  runtime ??= new PythonRuntime();
  return runtime;
}
