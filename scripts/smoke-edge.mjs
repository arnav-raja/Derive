/*
 * Starts the built Edge Function bundle under Deno the way Supabase's Edge
 * Runtime runs it, and checks that it answers, before the Publish workflow
 * deploys it. As on the runtime, environment variables cannot be changed and
 * the working directory is "" (so path.relative is unreliable). It serves no
 * port, and makes no request beyond this process.
 *
 *   deno run --allow-env --allow-read scripts/smoke-edge.mjs
 */

/* global Deno */

const bundle = new URL("../supabase/functions/derive-api/bundle.js", import.meta.url).href;

const refuse = () => {
  throw new Deno.errors.NotSupported("The operation is not supported");
};
Deno.env.set = refuse;
Deno.env.delete = refuse;
const { default: process } = await import("node:process");
Deno.cwd = () => "";
process.cwd = () => "";

let handler = null;
Deno.serve = (h) => {
  handler = typeof h === "function" ? h : h.handler;
  return { finished: Promise.resolve(), shutdown: async () => {} };
};
globalThis.EdgeRuntime = { waitUntil: (work) => work.catch(() => {}) };

await import(bundle);
if (!handler) {
  console.error("smoke-edge: the bundle never called Deno.serve.");
  Deno.exit(1);
}

const base = "https://example.supabase.co/functions/v1/derive-api";
const origin = "https://arnav-raja.github.io";

async function call(method, route, body) {
  const response = await handler(
    new Request(base + route, {
      method,
      headers: { origin, "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Left as null; the check below reports it.
  }
  return { status: response.status, cors: response.headers.get("access-control-allow-origin"), json };
}

const checks = [
  ["the browser's preflight", () => call("OPTIONS", "/page"), (r) => r.status === 204 && r.cors === origin],
  ["the health route", () => call("GET", "/api/health"), (r) => r.status === 200 && r.json?.ok === true && r.json?.localMode === false],
  ["the lessons packed in", () => call("GET", "/api/health"), (r) => r.json?.lessons?.written > 0 && r.json?.lessons?.ready > 0],
  ["a compiled lesson phase", () => call("GET", "/api/health"), (r) => r.json?.lessons?.phases === true],
  ["a page", () => call("POST", "/page", { path: "/", search: "" }), (r) => r.status === 200 && r.json?.kind === "redirect"],
  ["a lesson without a session", () => call("POST", "/page", { path: "/lessons/M1.1", search: "" }), (r) => r.status === 200 && r.json?.kind === "redirect"],
  ["an unknown page", () => call("POST", "/page", { path: "/no/such/page", search: "" }), (r) => r.status === 200 && r.json?.kind === "not-found"],
  ["the tutor without a session", () => call("POST", "/api/tutor/hint", { lesson: "M1.1" }), (r) => r.status === 401],
  ["an unknown action", () => call("POST", "/action", { id: "none", args: [], path: "/today", search: "" }), (r) => r.status === 200 && r.json?.kind === "error"],
];

let failed = 0;
for (const [name, run, ok] of checks) {
  const result = await run();
  const passed = ok(result);
  if (!passed) failed++;
  console.log(`smoke-edge: ${passed ? "ok  " : "FAIL"} ${name} (status ${result.status})`);
}
if (failed) {
  console.error(`smoke-edge: ${failed} of ${checks.length} checks failed.`);
  Deno.exit(1);
}
console.log(`smoke-edge: all ${checks.length} checks pass.`);
Deno.exit(0);
