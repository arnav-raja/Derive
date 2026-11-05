"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { WarningIcon } from "@/components/ui/icons";

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
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-rule bg-surface px-6 py-10 text-center shadow-xs sm:px-10">
        <span className="flex size-12 items-center justify-center rounded-full bg-warning-soft text-warning">
          <WarningIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">This page could not load</h1>
          <p className="text-sm text-ink-muted">
            Your work is saved. Try again, and if it keeps happening, the error has been logged
            {error.digest ? (
              <>
                {" "}
                with reference <span className="tabular font-mono text-ink">{error.digest}</span>
              </>
            ) : null}
            .
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/today" className={buttonClasses("secondary")}>
            Go to Today
          </Link>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </main>
  );
}
