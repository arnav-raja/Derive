import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { isLocalMode } from "@/lib/env";
import { FileStore, LOCAL_LEARNER_EMAIL, LOCAL_LEARNER_ID } from "@/lib/store/file";
import { SupabaseStore } from "@/lib/store/supabase";
import type { Store } from "@/lib/store/types";
import { createClient } from "@/lib/supabase/server";

export type Session = { learnerId: string; email: string | null };

/**
 * The signed-in learner, verified from the session token's signature, or null.
 * Cached for the duration of one request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  if (isLocalMode()) {
    // Learner pages are always rendered per request, never at build time.
    await connection();
    return { learnerId: LOCAL_LEARNER_ID, email: LOCAL_LEARNER_EMAIL };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { learnerId: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/** The signed-in learner; anyone else is sent to the sign-in page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session;
}

/** The store for the signed-in learner. Cached for one request. */
export const getStore = cache(async (): Promise<Store> => {
  const session = await requireSession();
  if (isLocalMode()) return new FileStore();
  return new SupabaseStore(await createClient(), session.learnerId, session.email);
});

/**
 * For route handlers: the store, or null when nobody is signed in, so the
 * handler can answer 401 instead of redirecting.
 */
export async function getStoreOrNull(): Promise<Store | null> {
  const session = await getSession();
  if (!session) return null;
  if (isLocalMode()) return new FileStore();
  return new SupabaseStore(await createClient(), session.learnerId, session.email);
}
