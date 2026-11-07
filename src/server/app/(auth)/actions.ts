"use server";

import { redirect } from "next/navigation";

/*
 * Sign-in now happens in the browser (src/lib/auth-client.ts), where Supabase
 * keeps the session. This action remains so that server pages can offer a
 * sign-out form; the browser runs its own sign-out in its place.
 */

export async function signOut(): Promise<void> {
  redirect("/sign-in");
}
