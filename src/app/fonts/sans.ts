import localFont from "next/font/local";

/*
 * The Latin faces of the reading and interface type, which nearly all of every page is set in,
 * are loaded with next/font so that they can be preloaded: on a cold load they then arrive with
 * the page rather than after its first paint, when text laid out in a fallback font would be
 * laid out again and jump. Each family keeps its Fontsource name as the next in its stack (see
 * globals.css), where the other subsets, such as Latin Extended and Greek, load only when a page
 * uses one of their characters. The unicode range is Fontsource's Latin subset, so these faces
 * stand in for exactly its Latin faces, which are then never loaded. next/font takes only
 * literal values, so the range is written out in full here and in serif.ts.
 *
 * Inter, the interface type, is on every page; the root layout imports this file, so it is
 * preloaded everywhere.
 */

export const sans = localFont({
  src: [{ path: "../../../node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2", weight: "100 900", style: "normal" }],
  declarations: [
    { prop: "font-family", value: "DeriveSans" },
    { prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" },
  ],
  display: "swap",
  adjustFontFallback: false,
  preload: true,
});
