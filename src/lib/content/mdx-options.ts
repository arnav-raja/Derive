import type { CompileOptions } from "@mdx-js/mdx";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

import { KATEX_OPTIONS } from "./katex-options";

/** How lesson MDX is compiled, both on the local server and when the deployed server is built. */
export const MDX_OPTIONS: CompileOptions = {
  outputFormat: "function-body",
  remarkPlugins: [remarkGfm, remarkMath],
  rehypePlugins: [[rehypeKatex, KATEX_OPTIONS]],
  development: false,
};
