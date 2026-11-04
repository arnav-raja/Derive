"use client";

import { useState, useTransition, type ReactNode } from "react";

import { Button } from "./button";
import type { ButtonSize, ButtonVariant } from "./button";

type Result = { ok: true; message?: string | null } | { ok: false; error: string } | void;

/**
 * A button that runs a bound server action and says plainly why it was
 * refused, when it is. Actions that succeed usually redirect or refresh.
 */
export function ActionButton({
  action,
  children,
  pendingText = "Working",
  variant = "primary",
  size = "md",
}: {
  action: () => Promise<Result>;
  children: ReactNode;
  pendingText?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        variant={variant}
        size={size}
        disabled={pending}
        onClick={() => {
          setError(null);
          setMessage(null);
          start(async () => {
            const r = await action();
            if (r && !r.ok) setError(r.error);
            else if (r && r.ok && r.message) setMessage(r.message);
          });
        }}
      >
        {pending ? pendingText : children}
      </Button>
      {error ? (
        <p role="alert" className="max-w-md text-sm text-incorrect">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="max-w-md text-sm text-ink-muted">
          {message}
        </p>
      ) : null}
    </div>
  );
}
