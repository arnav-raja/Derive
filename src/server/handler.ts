import { createElement, type ReactElement } from "react";

import { decodeValue, type ActionResponse, type WireResponse, type WireValue } from "@/lib/wire/codec";

import "./actions";
import { API_ROUTES } from "./api";
import { NotFoundSignal, RedirectSignal, currentRequest, runInRequest } from "./context";
import { matchRoute, searchParamsOf, titleOf, type LayoutProps, type PageProps } from "./routes";
import { encode, newRenderState } from "./wire/render";
import { findAction } from "./wire/refs";

/*
 * Derive's server: one handler, run by the Supabase Edge Function in
 * production and by the local server in development and tests.
 *
 *   POST <base>/page      { path, search }               the content of a page
 *   POST <base>/action    { id, args, path, search }     a server action, and the page again if it changed
 *   POST <base>/api/...   the API routes (the tutor)     GET <base>/api/health
 *
 * The base is /functions/v1/derive-api on Supabase and /_derive on the local
 * server. The learner's session arrives as a bearer token.
 */

export type HandlerOptions = {
  /** Sites allowed to call the server from a browser, such as https://arnav-raja.github.io. */
  allowedOrigins: (origin: string) => boolean;
  /** Keeps the process alive for work that finishes after the answer. */
  waitUntil: (work: Promise<unknown>) => void;
  /** Whether error messages may include details (local mode only). */
  verbose: boolean;
};

const ALLOWED_HEADERS = "authorization, content-type, x-region, apikey, x-client-info";

function corsHeaders(origin: string | null, options: HandlerOptions): Record<string, string> {
  if (!origin || !options.allowedOrigins(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/** A page's content is large and repetitive JSON, so it travels gzipped when the browser accepts that. */
function compressed(request: Request, response: Response): Response {
  if (!response.body || !/\bgzip\b/.test(request.headers.get("accept-encoding") ?? "")) return response;
  const headers = new Headers(response.headers);
  headers.set("Content-Encoding", "gzip");
  headers.append("Vary", "Accept-Encoding");
  return new Response(response.body.pipeThrough(new CompressionStream("gzip")), { status: response.status, headers });
}

/** The part of the path after the server's base: "/page", "/api/tutor/hint". */
export function routeOf(pathname: string): string {
  const m = /\/(?:_derive|derive-api)(\/.*)?$/.exec(pathname);
  return m ? m[1] || "/" : pathname;
}

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(header);
  return m ? m[1]!.trim() : null;
}

export async function handle(request: Request, options: HandlerOptions): Promise<Response> {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin, options);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (origin && !options.allowedOrigins(origin)) return json({ ok: false, error: "Cross-site request refused." }, 403, cors);

  const route = routeOf(new URL(request.url).pathname);
  return runInRequest({ token: bearer(request), waitUntil: options.waitUntil }, async () => {
    try {
      if (route === "/page" && request.method === "POST") {
        const body = (await request.json().catch(() => null)) as { path?: unknown; search?: unknown } | null;
        if (!body || typeof body.path !== "string") return json({ kind: "error", message: "The request is not valid.", status: 400 }, 400, cors);
        return compressed(request, json(await renderPage(body.path, typeof body.search === "string" ? body.search : ""), 200, cors));
      }
      if (route === "/action" && request.method === "POST") {
        const body = (await request.json().catch(() => null)) as { id?: unknown; args?: unknown; path?: unknown; search?: unknown } | null;
        if (!body || typeof body.id !== "string" || !Array.isArray(body.args)) {
          return json({ kind: "error", message: "The request is not valid.", status: 400 }, 400, cors);
        }
        const answer = await runAction(
          body.id,
          body.args as WireValue[],
          typeof body.path === "string" ? body.path : null,
          typeof body.search === "string" ? body.search : "",
        );
        return compressed(request, json(answer, 200, cors));
      }
      if (route.startsWith("/api/")) {
        const load = API_ROUTES[route.slice(5)];
        const mod = load ? await load() : null;
        const handler = request.method === "GET" ? mod?.GET : request.method === "POST" ? mod?.POST : undefined;
        if (!handler) return json({ ok: false, error: "There is no such route." }, mod ? 405 : 404, cors);
        const response = await handler(request);
        const headers = new Headers(response.headers);
        for (const [k, v] of Object.entries(cors)) headers.set(k, v);
        return new Response(response.body, { status: response.status, headers });
      }
      return json({ ok: false, error: "There is no such route." }, 404, cors);
    } catch (error) {
      console.error(`Derive's server failed on ${route}:`, error);
      const message = options.verbose && error instanceof Error ? `Something went wrong on Derive's server: ${error.message}` : "Something went wrong on Derive's server. Try again in a moment.";
      return json({ kind: "error", ok: false, error: message, message, status: 500 }, 500, cors);
    }
  });
}

type PageAnswer = Extract<WireResponse, { kind: "page" }>;

/** Renders a page, with its layouts, into the wire format. */
export async function renderPage(path: string, search: string): Promise<WireResponse> {
  const match = matchRoute(path);
  if (!match) return { kind: "not-found" };
  try {
    const props: PageProps = { params: Promise.resolve(match.params), searchParams: Promise.resolve(searchParamsOf(search)) };
    const page = await match.route.page();
    let element: ReactElement = createElement(page.default as (p: PageProps) => null, props);
    for (const load of [...match.route.layouts].reverse()) {
      const layout = await load();
      element = createElement(layout.default as (p: Omit<LayoutProps, "children">) => null, { params: props.params }, element);
    }
    const tree = await encode(element, path, newRenderState());
    const title = await titleOf(page, props);
    return { kind: "page", tree, title };
  } catch (error) {
    if (error instanceof RedirectSignal) return { kind: "redirect", to: error.to };
    if (error instanceof NotFoundSignal) return { kind: "not-found" };
    throw error;
  }
}

/** Runs a server action; if it refreshed the page, the page comes back with its answer. */
export async function runAction(id: string, args: WireValue[], path: string | null, search: string): Promise<ActionResponse> {
  const action = findAction(id);
  if (!action) return { kind: "error", message: "That action does not exist.", status: 404 };
  const decoded = decodeValue(args) as unknown[];
  try {
    const value = await action(...decoded);
    const encoded = await encode(value, `the answer of ${id}`, newRenderState());
    const refresh = currentRequest().refresh;
    let page: PageAnswer | null = null;
    if (refresh && path) {
      const rendered = await renderPage(path, search);
      if (rendered.kind === "page") page = rendered;
      else if (rendered.kind === "redirect") return { kind: "redirect", to: rendered.to };
    }
    return { kind: "result", value: encoded, page, refresh };
  } catch (error) {
    if (error instanceof RedirectSignal) return { kind: "redirect", to: error.to };
    if (error instanceof NotFoundSignal) return { kind: "not-found" };
    throw error;
  }
}
