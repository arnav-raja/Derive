"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { PageError } from "@/components/shell/page-error";
import { CLIENT_MODULES } from "@/generated/client-modules";
import { serverFetch } from "@/lib/api-client";
import { signOut } from "@/lib/sign-out";
import { withBase } from "@/lib/public-config";

import {
  clientModules,
  decodeValue,
  encodeValue,
  exportOf,
  moduleOf,
  type ActionResponse,
  type WireResponse,
  type WireValue,
} from "./codec";

/*
 * The browser's half of Derive's pages. GitHub Pages serves a small static
 * page for every address; once it loads, the host asks Derive's server for
 * the page's content, loads the client components the content names, and
 * renders it. Server actions are called the same way, and the answer carries
 * the page again when the action changed it.
 */

// Client components -----------------------------------------------------------

const loaded = new Map<string, Record<string, unknown>>();

async function loadModules(ids: Iterable<string>): Promise<void> {
  await Promise.all(
    [...ids].map(async (id) => {
      if (loaded.has(id)) return;
      const load = CLIENT_MODULES[id];
      if (!load) throw new Error(`The page needs the client module ${id}, which this build does not have.`);
      loaded.set(id, (await load()) as Record<string, unknown>);
    }),
  );
}

function resolveReference(ref: string): unknown {
  const mod = loaded.get(moduleOf(ref));
  if (!mod) throw new Error(`The client module for ${ref} is not loaded.`);
  const [name, ...path] = exportOf(ref).split(".");
  let value: unknown = mod[name!];
  for (const p of path) value = (value as Record<string, unknown> | undefined)?.[p];
  if (value === undefined) throw new Error(`${ref} is not exported by its module.`);
  return value;
}

/** A list inside a host element's children, passed as a fragment's own children. */
function asStatic(child: unknown): ReactNode {
  return Array.isArray(child) ? createElement(Fragment, null, ...child.map(asStatic)) : (child as ReactNode);
}

/** Turns a wire tree into React elements. Every client module it names must already be loaded. */
function toReact(tree: WireValue): ReactNode {
  return decodeValue(tree, {
    element(t, key, props) {
      const type = typeof t === "string" ? (t === "#f" ? Fragment : t) : (resolveReference(t.c) as Parameters<typeof createElement>[0]);
      const { children, ...rest } = props;
      // Links written as plain anchors in server code still need the site's base path.
      if (type === "a" && typeof rest.href === "string") rest.href = withBase(rest.href);
      if (key !== null) rest.key = key;
      if (Array.isArray(children)) {
        // A host element's nested lists were written as JSX children, so React need not ask
        // them for keys; a client component gets its children exactly as the server sent them.
        const list = typeof type === "string" ? children.map(asStatic) : (children as ReactNode[]);
        return createElement(type, rest, ...list);
      }
      return children === undefined ? createElement(type, rest) : createElement(type, rest, children as ReactNode);
    },
    action: (id, bound) => serverAction(id, bound),
    client: (id) => resolveReference(id),
  }) as ReactNode;
}

async function prepare(tree: WireValue): Promise<ReactNode> {
  await loadModules(clientModules(tree));
  return toReact(tree);
}

// The bridge between actions and the mounted host ------------------------------

type Bridge = {
  location: () => string;
  show: (page: Extract<WireResponse, { kind: "page" }>, location: string) => Promise<void>;
  refresh: () => Promise<void>;
  navigate: (to: string, replace?: boolean) => void;
};

let bridge: Bridge | null = null;

/** Fetches the current page again, as router.refresh() did when Next.js rendered pages. */
export function refreshPage(): Promise<void> {
  return bridge?.refresh() ?? Promise.resolve();
}

function currentLocation(): string {
  if (bridge) return bridge.location();
  return typeof window === "undefined" ? "/" : window.location.pathname + window.location.search;
}

class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Server pages may offer a sign-out form, but the session lives in the
 * browser, so the browser signs out in the server action's place.
 */
const SIGN_OUT = "src/server/app/(auth)/actions.ts#signOut";

/** Calls a server action by id, as a server action reference would. */
export async function callAction(id: string, args: unknown[]): Promise<unknown> {
  if (id === SIGN_OUT) {
    await signOut((to) => (bridge ? bridge.navigate(to, true) : window.location.assign(withBase(to))));
    return undefined;
  }
  const location = currentLocation();
  const [path, search = ""] = splitLocation(location);
  let res: Response;
  try {
    res = await serverFetch("action", { id, args: encodeValue(args, "the action's arguments"), path, search });
  } catch {
    throw new ActionError("Derive's server could not be reached. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as ActionResponse | null;
  if (!body) throw new ActionError("Derive's server sent an answer that could not be read.");
  switch (body.kind) {
    case "result":
      if (body.page && bridge) await bridge.show(body.page, location);
      else if (body.refresh) await refreshPage();
      return decodeValue(body.value);
    case "redirect":
      // The caller's transition must end for React to commit the navigation,
      // so a redirecting action returns nothing rather than waiting forever.
      bridge?.navigate(body.to);
      return undefined;
    case "not-found":
      throw new ActionError("That is no longer available.");
    case "error":
      if (body.status === 401) bridge?.navigate(signInFor(location), true);
      throw new ActionError(body.message);
  }
}

/** A function that calls a server action, with any arguments bound in front. */
export function serverAction<F extends (...args: never[]) => unknown>(id: string, bound: unknown[] = []): F {
  const fn = (...args: unknown[]) => callAction(id, [...bound, ...args]);
  return fn as unknown as F;
}

function splitLocation(location: string): [string, string] {
  const i = location.indexOf("?");
  return i < 0 ? [location, ""] : [location.slice(0, i), location.slice(i)];
}

function signInFor(location: string): string {
  return location.startsWith("/sign-in") ? location : `/sign-in?next=${encodeURIComponent(location)}`;
}

// Pages -----------------------------------------------------------------------

type Shown =
  | { kind: "page"; location: string; node: ReactNode }
  | { kind: "not-found"; location: string }
  | { kind: "error"; location: string; message: string };

type Host = {
  shown: Shown | null;
  loading: string | null;
  request: (location: string) => void;
  retry: () => void;
};

const HostContext = createContext<Host | null>(null);

async function fetchPage(location: string): Promise<WireResponse> {
  const [path, search] = splitLocation(location);
  try {
    const res = await serverFetch("page", { path, search });
    const body = (await res.json().catch(() => null)) as WireResponse | null;
    return body ?? { kind: "error", message: "Derive's server sent an answer that could not be read.", status: res.status };
  } catch {
    return { kind: "error", message: "Derive's server could not be reached. Check your connection and try again.", status: 0 };
  }
}

const TITLE_SUFFIX = " · Derive";

/**
 * Holds the page on screen across navigations, so the frame stays put while
 * the next page's content is on its way. It sits in the root layout.
 */
export function WireHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [shown, setShown] = useState<Shown | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const wanted = useRef<string | null>(null);
  const shownRef = useRef<Shown | null>(null);

  const display = useCallback((next: Shown, title?: string | null) => {
    shownRef.current = next;
    setShown(next);
    setLoading(null);
    if (title !== undefined) document.title = title ?? "Derive";
  }, []);

  const show = useCallback(
    async (page: Extract<WireResponse, { kind: "page" }>, location: string) => {
      const node = await prepare(page.tree);
      if (wanted.current !== null && wanted.current !== location) return;
      display({ kind: "page", location, node }, page.title);
    },
    [display],
  );

  const load = useCallback(
    async (location: string, quiet = false) => {
      wanted.current = location;
      if (!quiet) setLoading(location);
      const answer = await fetchPage(location);
      if (wanted.current !== location) return;
      switch (answer.kind) {
        case "page":
          try {
            await show(answer, location);
          } catch (error) {
            console.error(error);
            display({ kind: "error", location, message: "Part of this page could not load." });
          }
          return;
        case "redirect":
          setLoading(null);
          router.replace(answer.to === "/sign-in" ? signInFor(location) : answer.to);
          return;
        case "not-found":
          display({ kind: "not-found", location }, `Page not found${TITLE_SUFFIX}`);
          return;
        case "error":
          if (answer.status === 401) {
            setLoading(null);
            router.replace(signInFor(location));
            return;
          }
          display({ kind: "error", location, message: answer.message });
      }
    },
    [display, router, show],
  );

  useEffect(() => {
    bridge = {
      location: () => wanted.current ?? shownRef.current?.location ?? window.location.pathname + window.location.search,
      show,
      refresh: () => (wanted.current ? load(wanted.current, true) : Promise.resolve()),
      navigate: (to, replace = false) => (replace ? router.replace(to) : router.push(to)),
    };
    return () => {
      bridge = null;
    };
  }, [load, router, show]);

  const host = useMemo<Host>(
    () => ({
      shown,
      loading,
      request: (location) => {
        if (wanted.current === location && (loading === location || shownRef.current?.location === location)) return;
        void load(location);
      },
      retry: () => {
        if (wanted.current) void load(wanted.current);
      },
    }),
    [shown, loading, load],
  );

  return <HostContext.Provider value={host}>{children}</HostContext.Provider>;
}

function Busy({ overlay }: { overlay: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        overlay
          ? "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-accent"
          : "pointer-events-none fixed inset-0 flex items-center justify-center text-sm text-ink-muted"
      }
    >
      <span className={overlay ? "sr-only" : undefined}>Loading</span>
    </div>
  );
}

/**
 * Where a page's content goes. Each static page renders one; it asks the host
 * for its address and shows what the host holds, keeping the last page on
 * screen until the new one arrives.
 */
export function WireOutlet({ notFound }: { notFound: ReactNode }) {
  const host = useContext(HostContext);
  if (!host) throw new Error("WireOutlet needs a WireHost in the root layout.");
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  // GitHub Pages may add a slash when it redirects a folder; the server's addresses have none.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const location = `${path}${query ? `?${query}` : ""}`;
  const { request } = host;

  useEffect(() => {
    request(location);
  }, [location, request]);

  const shown = host.shown;
  const current = shown?.location === location;
  // What has been shown with its fonts in. A new page is laid out hidden, which starts loading
  // the fonts it uses, and shown once they are in (or after a moment), so its text does not
  // jump as they arrive. data-page then says what is on screen ("ready", "not-found" or
  // "error"), for the end-to-end tests.
  const [settled, setSettled] = useState<Shown | null>(null);
  useLayoutEffect(() => {
    if (!current || !shown) return;
    let live = true;
    const reveal = () => {
      if (!live) return;
      setSettled(shown);
      document.documentElement.dataset.page = shown.kind === "page" ? "ready" : shown.kind;
      const hash = window.location.hash.slice(1);
      if (shown.kind === "page" && hash) document.getElementById(decodeURIComponent(hash))?.scrollIntoView();
    };
    void document.body.offsetHeight;
    if (document.fonts.status === "loaded") reveal();
    else void Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(reveal);
    return () => {
      live = false;
    };
  }, [current, shown]);
  useEffect(() => {
    if (!current) delete document.documentElement.dataset.page;
  }, [current]);

  if (!shown) return <Busy overlay={false} />;
  const hidden = current && shown !== settled;
  const busy = host.loading !== null || !current || hidden;
  let body: ReactNode;
  if (shown.kind === "page") body = shown.node;
  else if (shown.kind === "not-found") body = notFound;
  else body = <PageError detail={shown.message} retry={host.retry} />;
  return (
    <>
      <div className="contents" style={hidden ? { visibility: "hidden" } : undefined}>
        {body}
      </div>
      {busy ? <Busy overlay /> : null}
    </>
  );
}
