import { Suspense } from "react";

import { NotFoundPanel } from "@/components/shell/not-found-panel";
import { WireOutlet } from "@/lib/wire/client";

/*
 * What every static page GitHub Pages serves holds: a place for the page's
 * content, which Derive's server renders for the signed-in learner.
 */
export function WiredPage() {
  return (
    <Suspense fallback={<p className="sr-only" role="status">Loading</p>}>
      <WireOutlet notFound={<NotFoundPanel />} />
    </Suspense>
  );
}
