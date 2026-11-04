"use client";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en-IN">
      <body className="bg-paper text-ink">
        <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
          <div className="flex max-w-md flex-col gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Derive could not load</h1>
            <p className="text-sm text-ink-muted">
              Your work is saved. Try again in a moment
              {error.digest ? `; the error reference is ${error.digest}` : ""}.
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="h-10 rounded-md border border-rule-strong bg-surface px-4 text-sm font-medium"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
