"use client";

import { clsx } from "clsx";
import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";

type FieldShellProps = {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode;
};

function FieldShell({ label, hint, error, children }: FieldShellProps) {
  const inputId = useId();
  const hintId = useId();
  const errorId = useId();
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {children({ inputId, describedBy: describedBy || undefined })}
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs font-medium text-incorrect">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const inputClasses = clsx(
  "w-full rounded-md border border-rule-strong bg-surface px-3 text-base text-ink shadow-xs",
  "transition-[border-color,box-shadow] duration-150 placeholder:text-ink-faint hover:border-ink-faint",
  "focus-visible:border-accent",
  "disabled:cursor-not-allowed disabled:bg-inset disabled:text-ink-muted",
  "aria-[invalid=true]:border-incorrect",
);

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** A unit joined to the input's left or right edge, such as "$" or "hours a week". The label must say it too. */
  leading?: ReactNode;
  trailing?: ReactNode;
};

const affixClasses = "inline-flex shrink-0 items-center border border-rule-strong bg-inset px-3 text-sm whitespace-nowrap text-ink-muted";

export function TextField({ label, hint, error, className, leading, trailing, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy }) => {
        const input = (
          <input
            id={inputId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            className={clsx(
              inputClasses,
              "h-10",
              (leading || trailing) && "relative min-w-0 flex-1 focus-visible:z-10",
              leading && "rounded-l-none",
              trailing && "rounded-r-none",
              className,
            )}
            {...props}
          />
        );
        if (!leading && !trailing) return input;
        return (
          <div className="flex">
            {leading ? (
              <span aria-hidden="true" className={clsx(affixClasses, "rounded-l-md border-r-0")}>
                {leading}
              </span>
            ) : null}
            {input}
            {trailing ? (
              <span aria-hidden="true" className={clsx(affixClasses, "rounded-r-md border-l-0")}>
                {trailing}
              </span>
            ) : null}
          </div>
        );
      }}
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
};

export function TextAreaField({ label, hint, error, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy }) => (
        <textarea
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={clsx(inputClasses, "min-h-28 py-2 leading-6", className)}
          {...props}
        />
      )}
    </FieldShell>
  );
}
