import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

/*
 * npm run dev: the site from Next.js on port 3000, and Derive's server on
 * port 3101, rebuilt and restarted on every change. With DERIVE_LOCAL_STORE=1
 * there is no sign-in and learner data stays in .derive-local/; otherwise
 * .env.local supplies the Supabase project.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const API_PORT = Number(process.env.DERIVE_API_PORT ?? 3101);
const local = process.env.DERIVE_LOCAL_STORE === "1";

const children = [];
function run(name, command, args, env = {}) {
  const child = spawn(command, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
  child.on("exit", (code) => {
    console.log(`dev: ${name} stopped (${code ?? "signal"})`);
    for (const other of children) if (other !== child) other.kill();
    process.exit(code ?? 1);
  });
  children.push(child);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    for (const child of children) child.kill(signal);
  });
}

run("build-api", "npx", ["tsx", "scripts/build-api.ts", "--watch"]);

const server = path.join(ROOT, ".derive-build/server.mjs");
const started = Date.now();
while (!existsSync(server)) {
  if (Date.now() - started > 60_000) throw new Error("dev: the local server did not build within a minute.");
  await new Promise((r) => setTimeout(r, 200));
}

const envFile = existsSync(path.join(ROOT, ".env.local")) ? ["--env-file=.env.local"] : [];
run("server", process.execPath, ["--watch", ...envFile, server, "--port", String(API_PORT)]);
run("next", "npx", ["next", "dev"], {
  NEXT_PUBLIC_DERIVE_API_URL: `http://localhost:${API_PORT}/_derive`,
  ...(local ? { NEXT_PUBLIC_DERIVE_LOCAL_STORE: "1" } : {}),
});
