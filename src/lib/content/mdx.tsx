import "server-only";

import type { MDXComponents, MDXContent } from "mdx/types";
import * as runtime from "react/jsx-runtime";

import { compileMdxCode, mdxKey } from "./mdx-core";
import { precompiledMdx } from "./mdx-precompiled";

/*
 * Lesson phases are MDX files in the repository, rendered on Derive's server as
 * server components. Lessons never import anything; every component they use
 * is passed in by the page, which is how gated content (reveals, re-teaches)
 * stays on the server until the learner has earned it. The deployed server
 * runs phases compiled when it was built; the local server compiles them as
 * they change.
 */

const compiled = new Map<string, Promise<MDXContent>>();

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor as new (body: string) => (
  options: unknown,
) => Promise<{ default: MDXContent }>;

async function build(source: string, key: string): Promise<MDXContent> {
  const code = precompiledMdx(key) ?? (await compileMdxCode(source));
  const mod = await new AsyncFunction(code)({ ...runtime, baseUrl: import.meta.url });
  return mod.default;
}

/** The compiled component for an MDX source, cached by its content. */
export function compileMdx(source: string): Promise<MDXContent> {
  const key = mdxKey(source);
  let hit = compiled.get(key);
  if (!hit) {
    hit = build(source, key);
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
