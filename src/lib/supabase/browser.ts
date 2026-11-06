import { GoTrueClient } from "@supabase/auth-js";

import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/public-config";

/*
 * The browser's Supabase connection, used only to sign in and to keep the
 * session fresh, so it is Supabase's auth client alone rather than the whole
 * of supabase-js. Learner data is read and written by Derive's server, under
 * row-level security as the learner whose token the browser sends with each
 * request.
 */

let client: GoTrueClient | null = null;

function config(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set when the site is built.");
  }
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}

/** Supabase Auth, as supabase-js would set it up for this site. */
export function browserAuth(): GoTrueClient {
  if (client) return client;
  const { url, key } = config();
  client = new GoTrueClient({
    url: `${url}/auth/v1`,
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    storageKey: "derive-auth",
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  });
  return client;
}

/** The current access token, refreshed first if it has expired, or null when nobody is signed in. */
export async function accessToken(): Promise<string | null> {
  const { data } = await browserAuth().getSession();
  return data.session?.access_token ?? null;
}

/** Calls a database function that anyone may call, such as signup_open. */
export async function publicRpc(name: string): Promise<unknown> {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`${name} answered ${res.status}.`);
  return res.json();
}
