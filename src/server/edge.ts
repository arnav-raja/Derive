/*
 * The Supabase Edge Function's entry point. The build bundles it, with the
 * lesson content, into supabase/functions/derive-api/bundle.js. Supabase gives
 * the function its own address (SUPABASE_URL) and the secrets set for it,
 * among them ANTHROPIC_API_KEY.
 */

import { handle } from "./handler";

declare const Deno: {
  env: { toObject(): Record<string, string> };
  serve(handler: (request: Request) => Response | Promise<Response>): unknown;
};
declare const EdgeRuntime: { waitUntil(work: Promise<unknown>): void } | undefined;

const env = Deno.env.toObject();
for (const [k, v] of Object.entries(env)) process.env[k] ??= v;
process.env.DERIVE_DEPLOYED = "1";
delete process.env.DERIVE_LOCAL_STORE;

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
