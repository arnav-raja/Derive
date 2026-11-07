import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

import * as esbuild from "esbuild";
import { init, parse } from "es-module-lexer";

import { PHASES } from "../src/lib/store/types";
import { readPhaseSource, writtenLessonCodes } from "../src/lib/content/files";
import { compileMdxCode, mdxKey } from "../src/lib/content/mdx-core";

/*
 * Builds Derive's server, which renders the pages and runs the actions and the
 * tutor, from the code under src/server and the libraries it uses.
 *
 *   npx tsx scripts/build-api.ts            the local server, .derive-build/server.mjs
 *   npx tsx scripts/build-api.ts --edge     also the Supabase Edge Function, with the content packed in
 *   npx tsx scripts/build-api.ts --watch    the local server, rebuilt on every change (for npm run dev)
 *
 * Every build also writes src/generated/client-modules.ts: the client
 * components the server's pages use, which the browser loads by name.
 *
 * As a React Server Components bundler does, the build replaces each module
 * marked "use client" with references the browser resolves, and tags each
 * export of a module marked "use server" as an action the browser can call.
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src");
const args = new Set(process.argv.slice(2));
const EDGE = args.has("--edge");
const WATCH = args.has("--watch");

const shim = (name: string) => path.join(SRC, "server/shims", name);
const SHARED_ALIASES: Record<string, string> = {
  "server-only": shim("server-only.ts"),
  "next/navigation": shim("next-navigation.ts"),
  "next/cache": shim("next-cache.ts"),
  "next/server": shim("next-server.ts"),
  "next/headers": shim("next-headers.ts"),
  "next/font/local": shim("next-font.ts"),
  "next/link": shim("next-link.ts"),
};
const EDGE_ALIASES: Record<string, string> = {
  "node:fs": path.join(SRC, "server/edge/content-fs.ts"),
  fs: path.join(SRC, "server/edge/content-fs.ts"),
  "@/lib/content/mdx-precompiled": path.join(SRC, "server/edge/mdx-precompiled.ts"),
};

const DIRECTIVE = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*["']use (client|server)["']/;

/** A module's id: its path from the repository root, with forward slashes. */
function idOf(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

async function exportsOf(file: string, source: string): Promise<{ name: string; local: string | undefined }[]> {
  const loader = file.endsWith(".tsx") ? "tsx" : file.endsWith(".ts") ? "ts" : "jsx";
  const js = await esbuild.transform(source, { loader, format: "esm", jsx: "automatic", sourcefile: file });
  await init;
  const [, exports] = parse(js.code);
  return exports.map((e) => ({ name: e.n, local: e.ln }));
}

function derivePlugin(clientModules: Set<string>, edge: boolean): esbuild.Plugin {
  const aliases = { ...SHARED_ALIASES, ...(edge ? EDGE_ALIASES : {}) };
  return {
    name: "derive-server",
    setup(build) {
      const filter = new RegExp(`^(${Object.keys(aliases).map((k) => k.replace(/[/.]/g, "\\$&")).join("|")})$`);
      build.onResolve({ filter }, (a) => {
        // The edge's file reader is itself built on node:path, never on node:fs.
        if (a.importer.includes(`${path.sep}server${path.sep}edge${path.sep}`) && (a.path === "node:fs" || a.path === "fs")) return undefined;
        return { path: aliases[a.path]! };
      });
      if (edge) {
        build.onResolve({ filter: /^@mdx-js\/mdx$/ }, () => ({ path: "mdx-compiler", namespace: "derive-stub" }));
        build.onResolve({ filter: /^virtual:derive-content$/ }, () => ({ path: path.join(ROOT, ".derive-build/content-pack.mjs") }));
        build.onLoad({ filter: /.*/, namespace: "derive-stub" }, () => ({
          contents: `export function compile() { throw new Error("The deployed server runs only lesson phases compiled when it was built."); }`,
          loader: "js",
        }));
      }

      build.onLoad({ filter: /\.(tsx?|jsx?)$/ }, async (a) => {
        if (!a.path.startsWith(SRC + path.sep)) return undefined;
        const source = readFileSync(a.path, "utf8");
        const directive = DIRECTIVE.exec(source)?.[1];
        if (!directive) return undefined;
        const id = idOf(a.path);
        const names = await exportsOf(a.path, source);
        if (directive === "client") {
          clientModules.add(id);
          const lines = [`import { clientReference } from "@/server/wire/refs";`];
          for (const { name } of names) {
            const ref = `clientReference(${JSON.stringify(`${id}#${name}`)})`;
            lines.push(name === "default" ? `export default ${ref};` : `export const ${name} = ${ref};`);
          }
          return { contents: lines.join("\n"), loader: "ts", resolveDir: path.dirname(a.path) };
        }
        const footer = [`import { registerAction as __registerAction } from "@/server/wire/refs";`];
        for (const { name, local } of names) {
          if (local) footer.push(`__registerAction(${local}, ${JSON.stringify(`${id}#${name}`)});`);
        }
        const loader = a.path.endsWith(".tsx") ? "tsx" : "ts";
        return { contents: `${source}\n${footer.join("\n")}\n`, loader, resolveDir: path.dirname(a.path) };
      });
    },
  };
}

/** The content folder, every file gzipped, and every written lesson phase compiled. */
async function writeContentPack(): Promise<{ files: number; phases: number; bytes: number }> {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[idOf(full)] = gzipSync(readFileSync(full)).toString("base64");
    }
  };
  walk(path.join(ROOT, "content"));
  const mdx: Record<string, string> = {};
  for (const code of writtenLessonCodes()) {
    for (const phase of PHASES) {
      const source = readPhaseSource(code, phase);
      if (source === null) continue;
      try {
        mdx[mdxKey(source)] = gzipSync(await compileMdxCode(source)).toString("base64");
      } catch (error) {
        throw new Error(`${code} ${phase} does not compile: ${String(error)}`);
      }
    }
  }
  const body = `export default ${JSON.stringify({ files, mdx })};\n`;
  mkdirSync(path.join(ROOT, ".derive-build"), { recursive: true });
  writeFileSync(path.join(ROOT, ".derive-build/content-pack.mjs"), body);
  return { files: Object.keys(files).length, phases: Object.keys(mdx).length, bytes: body.length };
}

const REGISTRY = path.join(SRC, "generated/client-modules.ts");

/** The client components the server may name, for the browser to load by id. */
function writeRegistry(clientModules: Set<string>): boolean {
  const ids = ["next/link", ...[...clientModules].sort()];
  const entries = ids.map((id) => {
    const spec = id.startsWith("src/") ? `@/${id.slice(4).replace(/\.(tsx?|jsx?)$/, "")}` : id;
    return `  ${JSON.stringify(id)}: () => import(${JSON.stringify(spec)}),`;
  });
  const body = [
    "// Written by scripts/build-api.ts: the client components Derive's server renders. Do not edit.",
    "",
    "export const CLIENT_MODULES: Record<string, () => Promise<unknown>> = {",
    ...entries,
    "};",
    "",
  ].join("\n");
  const before = existsSync(REGISTRY) ? readFileSync(REGISTRY, "utf8") : "";
  if (before === body) return false;
  mkdirSync(path.dirname(REGISTRY), { recursive: true });
  writeFileSync(REGISTRY, body);
  return true;
}

function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execSync("git rev-parse HEAD", { cwd: ROOT, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

const common: esbuild.BuildOptions = {
  bundle: true,
  format: "esm",
  jsx: "automatic",
  logLevel: "warning",
  tsconfig: path.join(ROOT, "tsconfig.json"),
  legalComments: "none",
};

async function buildNode() {
  const clientModules = new Set<string>();
  const options: esbuild.BuildOptions = {
    ...common,
    entryPoints: [path.join(SRC, "server/node.ts")],
    outfile: path.join(ROOT, ".derive-build/server.mjs"),
    platform: "node",
    target: "node22",
    packages: "external",
    sourcemap: "inline",
    plugins: [
      derivePlugin(clientModules, false),
      {
        name: "registry",
        setup(build) {
          build.onStart(() => clientModules.clear());
          build.onEnd((result) => {
            if (result.errors.length) return;
            if (writeRegistry(clientModules)) console.log("build-api: wrote src/generated/client-modules.ts");
            if (WATCH) console.log(`build-api: local server rebuilt at ${new Date().toLocaleTimeString("en-GB")}`);
          });
        },
      },
    ],
  };
  if (WATCH) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log("build-api: watching src for the local server");
    return;
  }
  await esbuild.build(options);
  console.log("build-api: local server in .derive-build/server.mjs");
}

async function buildEdge() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("The edge build needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  const pack = await writeContentPack();
  const clientModules = new Set<string>();
  const outfile = path.join(ROOT, "supabase/functions/derive-api/bundle.js");
  const result = await esbuild.build({
    ...common,
    metafile: true,
    entryPoints: [path.join(SRC, "server/edge.ts")],
    outfile,
    platform: "browser",
    target: "es2022",
    minify: true,
    external: ["node:*"],
    conditions: ["worker", "browser"],
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(url),
      "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
      "process.env.DERIVE_COMMIT": JSON.stringify(commit()),
      // The Edge Runtime cannot set environment variables, so these are fixed here.
      "process.env.DERIVE_DEPLOYED": JSON.stringify("1"),
      "process.env.DERIVE_LOCAL_STORE": "undefined",
    },
    banner: {
      js: [
        'import { Buffer as __DeriveBuffer } from "node:buffer";',
        'import __deriveProcess from "node:process";',
        "globalThis.Buffer ??= __DeriveBuffer;",
        "globalThis.process ??= __deriveProcess;",
      ].join("\n"),
    },
    plugins: [derivePlugin(clientModules, true)],
  });
  // The deployed server has no files and no MDX compiler: its content and its
  // compiled phases must come from the pack, so the swaps above must have held.
  const inputs = new Set(Object.keys(result.metafile!.inputs).map((p) => path.resolve(ROOT, p)));
  const swaps: [string, string][] = [
    ["src/lib/content/mdx-precompiled.ts", "src/server/edge/mdx-precompiled.ts"],
    ["src/lib/content/files.ts", "src/server/edge/content-fs.ts"],
  ];
  for (const [swapped, by] of swaps) {
    const original = path.join(ROOT, swapped);
    if (swapped.endsWith("mdx-precompiled.ts") && inputs.has(original)) {
      throw new Error(`The edge bundle includes ${swapped}; it must use ${by}. Import it as "@/lib/content/mdx-precompiled".`);
    }
    if (!inputs.has(path.join(ROOT, by))) throw new Error(`The edge bundle is missing ${by}.`);
  }
  const size = statSync(outfile).size;
  console.log(
    `build-api: edge function in supabase/functions/derive-api/bundle.js, ${(size / 1e6).toFixed(2)} MB ` +
      `(${pack.files} content files and ${pack.phases} compiled phases packed in)`,
  );
  if (size > 18e6) throw new Error("The edge function is over 18 MB; Supabase allows 20 MB. Split the content pack.");
}

await buildNode();
if (EDGE) await buildEdge();
