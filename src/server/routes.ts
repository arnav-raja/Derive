import type { ReactNode } from "react";

/*
 * Every page Derive's server renders, with the layouts around it, as the
 * folders under src/server/app lay them out (the same conventions as a
 * Next.js app directory). Each has a static page in src/app that GitHub Pages
 * serves and that asks for this content.
 */

type Params = Record<string, string>;
type SearchParams = Record<string, string | string[] | undefined>;

export type PageProps = { params: Promise<Params>; searchParams: Promise<SearchParams> };
export type LayoutProps = { children: ReactNode; params: Promise<Params> };

type Title = string | { absolute?: string; default?: string } | null | undefined;
type Metadata = { title?: Title };

// Each page names the parameters its own route has, so the modules are typed
// loosely here and called with the props the route provides.
export type PageModule = {
  default: (props: never) => unknown;
  metadata?: Metadata;
  generateMetadata?: (props: never) => Metadata | Promise<Metadata>;
};

export type LayoutModule = { default: (props: never) => unknown };

type Route = {
  pattern: string;
  layouts: (() => Promise<LayoutModule>)[];
  page: () => Promise<PageModule>;
};

const appLayout = () => import("./app/(app)/layout");
const workspaceLayout = () => import("./app/(workspace)/layout");

export const ROUTES: Route[] = [
  { pattern: "/", layouts: [], page: () => import("./app/page") },
  { pattern: "/map", layouts: [], page: () => import("./app/map/page") },
  { pattern: "/sign-in", layouts: [], page: () => import("./app/(auth)/sign-in/page") },
  { pattern: "/today", layouts: [appLayout], page: () => import("./app/(app)/today/page") },
  { pattern: "/curriculum", layouts: [appLayout], page: () => import("./app/(app)/curriculum/page") },
  { pattern: "/courses/[code]", layouts: [appLayout], page: () => import("./app/(app)/courses/[code]/page") },
  { pattern: "/lessons/[code]", layouts: [appLayout], page: () => import("./app/(app)/lessons/[code]/page") },
  { pattern: "/review", layouts: [appLayout], page: () => import("./app/(app)/review/page") },
  { pattern: "/notebook", layouts: [appLayout], page: () => import("./app/(app)/notebook/page") },
  { pattern: "/progress", layouts: [appLayout], page: () => import("./app/(app)/progress/page") },
  { pattern: "/settings", layouts: [appLayout], page: () => import("./app/(app)/settings/page") },
  { pattern: "/placement", layouts: [appLayout], page: () => import("./app/(app)/placement/page") },
  {
    pattern: "/lessons/[code]/[phase]",
    layouts: [workspaceLayout],
    page: () => import("./app/(workspace)/lessons/[code]/[phase]/page"),
  },
];

export type Match = { route: Route; params: Params };

/** The route for a path such as /lessons/M1.1/explore, with its parameters. */
export function matchRoute(path: string): Match | null {
  const parts = path.split("/").filter(Boolean);
  for (const route of ROUTES) {
    const pattern = route.pattern.split("/").filter(Boolean);
    if (pattern.length !== parts.length) continue;
    const params: Params = {};
    let ok = true;
    for (let i = 0; i < pattern.length; i++) {
      const p = pattern[i]!;
      let part: string;
      try {
        part = decodeURIComponent(parts[i]!);
      } catch {
        ok = false;
        break;
      }
      if (p.startsWith("[") && p.endsWith("]")) params[p.slice(1, -1)] = part;
      else if (p !== part) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

export function searchParamsOf(search: string): SearchParams {
  const out: SearchParams = {};
  for (const [k, v] of new URLSearchParams(search)) {
    const prev = out[k];
    out[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  return out;
}

const TEMPLATE = "%s · Derive";

/** The page's title, as the root layout's template ("%s · Derive") makes it. */
export async function titleOf(mod: PageModule, props: PageProps): Promise<string> {
  const generate = mod.generateMetadata as ((p: PageProps) => Metadata | Promise<Metadata>) | undefined;
  const meta = generate ? await generate(props) : mod.metadata;
  const title = meta?.title;
  if (!title) return "Derive";
  if (typeof title === "string") return TEMPLATE.replace("%s", title);
  if (title.absolute) return title.absolute;
  return title.default ? TEMPLATE.replace("%s", title.default) : "Derive";
}
