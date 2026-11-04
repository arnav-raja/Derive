"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex max-w-md flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">This page could not load</h1>
        <p className="text-sm text-ink-muted">
          Your work is saved. Try again, and if it keeps happening, the error has been logged
          {error.digest ? ` with reference ${error.digest}` : ""}.
        </p>
      </div>
      <Button variant="secondary" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
