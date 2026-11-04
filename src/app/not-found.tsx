import Link from "next/link";

import { Wordmark } from "@/components/shell/wordmark";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark />
      <div className="flex max-w-sm flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">This page does not exist</h1>
        <p className="text-sm text-ink-muted">
          The address may be mistyped, or the page may have moved.
        </p>
      </div>
      <Link href="/today" className={buttonClasses("secondary")}>
        Go to Today
      </Link>
    </main>
  );
}
