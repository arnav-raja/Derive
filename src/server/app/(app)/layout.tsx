import Link from "next/link";
import type { ReactNode } from "react";

import { AccountMenu } from "@/components/shell/account-menu";
import { ContinueCard, PhoneTabBar, SidebarNav, SidebarSettingsLink } from "@/components/shell/nav";
import { Wordmark } from "@/components/shell/wordmark";
import { getStore, requireSession } from "@/lib/auth";
import { shellData } from "@/lib/learning/shell";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();
  const store = await getStore();
  const shell = await shellData(store);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm shadow-md focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rule bg-surface lg:flex">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Link href="/today" aria-label="Derive, go to Today" className="rounded-md">
            <Wordmark />
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-3">
          <SidebarNav counts={shell.counts} />
          {shell.current ? <ContinueCard info={shell.current} /> : null}
        </div>
        <div className="flex shrink-0 flex-col gap-1 border-t border-rule p-3">
          <SidebarSettingsLink />
          <AccountMenu email={session.email} name={shell.name} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-rule bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Link href="/today" aria-label="Derive, go to Today" className="rounded-md">
            <Wordmark />
          </Link>
          <AccountMenu email={session.email} name={shell.name} variant="compact" />
        </header>
        <main id="main" className="min-w-0 flex-1 pb-24 lg:pb-0">
          {children}
        </main>
      </div>

      <PhoneTabBar counts={shell.counts} />
    </div>
  );
}
