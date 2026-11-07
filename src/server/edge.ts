/*
 * The Supabase Edge Function's entry point. The build bundles it, with the
 * lesson content, into supabase/functions/derive-api/bundle.js. Supabase gives
 * the function its own address (SUPABASE_URL) and the secrets set for it,
 * among them ANTHROPIC_API_KEY.
 */

import { handle } from "./handler";

declare const Deno: {
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};
declare const EdgeRuntime: { waitUntil(work: Promise<unknown>): void } | undefined;

// process.env reads the function's environment, secrets included, but the Edge
// Runtime refuses to change it, so nothing here writes to it. The build fixes
// DERIVE_DEPLOYED to "1" and DERIVE_LOCAL_STORE to undefined in this bundle,
// which keeps local mode off whatever the environment holds.

const allowed = new Set(
  (process.env.DERIVE_ALLOWED_ORIGINS || "https://arnav-raja.github.io")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
);

Deno.serve((request) =>
  handle(request, {
    allowedOrigins: (origin) => allowed.has(origin),
    waitUntil: (work) => (typeof EdgeRuntime !== "undefined" ? EdgeRuntime.waitUntil(work) : void work),
    verbose: false,
  }),
);
