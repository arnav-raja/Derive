import "server-only";

import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/lib/env";
import { currentRequest } from "@/server/context";

import type { Database } from "./database.types";

/**
 * A Supabase client that acts as the learner whose access token came with the
 * request, so every query runs under row-level security as that learner.
 * Without a token it acts as nobody, which row-level security also covers.
 * Create one per request.
 */
export async function createClient(): Promise<DeriveSupabaseClient> {
  const { url, key } = supabaseConfig();
  const token = currentRequest().token;
  return createSupabaseClient<Database>(url, key, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type DeriveSupabaseClient = SupabaseClient<Database>;
