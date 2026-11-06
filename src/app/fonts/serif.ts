import localFont from "next/font/local";

/*
 * Source Serif 4, the reading type of lesson text, exercise prompts and the notebook, loaded as
 * sans.ts explains. It is not preloaded: a page's content now arrives from Derive's server after
 * the page loads, and a preload would make every page that links to a lesson fetch the face
 * when it prefetches that link. The page's content is shown once its fonts are in, so the text
 * does not jump as this arrives.
 */

export const serifUpright = localFont({
  src: [{ path: "../../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-normal.woff2", weight: "200 900", style: "normal" }],
  declarations: [
    { prop: "font-family", value: "DeriveSerif" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});

export const serifItalic = localFont({
  src: [{ path: "../../../node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-italic.woff2", weight: "200 900", style: "italic" }],
  declarations: [
    { prop: "font-family", value: "DeriveSerif" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
  display: "swap",
  adjustFontFallback: false,
  preload: false,
});
