/*
 * What the browser needs to know about where Derive lives, fixed when the
 * static site is built. Nothing here is secret: the Supabase key is the
 * publishable one, which row-level security makes safe to share.
 */

/** The path GitHub Pages serves Derive under ("/Derive"), or "" when it is served at the root. */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Local mode (development and tests): no sign-in, and the local server answers. */
export const LOCAL_MODE = process.env.NEXT_PUBLIC_DERIVE_LOCAL_STORE === "1";

/**
 * Where Derive's server answers: the Supabase Edge Function in production, or
 * the local server, which serves the site and answers under /_derive.
 */
export const API_BASE = process.env.NEXT_PUBLIC_DERIVE_API_URL || `${BASE_PATH}/_derive`;

/** The Supabase region the database is in; the function is asked to run there too. */
export const API_REGION = process.env.NEXT_PUBLIC_DERIVE_API_REGION ?? "";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** A path inside the site, with the base path in front. */
export function withBase(path: string): string {
  if (!BASE_PATH || !path.startsWith("/") || path.startsWith("//")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}
