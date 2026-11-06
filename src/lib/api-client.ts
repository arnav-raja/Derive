/*
 * Every call from the browser to Derive's server goes through apiFetch, so
 * that where the server lives is decided in one place. Today the routes are
 * Next.js route handlers under /api; once Derive is served from GitHub Pages
 * they run in a Supabase Edge Function, and only this file changes.
 */

/** A route, without a leading slash: "tutor/hint", "tutor/talk", "tutor/grade". */
export type ApiRoute = string;

/** Posts a JSON body to a route and returns the response, so callers can read its status. */
export async function apiFetch(route: ApiRoute, body: unknown, init: { signal?: AbortSignal } = {}): Promise<Response> {
  return fetch(`/api/${route.replace(/^\/+/, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: init.signal,
  });
}
