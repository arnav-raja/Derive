import localFont from "next/font/local";

/*
 * The two KaTeX faces that nearly every formula is set in: KaTeX_Main for digits, operators and
 * upright letters, and KaTeX_Math for italic variables. katex.css declares them with every other
 * KaTeX face, but a stylesheet's faces are fetched only once text needs them, after the first
 * paint, and KaTeX sets them with font-display block, so a paragraph with a formula in it is laid
 * out with a fallback's metrics and then again when they arrive, and the lines below it jump (a
 * layout shift of 0.25 on M1.8's Explore at tablet width). Declaring the same two faces here lets
 * next/font preload them on the lesson phase pages, which import this file through
 * phase-components.tsx. These rules come after katex.css's, so they are the ones the browser
 * uses, and katex.css's copies of these two faces are never fetched.
 */

export const katexMain = localFont({
  src: [{ path: "../../../node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2", weight: "400", style: "normal" }],
  declarations: [{ prop: "font-family", value: "KaTeX_Main" }],
  display: "block",
  adjustFontFallback: false,
  preload: true,
});

export const katexMath = localFont({
  src: [{ path: "../../../node_modules/katex/dist/fonts/KaTeX_Math-Italic.woff2", weight: "400", style: "italic" }],
  declarations: [{ prop: "font-family", value: "KaTeX_Math" }],
  display: "block",
  adjustFontFallback: false,
  preload: true,
});
