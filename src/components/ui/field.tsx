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
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
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
  "w-full rounded-md border border-rule-strong bg-surface px-3 text-base text-ink",
  "placeholder:text-ink-faint focus-visible:border-accent",
  "aria-[invalid=true]:border-incorrect",
);

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
};

export function TextField({ label, hint, error, className, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error}>
      {({ inputId, describedBy }) => (
        <input
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={clsx(inputClasses, "h-10", className)}
          {...props}
        />
      )}
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
