"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import {
  MapIcon,
  NotebookIcon,
  ProgressIcon,
  ReviewIcon,
  TodayIcon,
} from "@/components/ui/icons";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/today", label: "Today", icon: TodayIcon },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/review", label: "Review", icon: ReviewIcon },
  { href: "/notebook", label: "Notebook", icon: NotebookIcon },
  { href: "/progress", label: "Progress", icon: ProgressIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The main navigation in the top bar, from tablet width up. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "inline-flex h-9 items-center rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "bg-inset text-ink" : "text-ink-muted hover:bg-inset hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The tab bar at the bottom of the screen on phones. */
export function PhoneTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex h-14 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-accent" : "text-ink-muted",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
