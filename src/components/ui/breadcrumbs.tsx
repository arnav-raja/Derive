import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRightIcon } from "./icons";

/** Where a page sits: Curriculum, then the course, then the lesson. The last item is the page itself. */
export function Breadcrumbs({ items, className }: { items: { href?: string; label: ReactNode }[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-muted">
        {items.map((item, i) => (
          <li key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 ? <ChevronRightIcon className="size-3.5 shrink-0 text-ink-faint" /> : null}
            {item.href ? (
              <Link href={item.href} className="truncate rounded-xs font-medium transition-colors hover:text-ink">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-ink">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
