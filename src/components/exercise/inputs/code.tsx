"use client";

import { clsx } from "clsx";
import { useState, useSyncExternalStore, type ReactNode } from "react";

import { CodeEditor } from "@/components/code/editor";
import { CheckIcon, CollapseIcon, CrossIcon, ExpandIcon, FileIcon, FlaskIcon, PlayIcon, ResetIcon, TerminalIcon } from "@/components/ui/icons";
import type { BreakitResult, PyError, RunResult, RuntimeState } from "@/lib/python/client";

import { changedLines } from "../diff";
import type { BreakitView, CodeView } from "../types";

/*
 * Code, break-it and their results, drawn as a small workbench: a file tab
 * for your code and one for the tests, the editor, a toolbar to run it, and
 * a console with the output and each test's verdict. Python runs in the
 * browser, so nothing leaves the page to be run.
 */

const subscribeNothing = () => () => {};

/** Ctrl on most keyboards, Cmd on a Mac. */
function useModKey(): string {
  return useSyncExternalStore(
    subscribeNothing,
    () => (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? "Cmd" : "Ctrl"),
    () => "Ctrl",
  );
}

function CodeKbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="hidden h-5 items-center rounded-xs border border-code-rule px-1 font-sans text-xs font-medium text-code-muted sm:inline-flex">
      {children}
    </kbd>
  );
}

function ChromeButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-code-muted transition-colors hover:bg-code-active hover:text-code-ink"
    >
      {children}
    </button>
  );
}

export function ErrorLine({ error }: { error: PyError }) {
  return (
    <p className="font-mono text-sm break-words text-code-incorrect">
      {/* StepLimit is the harness's own name for a runaway program, not one of Python's errors. */}
      {error.type === "StepLimit" ? "Stopped" : error.type}
      {error.line ? ` on line ${error.line}` : ""}: {error.message}
    </p>
  );
}

/** Text a program printed, in the console's own style. */
export function Output({ text, label = "Output" }: { text: string; label?: string }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1.5 overflow-hidden rounded-lg border border-code-rule bg-code-bg">
      <p className="flex items-center gap-2 border-b border-code-rule bg-code-chrome px-3 py-1.5 text-xs font-semibold text-code-muted">
        <TerminalIcon className="size-3.5" />
        {label}
      </p>
      <pre className="max-h-64 overflow-auto px-3 pt-1 pb-3 font-mono text-sm whitespace-pre-wrap text-code-ink">{text}</pre>
    </div>
  );
}

function TestList({ result }: { result: RunResult }) {
  const passed = result.tests.filter((t) => t.passed).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <p className={clsx("text-sm font-semibold", result.passed ? "text-code-correct" : "text-code-ink")}>
          <span className="tabular">{passed}</span> of <span className="tabular">{result.tests.length}</span> tests pass
        </p>
        <span aria-hidden="true" className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-code-rule">
          <span
            className={clsx("h-full rounded-full", result.passed ? "bg-code-correct" : "bg-code-warning")}
            style={{ width: `${result.tests.length ? (100 * passed) / result.tests.length : 0}%` }}
          />
        </span>
      </div>
      {result.error && result.tests.length === 0 ? <ErrorLine error={result.error} /> : null}
      <ul className="flex flex-col gap-2">
        {result.tests.map((t) => (
          <li key={t.name} className="flex items-start gap-2.5 text-sm">
            {t.passed ? (
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-code-correct" strokeWidth={2} title="Passes" />
            ) : (
              <CrossIcon className="mt-0.5 size-4 shrink-0 text-code-incorrect" strokeWidth={2} title="Fails" />
            )}
            <span className="min-w-0">
              <span className="text-code-ink">{t.description || t.name}</span>
              {!t.passed && t.message ? (
                <span className="mt-0.5 block font-mono text-xs break-words text-code-incorrect">{t.message}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The test verdicts and what was printed, as a list outside the workbench. */
export function TestResults({ result }: { result: RunResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-code-rule bg-code-bg p-3" aria-live="polite">
      <TestList result={result} />
      {result.output ? <pre className="max-h-64 overflow-auto font-mono text-sm whitespace-pre-wrap text-code-ink">{result.output}</pre> : null}
    </div>
  );
}

const RUNTIME_WORDS: Record<RuntimeState, string> = {
  idle: "Python starts when you run",
  loading: "Starting Python",
  ready: "Python ready",
  error: "Python could not start",
};

type ConsoleTab = "tests" | "output";

function Console({ run, fill, hasTests }: { run: RunResult | null; fill: boolean; hasTests: boolean }) {
  const [chosen, setChosen] = useState<ConsoleTab | null>(null);
  const tab: ConsoleTab = chosen ?? (run && run.tests.length > 0 ? "tests" : "output");
  const passed = run ? run.tests.filter((t) => t.passed).length : 0;
  const tabs: { id: ConsoleTab; label: ReactNode; icon: ReactNode }[] = [
    {
      id: "tests",
      icon: <FlaskIcon className="size-3.5" />,
      label: (
        <>
          Tests
          {run && run.tests.length > 0 ? (
            <span className={clsx("tabular", run.passed ? "text-code-correct" : "text-code-warning")}>
              {passed}/{run.tests.length}
            </span>
          ) : null}
        </>
      ),
    },
    { id: "output", icon: <TerminalIcon className="size-3.5" />, label: "Console" },
  ];
  return (
    <div className={clsx("flex flex-col border-t border-code-rule bg-code-bg", fill ? "h-[38%] min-h-40" : null)}>
      <div role="tablist" aria-label="Results" className="flex h-9 shrink-0 items-end gap-1 border-b border-code-rule bg-code-chrome px-2">
        {tabs
          .filter((t) => hasTests || t.id === "output")
          .map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setChosen(t.id)}
              className={clsx(
                "-mb-px flex h-8 items-center gap-1.5 border-b-2 px-2.5 text-xs font-semibold transition-colors",
                tab === t.id ? "border-accent text-code-ink" : "border-transparent text-code-muted hover:text-code-ink",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
      </div>
      <div role="tabpanel" aria-live="polite" className={clsx("overflow-auto px-4 py-3", fill ? "min-h-0 flex-1" : "max-h-72")}>
        {!run ? (
          <p className="font-mono text-sm text-code-muted">
            {tab === "tests" ? "Run the tests to see which pass." : "Run your code to see what it prints."}
          </p>
        ) : tab === "tests" ? (
          run.tests.length > 0 ? (
            <TestList result={run} />
          ) : (
            <p className="font-mono text-sm text-code-muted">
              {run.error
                ? "The script stopped before any test could run. The Console shows where."
                : "This run had no tests. Run the tests to check your code."}
            </p>
          )
        ) : (
          // In the order Python gives them: what was printed, then the error that stopped it.
          <div className="flex flex-col gap-2">
            {run.output || !run.error ? (
              <pre className="font-mono text-sm whitespace-pre-wrap text-code-ink">
                {run.output || <span className="text-code-muted">(nothing printed)</span>}
              </pre>
            ) : null}
            {run.error ? <ErrorLine error={run.error} /> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function CodeWorkbench({
  view,
  label,
  code,
  onCode,
  readOnly,
  onRun,
  onCheck,
  status,
  busy,
  run,
  fill = false,
  onExpand,
  onCollapse,
  onReset,
}: {
  view: CodeView;
  label: string;
  code: string;
  onCode: (code: string) => void;
  readOnly: boolean;
  onRun: () => void;
  /** Runs the tests and records the answer; absent once the answer is final. */
  onCheck: (() => void) | null;
  status: RuntimeState;
  busy: string | null;
  run: RunResult | null;
  fill?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  onReset?: () => void;
}) {
  const [file, setFile] = useState("main");
  const mod = useModKey();
  const hasTests = view.tests.trim().length > 0;
  // Your code, then the tests and each file the program can open, which are read-only.
  const files: { id: string; name: string; icon: ReactNode; text?: string }[] = [
    { id: "main", name: "solution.py", icon: <FileIcon className="size-3.5" /> },
  ];
  if (hasTests) files.push({ id: "tests", name: "tests.py", icon: <FlaskIcon className="size-3.5" />, text: view.tests });
  for (const [name, text] of Object.entries(view.files ?? {})) {
    files.push({ id: `file:${name}`, name, icon: <FileIcon className="size-3.5" />, text });
  }
  const shown = files.find((f) => f.id === file);
  return (
    <div
      className={clsx(
        "flex flex-col overflow-hidden rounded-lg border border-code-rule bg-code-bg font-sans text-code-ink shadow-sm",
        fill && "h-full min-h-0",
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-2 border-b border-code-rule bg-code-chrome pr-1.5 pl-1">
        <div role="tablist" aria-label="Files" className="flex h-full min-w-0 items-end overflow-x-auto">
          {files.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={file === f.id}
              onClick={() => setFile(f.id)}
              className={clsx(
                "flex h-9 shrink-0 items-center gap-1.5 rounded-t-md border-x border-t px-3 font-mono text-xs transition-colors",
                file === f.id
                  ? "border-code-rule bg-code-bg text-code-ink"
                  : "border-transparent text-code-muted hover:text-code-ink",
              )}
            >
              {f.icon}
              {f.name}
              {f.id !== "main" ? <span className="hidden font-sans text-code-muted sm:inline">read-only</span> : null}
            </button>
          ))}
        </div>
        <div className="flex items-center">
          {onReset && !readOnly ? (
            <ChromeButton label="Start again from the starting code" onClick={onReset}>
              <ResetIcon className="size-4" />
            </ChromeButton>
          ) : null}
          {onExpand ? (
            <ChromeButton label="Open in the full-screen editor" onClick={onExpand}>
              <ExpandIcon className="size-4" />
            </ChromeButton>
          ) : null}
          {onCollapse ? (
            <ChromeButton label="Back to the lesson" onClick={onCollapse}>
              <CollapseIcon className="size-4" />
            </ChromeButton>
          ) : null}
        </div>
      </div>

      <div className={clsx(fill && "min-h-0 flex-1 overflow-hidden")}>
        {file === "main" ? (
          <CodeEditor
            value={code}
            onChange={onCode}
            label={label}
            readOnly={readOnly}
            minLines={8}
            fill={fill}
            onRun={onRun}
            onCheck={onCheck ?? undefined}
          />
        ) : (
          <pre
            className={clsx(
              "overflow-auto px-5 py-3 font-mono text-sm leading-relaxed text-code-ink",
              fill ? "h-full" : "max-h-96 min-h-52",
            )}
          >
            {(shown?.text ?? "").trimEnd()}
          </pre>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-code-rule bg-code-chrome px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={busy !== null}
            className="inline-flex h-8 items-center gap-2 rounded-md border border-code-rule bg-code-bg px-3 text-sm font-semibold text-code-ink transition-colors hover:bg-code-active disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlayIcon className="size-3.5 text-code-correct" />
            Run
            <CodeKbd>{mod} Enter</CodeKbd>
          </button>
          {onCheck ? (
            <button
              type="button"
              onClick={onCheck}
              disabled={busy !== null}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FlaskIcon className="size-3.5" />
              Run the tests
            </button>
          ) : null}
        </div>
        <p role="status" className="flex items-center gap-2 text-xs text-code-muted">
          <span
            aria-hidden="true"
            className={clsx(
              "size-2 rounded-full",
              busy || status === "loading" ? "animate-pulse-soft bg-code-warning" : status === "ready" ? "bg-code-correct" : status === "error" ? "bg-code-incorrect" : "bg-code-muted",
            )}
          />
          {busy ?? RUNTIME_WORDS[status]}
        </p>
      </div>

      <Console run={run} fill={fill} hasTests={hasTests} />
    </div>
  );
}

/** A program shown for reading, with its line numbers, optionally marking the lines a change touched. */
function ReadOnlyProgram({ title, code, changed }: { title: string; code: string; changed?: Set<number> }) {
  const lines = code.trimEnd().split("\n");
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-code-rule bg-code-bg">
      <p className="flex items-center gap-2 border-b border-code-rule bg-code-chrome px-3 py-2 font-sans text-xs font-semibold text-code-muted">
        <FileIcon className="size-3.5" />
        {title}
      </p>
      <pre className="overflow-x-auto py-2.5 font-mono text-sm leading-relaxed text-code-ink">
        {lines.map((line, i) => {
          const isChanged = changed?.has(i) ?? false;
          return (
            <span key={i} className={clsx("flex border-l-2", isChanged ? "border-code-warning bg-code-changed" : "border-transparent")}>
              <span aria-hidden="true" className="w-10 shrink-0 pr-3 text-right text-code-muted select-none">
                {i + 1}
              </span>
              <span className="pr-4">{line || " "}</span>
              {isChanged ? <span className="ml-auto pr-3 font-sans text-xs font-semibold text-code-warning select-none">changed</span> : null}
            </span>
          );
        })}
      </pre>
    </div>
  );
}

export function BreakitInput({
  view,
  name,
  selected,
  onSelect,
  disabled,
  result,
}: {
  view: BreakitView;
  name: string;
  selected: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  result: BreakitResult | null;
}) {
  const changed = changedLines(view.code, view.broken);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3">
        <ReadOnlyProgram title="The working program" code={view.code} />
        <ReadOnlyProgram title="After the change" code={view.broken} changed={changed} />
      </div>
      <div className="text-base text-ink">{view.change}</div>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold text-ink">What happens when the changed program runs?</legend>
        {view.options.map((o, i) => {
          const happened = result?.matches.includes(o.id) ?? false;
          const isSelected = selected === o.id;
          return (
            <label
              key={o.id}
              className={clsx(
                "group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                happened
                  ? "border-correct bg-correct-soft"
                  : isSelected
                    ? "border-accent bg-accent-soft"
                    : "border-rule bg-surface hover:border-rule-strong hover:bg-inset/60",
                disabled && "cursor-default",
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={isSelected}
                aria-label={o.text}
                onChange={() => onSelect(o.id)}
                className="peer sr-only"
              />
              <span
                aria-hidden="true"
                className={clsx(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border text-xs font-semibold",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                  isSelected ? "border-accent bg-accent text-on-accent" : "border-rule-strong bg-surface text-ink-muted",
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0 flex-1 pt-0.5 text-base text-ink">
                {o.label}
                {happened ? (
                  <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-correct">
                    <CheckIcon className="size-4" strokeWidth={2} /> This is what happened
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </fieldset>
      {result ? (
        <div className="flex flex-col gap-2">
          <Output text={result.output} label="What the changed program printed" />
          {result.error ? (
            <div className="rounded-lg border border-code-rule bg-code-bg px-3 py-2">
              <ErrorLine error={result.error} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
