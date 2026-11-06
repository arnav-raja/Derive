import "server-only";

import type { z } from "zod";

import { getStoreOrNull } from "@/lib/auth";
import type { Store } from "@/lib/store/types";

/*
 * Shared plumbing for the tutor's API routes: a signed-in learner, and a body
 * that matches its schema. The server's handler has already refused requests
 * from other sites; the session is a bearer token, not a cookie, so another
 * site cannot borrow it.
 */

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

type Ready<T> = { ok: true; store: Store; body: T } | { ok: false; response: Response };

export async function prepare<S extends z.ZodType>(request: Request, schema: S): Promise<Ready<z.infer<S>>> {
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
