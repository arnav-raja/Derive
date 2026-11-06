import Link from "next/link";

import { Wordmark } from "@/components/shell/wordmark";
import { buttonClasses } from "@/components/ui/button";
import { ArrowRightIcon, MapIcon } from "@/components/ui/icons";

/** The panel for an address that has no page. */
export function NotFoundPanel() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-4 py-12">
      <Link href="/today" aria-label="Derive, go to Today" className="rounded-md">
        <Wordmark />
      </Link>
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-rule bg-surface px-6 py-10 text-center shadow-xs sm:px-10">
        <span className="flex size-12 items-center justify-center rounded-full bg-inset text-ink-muted">
          <MapIcon className="size-5" />
        </span>
        <div className="flex flex-col gap-2">
          <p className="tabular text-sm font-semibold text-accent">Error 404</p>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">This page does not exist</h1>
          <p className="text-sm text-ink-muted">The address may be mistyped, or the page may have moved.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/curriculum" className={buttonClasses("secondary")}>
            Browse the curriculum
          </Link>
          <Link href="/today" className={buttonClasses("primary")}>
            Go to Today
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
