import "server-only";

import { redirect } from "next/navigation";

import { isLocalMode } from "@/lib/env";
import { FileStore, LOCAL_LEARNER_EMAIL, LOCAL_LEARNER_ID } from "@/lib/store/file";
import { SupabaseStore } from "@/lib/store/supabase";
import type { Store } from "@/lib/store/types";
import { createClient } from "@/lib/supabase/server";
import { currentRequest, perRequest } from "@/server/context";

export type Session = { learnerId: string; email: string | null };

/**
 * The signed-in learner, verified from the access token's signature, or null.
 * The browser sends the token with every request; it is checked once per request.
 */
export function getSession(): Promise<Session | null> {
  return perRequest("session", async () => {
    if (isLocalMode()) return { learnerId: LOCAL_LEARNER_ID, email: LOCAL_LEARNER_EMAIL };
    const token = currentRequest().token;
    if (!token) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims(token);
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    return { learnerId: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
  });
}

/** The signed-in learner; anyone else is sent to the sign-in page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/** The store for the signed-in learner, made once per request. */
export function getStore(): Promise<Store> {
  return perRequest("store", async () => {
    const session = await requireSession();
    if (isLocalMode()) return new FileStore();
    return new SupabaseStore(await createClient(), session.learnerId, session.email);
  });
}

/**
 * For API routes: the store, or null when nobody is signed in, so the route
 * can answer 401 instead of redirecting.
 */
export async function getStoreOrNull(): Promise<Store | null> {
  const session = await getSession();
  if (!session) return null;
  return getStore();
}
