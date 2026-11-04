"use client";

import katex from "katex";
import { useMemo } from "react";

/*
 * Maths rendered in the browser, for text that only exists there, such as how
 * an expression the learner typed was read. Lesson text is rendered on the
 * server instead. KaTeX runs without trust, so commands like \href are inert.
 */

export function Tex({ tex, className }: { tex: string; className?: string }) {
  const html = useMemo(() => katex.renderToString(tex, { throwOnError: false, strict: "ignore", output: "html" }), [tex]);
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
