import "server-only";

import { createHash } from "node:crypto";

import { compile, run } from "@mdx-js/mdx";
import type { MDXComponents, MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { KATEX_OPTIONS } from "./markdown";

/*
 * Lesson phases are MDX files in the repository, compiled on the server and
 * rendered as React Server Components. Lessons never import anything; every
 * component they use is passed in by the page, which is how gated content
 * (reveals, re-teaches) stays on the server until the learner has earned it.
 */

const compiled = new Map<string, Promise<MDXContent>>();

async function build(source: string): Promise<MDXContent> {
  const code = await compile(source, {
    outputFormat: "function-body",
    remarkPlugins: [remarkGfm, remarkMath],
    rehypePlugins: [[rehypeKatex, KATEX_OPTIONS]],
    development: false,
  });
  const mod = await run(String(code), { ...runtime, baseUrl: import.meta.url });
  return mod.default;
}

/** The compiled component for an MDX source, cached by its content. */
export function compileMdx(source: string): Promise<MDXContent> {
  const key = createHash("sha256").update(source).digest("hex");
  let hit = compiled.get(key);
  if (!hit) {
    hit = build(source);
    hit.catch(() => compiled.delete(key));
    if (compiled.size > 200) compiled.clear();
    compiled.set(key, hit);
  }
  return hit;
}

export async function MdxContent({ source, components }: { source: string; components: MDXComponents }) {
  const Content = await compileMdx(source);
  return <Content components={components} />;
}
