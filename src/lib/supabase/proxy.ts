import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";

/** Paths that are open without a session. */
const PUBLIC_PATHS = ["/sign-in", "/auth/", "/api/health"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));
}

/**
 * Refreshes the Supabase session on every request and sends visitors without
 * a session to the sign-in page. Runs in the proxy, before any route renders.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return new NextResponse("Derive is not configured: the Supabase settings are missing.", {
      status: 503,
    });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value);
        }
      },
    },
  });

  // Nothing may run between creating the client and this call, or sessions
  // can be lost on refresh.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);
  const { pathname, search } = request.nextUrl;

  if (!signedIn && pathname.startsWith("/api/") && !isPublicPath(pathname)) {
    return copyCookies(
      response,
      NextResponse.json({ error: "Sign in to continue." }, { status: 401 }),
    );
  }

  if (!signedIn && !isPublicPath(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = "/sign-in";
    target.search = "";
    if (pathname !== "/") {
      target.searchParams.set("next", `${pathname}${search}`);
    }
    return copyCookies(response, NextResponse.redirect(target));
  }

  if (signedIn && pathname === "/sign-in") {
    const target = request.nextUrl.clone();
    target.pathname = "/today";
    target.search = "";
    return copyCookies(response, NextResponse.redirect(target));
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  const cacheControl = from.headers.get("Cache-Control");
  if (cacheControl) {
    to.headers.set("Cache-Control", cacheControl);
  }
  return to;
}
