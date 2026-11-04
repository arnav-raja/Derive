import "server-only";

import { isLocalMode } from "@/lib/env";

import { createClient } from "./server";

/**
 * Whether Derive's one account has been created, or null when that cannot be
 * told (local mode, or Supabase unreachable). The database enforces the rule
 * either way; this only decides what the sign-in page offers.
 */
export async function accountExists(): Promise<boolean | null> {
  if (isLocalMode()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("signup_open");
    if (error || typeof data !== "boolean") return null;
    return !data;
  } catch {
    return null;
  }
}
