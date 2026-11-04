import "server-only";

import type { z } from "zod";

import { getStoreOrNull } from "@/lib/auth";
import type { Store } from "@/lib/store/types";

/*
 * Shared plumbing for the tutor's route handlers: same-origin requests only,
 * a signed-in learner, and a body that matches its schema.
 */

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Browsers send Origin on every POST; a request from another site is refused. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

type Ready<T> = { ok: true; store: Store; body: T } | { ok: false; response: Response };

export async function prepare<S extends z.ZodType>(request: Request, schema: S): Promise<Ready<z.infer<S>>> {
  if (!sameOrigin(request)) return { ok: false, response: json({ ok: false, error: "Cross-site request refused." }, 403) };
  const store = await getStoreOrNull();
  if (!store) return { ok: false, response: json({ ok: false, error: "Sign in first." }, 401) };
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: json({ ok: false, error: "The request could not be read." }, 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, response: json({ ok: false, error: "The request is not valid." }, 400) };
  return { ok: true, store, body: parsed.data };
}
