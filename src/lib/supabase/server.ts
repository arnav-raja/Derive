import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseConfig } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * A Supabase client bound to the signed-in learner's session cookies, so every
 * query runs under row-level security as that learner. Create one per request.
 */
export async function createClient() {
  const { url, key } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session on every request, so this is safe.
        }
      },
    },
  });
}

export type DeriveSupabaseClient = Awaited<ReturnType<typeof createClient>>;
