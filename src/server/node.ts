import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { Readable } from "node:stream";
import { createGzip } from "node:zlib";

import { handle } from "./handler";

/*
 * The local server, for development and the end-to-end tests. It answers
 * Derive's server routes under /_derive, as the Supabase Edge Function does,
 * and, given a built site (DERIVE_STATIC_DIR, normally out/), serves it the
 * way GitHub Pages does: /today from today.html, and 404.html with status 404
 * for anything else.
 *
 *   node .derive-build/server.mjs --port 3100 [--static out]
 *
 * Local mode (DERIVE_LOCAL_STORE=1) keeps learner data in .derive-local/, or
 * DERIVE_LOCAL_DIR, and needs no sign-in.
 */

const args = process.argv.slice(2);
function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
}

const port = Number(arg("port") ?? process.env.PORT ?? 3100);
const staticDir = arg("static") ?? process.env.DERIVE_STATIC_DIR;
const basePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/$/, "");

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".zip": "application/zip",
  ".whl": "application/octet-stream",
  ".py": "text/x-python; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

const COMPRESSIBLE = new Set([".html", ".js", ".mjs", ".css", ".json", ".txt", ".svg", ".py", ".map"]);

/** Sends a file, gzipped when it is text and the browser accepts that, as GitHub Pages does. */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string, status = 200) {
  const ext = path.extname(file);
  const gzip = COMPRESSIBLE.has(ext) && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""));
  res.writeHead(status, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "no-cache",
    Vary: "Accept-Encoding",
    ...(gzip ? { "Content-Encoding": "gzip" } : {}),
  });
  const stream = createReadStream(file);
  if (gzip) stream.pipe(createGzip()).pipe(res);
  else stream.pipe(res);
}

function serveStatic(req: IncomingMessage, res: ServerResponse, root: string) {
  let pathname = decodeURIComponent(new URL(req.url ?? "/", "http://local").pathname);
  if (basePath) {
    if (pathname === basePath) pathname = "/";
    else if (pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
    else return sendFile(req, res, path.join(root, "404.html"), 404);
  }
  const safe = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const base = path.join(root, safe);
  if (!base.startsWith(root)) return sendFile(req, res, path.join(root, "404.html"), 404);
  for (const candidate of [base, `${base}.html`, path.join(base, "index.html")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return sendFile(req, res, candidate);
  }
  return sendFile(req, res, path.join(root, "404.html"), 404);
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    duplex: hasBody ? "half" : undefined,
  } as RequestInit);
}

async function send(res: ServerResponse, response: Response) {
  const headers: Record<string, string> = {};
  response.headers.forEach((v, k) => (headers[k] = v));
  res.writeHead(response.status, headers);
  if (response.body) Readable.fromWeb(response.body as never).pipe(res);
  else res.end();
}

const local = (origin: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url ?? "/", "http://local").pathname;
    if (/\/_derive(\/|$)/.test(pathname)) {
      const response = await handle(await toRequest(req), {
        allowedOrigins: local,
        waitUntil: (work) => void work,
        verbose: true,
      });
      return send(res, response);
    }
    if (staticDir) return serveStatic(req, res, path.resolve(staticDir));
    res.writeHead(404).end("Not found");
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500);
    res.end("Server error");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Derive's local server on http://127.0.0.1:${port}${basePath}${staticDir ? ` (site from ${staticDir})` : " (server routes only)"}`);
});
