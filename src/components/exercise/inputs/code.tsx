"use client";

import { clsx } from "clsx";

import { CodeEditor } from "@/components/code/editor";
import { CheckIcon, CrossIcon } from "@/components/ui/icons";
import type { BreakitResult, PyError, RunResult } from "@/lib/python/client";

import { changedLines } from "../diff";
import type { BreakitView, CodeView } from "../types";

/* Code, break-it and their results. Python runs in the browser. */

export function ErrorLine({ error }: { error: PyError }) {
  return (
    <p className="font-mono text-sm text-incorrect">
      {error.type}
      {error.line ? ` on line ${error.line}` : ""}: {error.message}
    </p>
  );
}

export function Output({ text, label = "Output" }: { text: string; label?: string }) {
  if (!text) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">{label}</p>
      <pre className="max-h-64 overflow-auto rounded-md border border-rule bg-inset px-3 py-2 font-mono text-sm whitespace-pre-wrap text-ink">
        {text}
      </pre>
    </div>
  );
}

export function TestResults({ result }: { result: RunResult }) {
  const passed = result.tests.filter((t) => t.passed).length;
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      {result.tests.length > 0 ? (
        <p className={clsx("text-sm font-semibold", result.passed ? "text-correct" : "text-ink")}>
          {passed} of {result.tests.length} tests pass
        </p>
      ) : null}
      {result.error && result.tests.length === 0 ? <ErrorLine error={result.error} /> : null}
      <ul className="flex flex-col gap-1">
        {result.tests.map((t) => (
          <li key={t.name} className="flex items-start gap-2 text-sm">
            {t.passed ? (
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-correct" title="Passes" />
            ) : (
              <CrossIcon className="mt-0.5 size-4 shrink-0 text-incorrect" title="Fails" />
            )}
            <span className="min-w-0">
              <span className="text-ink">{t.description || t.name}</span>
              {!t.passed && t.message ? (
                <span className="mt-0.5 block font-mono text-xs text-incorrect">{t.message}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <Output text={result.output} />
    </div>
  );
}

export function CodeInput({
  view,
  label,
  code,
  onCode,
  readOnly,
  showTests,
  onToggleTests,
}: {
  view: CodeView;
  label: string;
  code: string;
  onCode: (code: string) => void;
  readOnly: boolean;
  showTests: boolean;
  onToggleTests: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <CodeEditor value={code} onChange={onCode} label={label} readOnly={readOnly} minLines={8} />
      <div>
        <button
          type="button"
          onClick={onToggleTests}
          aria-expanded={showTests}
          className="text-sm font-medium text-accent hover:text-accent-strong"
        >
          {showTests ? "Hide the tests" : "Show the tests"}
        </button>
        {showTests ? (
          <pre className="mt-2 max-h-72 overflow-auto rounded-md border border-rule bg-inset px-3 py-2 font-mono text-sm text-ink">
            {view.tests.trimEnd()}
          </pre>
        ) : null}
      </div>
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
  const brokenLines = view.broken.trimEnd().split("\n");
  const changed = changedLines(view.code, view.broken);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">The working program</p>
          <pre className="overflow-auto rounded-md border border-rule bg-inset px-3 py-2 font-mono text-sm text-ink">{view.code.trimEnd()}</pre>
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">After the change</p>
          <pre className="overflow-auto rounded-md border border-rule bg-inset py-2 font-mono text-sm text-ink">
            {brokenLines.map((line, i) =>
              changed.has(i) ? (
                <span key={i} className="block border-l-4 border-warning bg-warning-soft pr-3 pl-2">
                  {line || " "}
                  <span className="ml-3 font-sans text-xs font-semibold text-warning select-none">changed</span>
                </span>
              ) : (
                <span key={i} className="block px-3">
                  {line || " "}
                </span>
              ),
            )}
          </pre>
        </div>
      </div>
      <div className="text-base text-ink">{view.change}</div>
      <fieldset className="flex flex-col gap-2" disabled={disabled}>
        <legend className="mb-1 text-sm font-medium text-ink">What happens when the changed program runs?</legend>
        {view.options.map((o) => (
          <label
            key={o.id}
            className={clsx(
              "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2",
              selected === o.id ? "border-accent bg-accent-soft" : "border-rule bg-surface hover:border-rule-strong",
              result && result.matches.includes(o.id) && "border-correct",
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={selected === o.id}
              onChange={() => onSelect(o.id)}
              className="mt-1 size-4 accent-[var(--accent)]"
            />
            <span className="min-w-0 flex-1 text-base text-ink">
              {o.label}
              {result && result.matches.includes(o.id) ? (
                <span className="ml-2 text-sm font-semibold text-correct">This is what happened</span>
              ) : null}
            </span>
          </label>
        ))}
      </fieldset>
      {result ? (
        <div className="flex flex-col gap-2">
          {result.error ? <ErrorLine error={result.error} /> : null}
          <Output text={result.output} label="What the changed program printed" />
        </div>
      ) : null}
    </div>
  );
}
