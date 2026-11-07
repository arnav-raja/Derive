import { API_BASE, API_REGION, LOCAL_MODE } from "@/lib/public-config";
import { accessToken } from "@/lib/supabase/browser";

/*
 * Every call from the browser to Derive's server goes through here, so that
 * where the server lives is decided in one place. In production the server is
 * a Supabase Edge Function; in development and tests it is the local server.
 * The learner's access token goes with every call, and the server reads and
 * writes under row-level security as that learner.
 */

/** A route, without a leading slash: "tutor/hint", "tutor/talk", "tutor/grade". */
export type ApiRoute = string;

export async function serverHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_REGION) headers["x-region"] = API_REGION;
  if (!LOCAL_MODE) {
    const token = await accessToken().catch(() => null);
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

/** Posts JSON to one of the server's own endpoints ("page", "action"). */
export async function serverFetch(endpoint: string, body: unknown, init: { signal?: AbortSignal } = {}): Promise<Response> {
  return fetch(`${API_BASE}/${endpoint.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: await serverHeaders(),
    body: JSON.stringify(body),
    signal: init.signal,
    credentials: "omit",
  });
}

/** Posts a JSON body to an API route and returns the response, so callers can read its status. */
export async function apiFetch(route: ApiRoute, body: unknown, init: { signal?: AbortSignal } = {}): Promise<Response> {
  return serverFetch(`api/${route.replace(/^\/+/, "")}`, body, init);
}
