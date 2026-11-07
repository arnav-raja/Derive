"use client";

import { useEffect } from "react";

import { PageError } from "@/components/shell/page-error";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageError
      retry={reset}
      detail={error.digest ? `Try again, and if it keeps happening, the error has been logged with reference ${error.digest}.` : undefined}
    />
  );
}
