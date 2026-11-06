/*
 * next/font/local on Derive's server. Fonts are declared by the static pages
 * GitHub Pages serves; a server module that imports a font only marks that it
 * uses it.
 */

export default function localFont(): { className: string; style: Record<string, string>; variable: string } {
  return { className: "", style: {}, variable: "" };
}
