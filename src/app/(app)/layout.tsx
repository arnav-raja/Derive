import Link from "next/link";
import type { ReactNode } from "react";

import { AccountMenu } from "@/components/shell/account-menu";
import { PhoneTabBar, TopNav } from "@/components/shell/nav";
import { Wordmark } from "@/components/shell/wordmark";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const session = await requireSession();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/today" aria-label="Derive, go to Today" className="rounded-sm">
              <Wordmark />
            </Link>
            <TopNav />
          </div>
          <AccountMenu email={session.email} />
        </div>
      </header>
      <main id="main" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <PhoneTabBar />
    </div>
  );
}
