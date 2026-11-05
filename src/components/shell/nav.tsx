"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { CountBadge } from "@/components/ui/badge";
import { BookIcon, HomeIcon, NotebookIcon, ProgressIcon, ReviewIcon, SettingsIcon } from "@/components/ui/icons";
import { SegmentedProgress } from "@/components/ui/progress";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Other paths that belong to this item, such as course pages under the curriculum. */
  also?: string[];
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: HomeIcon },
  { href: "/curriculum", label: "Curriculum", icon: BookIcon, also: ["/courses", "/lessons", "/placement"] },
  { href: "/review", label: "Review", icon: ReviewIcon },
  { href: "/notebook", label: "Notebook", icon: NotebookIcon },
  { href: "/progress", label: "Progress", icon: ProgressIcon },
];

export type NavCounts = { reviewsDue: number; openNotes: number };

export type ContinueInfo = {
  code: string;
  title: string;
  href: string;
  phaseTitle: string;
  phases: ("done" | "current" | "todo")[];
};

function isActive(pathname: string, item: Pick<NavItem, "href" | "also">) {
  return [item.href, ...(item.also ?? [])].some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

function count(item: NavItem, counts: NavCounts) {
  if (item.href === "/review") return <CountBadge count={counts.reviewsDue} label="reviews due" />;
  if (item.href === "/notebook") return <CountBadge count={counts.openNotes} label="open notes" tone="neutral" />;
  return null;
}

/** The main navigation down the sidebar, from laptop width up. */
export function SidebarNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-inset hover:text-ink",
                )}
              >
                <Icon className={clsx("size-4 shrink-0", active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted")} />
                <span className="flex-1">{item.label}</span>
                {count(item, counts)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Settings sits apart from the main sections, at the foot of the sidebar. */
export function SidebarSettingsLink() {
  const pathname = usePathname();
  const active = isActive(pathname, { href: "/settings" });
  return (
    <Link
      href="/settings"
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-inset hover:text-ink",
      )}
    >
      <SettingsIcon className={clsx("size-4 shrink-0", active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted")} />
      Settings
    </Link>
  );
}

/** The lesson under way, kept one click away in the sidebar. */
export function ContinueCard({ info }: { info: ContinueInfo }) {
  const done = info.phases.filter((p) => p === "done").length;
  return (
    <Link
      href={info.href}
      className="group flex flex-col gap-2.5 rounded-lg border border-rule bg-surface p-3 shadow-xs transition-[border-color,box-shadow] hover:border-rule-strong hover:shadow-sm"
    >
      <span className="flex items-center justify-between text-xs font-semibold text-ink-muted">
        <span>Continue learning</span>
        <span className="tabular">
          {done} of {info.phases.length}
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="tabular text-xs font-medium text-ink-faint">{info.code}</span>
        <span className="line-clamp-2 text-sm font-semibold text-ink group-hover:text-accent">{info.title}</span>
      </span>
      <SegmentedProgress segments={info.phases} label={`${done} of ${info.phases.length} phases done`} />
      <span className="text-xs text-ink-muted">Next: {info.phaseTitle}</span>
    </Link>
  );
}

/** The tab bar at the bottom of the screen on phones and tablets. */
export function PhoneTabBar({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          const badge = item.href === "/review" ? counts.reviewsDue : 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-accent" : "text-ink-muted",
                )}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {badge > 0 ? (
                    <span className="tabular absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs leading-none font-semibold text-on-accent">
                      {badge > 9 ? "9+" : badge}
                      <span className="sr-only"> due</span>
                    </span>
                  ) : null}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
