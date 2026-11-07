import { createHash } from "node:crypto";

import { MDX_OPTIONS } from "./mdx-options";

/*
 * Compiling lesson MDX, shared by the local server and the build of the
 * deployed one, which compiles every phase ahead of time.
 */

/** The key a compiled phase is kept under: the hash of its source. */
export function mdxKey(source: string): string {
  return createHash("sha256").update(source).digest("hex");
}

/** Compiles MDX to the body of an async function, as @mdx-js/mdx's "function-body" output. */
export async function compileMdxCode(source: string): Promise<string> {
  const { compile } = await import("@mdx-js/mdx");
  return String(await compile(source, MDX_OPTIONS));
}
