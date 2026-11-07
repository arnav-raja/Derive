import "server-only";

import type { Root, RootContent } from "hast";
import { toHtml } from "hast-util-to-html";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import type { ReactNode } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

import { KATEX_OPTIONS } from "./katex-options";

/*
 * Renders the short Markdown fragments in exercises (prompts, options,
 * explanations) on the server, as React nodes, with the same maths settings as
 * the lesson MDX. Nothing here runs in the browser.
 */

export { KATEX_OPTIONS };

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkMath)
  .use(remarkRehype)
  .use(rehypeKatex, KATEX_OPTIONS)
  .freeze();

const cache = new Map<string, Root>();

function toHast(markdown: string): Root {
  const hit = cache.get(markdown);
  if (hit) return hit;
  const tree = processor.runSync(processor.parse(markdown)) as Root;
  if (cache.size > 2000) cache.clear();
  cache.set(markdown, tree);
  return tree;
}

/** Block Markdown: paragraphs, lists, display maths. */
export function renderMarkdown(markdown: string): ReactNode {
  return toJsxRuntime(toHast(markdown), { Fragment, jsx, jsxs });
}

/** Inline Markdown: a single paragraph is unwrapped, for option labels and titles. */
export function renderInline(markdown: string): ReactNode {
  const tree = toHast(markdown);
  const meaningful = tree.children.filter(
    (n: RootContent) => !(n.type === "text" && n.value.trim() === ""),
  );
  const only = meaningful.length === 1 ? meaningful[0] : undefined;
  if (only && only.type === "element" && only.tagName === "p") {
    return toJsxRuntime({ type: "root", children: only.children }, { Fragment, jsx, jsxs });
  }
  return toJsxRuntime(tree, { Fragment, jsx, jsxs });
}

/**
 * Block Markdown as an HTML string, for replies that reach the browser as
 * data (the tutor's). Raw HTML in the Markdown is dropped, so the result
 * holds only what Markdown and KaTeX produce.
 */
export function renderMarkdownHtml(markdown: string): string {
  const tree = structuredClone(toHast(markdown));
  const clean = (node: Root | RootContent): void => {
    if (!("children" in node)) return;
    node.children = node.children.filter((child) => !(child.type === "element" && child.tagName === "img"));
    for (const child of node.children) {
      if (child.type === "element" && child.tagName === "a") {
        const href = String(child.properties?.href ?? "");
        if (!/^(https?:|\/|#)/i.test(href)) delete child.properties.href;
        child.properties.rel = ["noreferrer"];
      }
      clean(child);
    }
  };
  clean(tree);
  return toHtml(tree);
}
