"use client";

import { clsx } from "clsx";

import { inputClasses } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";

import type { ChoiceView, NumberView, StepsView } from "../types";

/* The small answer inputs: choices, numbers and justified steps. */

export function ChoiceInput({
  view,
  name,
  selected,
  onChange,
  disabled,
  correct,
}: {
  view: ChoiceView;
  name: string;
  selected: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
  /** After the reveal: which options were right. */
  correct?: string[];
}) {
  const type = view.multiple ? "checkbox" : "radio";
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="sr-only">{view.multiple ? "Choose every option that holds" : "Choose one option"}</legend>
      {view.multiple ? <p className="text-sm font-medium text-ink-muted">Choose every option that holds.</p> : null}
      {view.options.map((o, i) => {
        const checked = selected.includes(o.id);
        const right = correct?.includes(o.id) ?? false;
        return (
          <label
            key={o.id}
            className={clsx(
              "group flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-base transition-colors",
              right
                ? "border-correct bg-correct-soft"
                : checked
                  ? "border-accent bg-accent-soft"
                  : "border-rule bg-surface hover:border-rule-strong hover:bg-inset/60",
              disabled && "cursor-default",
            )}
          >
            <input
              type={type}
              name={name}
              value={o.id}
              checked={checked}
              aria-label={o.text}
              onChange={(e) => {
                if (view.multiple) onChange(e.target.checked ? [...selected, o.id] : selected.filter((s) => s !== o.id));
                else onChange([o.id]);
              }}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={clsx(
                "flex size-6 shrink-0 items-center justify-center border text-xs font-semibold transition-colors",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                view.multiple ? "rounded-sm" : "rounded-md",
                checked ? "border-accent bg-accent text-on-accent" : "border-rule-strong bg-surface text-ink-muted group-hover:border-ink-faint",
              )}
            >
              {view.multiple && checked ? <CheckIcon className="size-3.5" strokeWidth={2.5} /> : String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1 pt-0.5 text-ink">{o.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

export function NumberInput({
  view,
  id,
  value,
  onChange,
  working,
  onWorking,
  disabled,
  estimate,
}: {
  view: NumberView;
  id: string;
  value: string;
  onChange: (v: string) => void;
  working: string;
  onWorking: (v: string) => void;
  disabled: boolean;
  estimate: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-value`} className="text-sm font-semibold text-ink">
          {estimate ? "Your estimate" : "Your answer"}
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`${id}-value`}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            aria-describedby={`${id}-forms`}
            className={clsx(inputClasses, "tabular h-11 max-w-xs font-mono")}
          />
          {view.unit ? <span className="text-base text-ink-muted">{view.unit}</span> : null}
        </div>
        {/* Several shapes, so the help never hints at the size or form of this answer. */}
        <p id={`${id}-forms`} className="text-sm text-ink-muted">
          Whole numbers, decimals, fractions such as 3/8, and powers of ten such as 6.2e23 or 6.2 × 10^23 all work.
        </p>
        {estimate && view.factor ? (
          <p className="text-sm text-ink-muted">An estimate within a factor of {view.factor} either way counts.</p>
        ) : null}
      </div>
      {estimate ? (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-working`} className="text-sm font-semibold text-ink">
            Your working <span className="font-normal text-ink-muted">(optional, but the tutor reads it)</span>
          </label>
          <textarea
            id={`${id}-working`}
            rows={3}
            value={working}
            onChange={(e) => onWorking(e.target.value)}
            disabled={disabled}
            className={clsx(inputClasses, "resize-y py-2")}
            placeholder="The quantities you multiplied, and the value you used for each"
          />
        </div>
      ) : null}
    </div>
  );
}

export function StepsInput({
  view,
  id,
  rules,
  onChange,
  disabled,
}: {
  view: StepsView;
  id: string;
  rules: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-rule bg-inset/50 px-4 py-3">
        <p className="text-sm font-semibold text-ink">The rules you can cite</p>
        <ul className="mt-1.5 flex flex-col gap-1 text-sm text-ink">
          {view.rules.map((r) => (
            <li key={r.id}>
              {r.name ? <span className="font-semibold text-ink">{r.name}: </span> : null}
              {r.label}
            </li>
          ))}
        </ul>
      </div>
      <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-rule bg-surface px-4 py-2.5 text-base">{view.start}</div>
      <ol className="flex flex-col gap-2">
        {view.lines.map((line, i) => (
          <li key={i} className="flex flex-col gap-2 rounded-lg border border-rule bg-surface px-4 py-3">
            <div className="flex items-baseline gap-3">
              <span className="tabular shrink-0 text-xs font-semibold text-ink-muted">Line {i + 1}</span>
              <div className="min-w-0 overflow-x-auto overflow-y-hidden py-1 text-base">{line.math}</div>
            </div>
            <label className="flex flex-col gap-1 text-sm">
              <span className="sr-only">The rule that justifies line {i + 1}</span>
              <select
                id={`${id}-rule-${i}`}
                value={rules[i] ?? ""}
                onChange={(e) => {
                  const next = [...rules];
                  next[i] = e.target.value;
                  onChange(next);
                }}
                disabled={disabled}
                className={clsx(inputClasses, "h-10 w-full max-w-lg")}
              >
                <option value="">Choose the rule</option>
                {view.rules.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.text}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
