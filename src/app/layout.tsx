import "@fontsource-variable/source-serif-4/opsz.css";
import "@fontsource-variable/source-serif-4/opsz-italic.css";
import "@fontsource-variable/inter/opsz.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./fonts/sans";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { ScrollStops } from "@/components/ui/scroll-stops";
import { WireHost } from "@/lib/wire/client";

export const metadata: Metadata = {
  title: { default: "Derive", template: "%s · Derive" },
  description:
    "A school for the mathematics, machine learning and ML engineering used at frontier AI labs, taught from first principles.",
  applicationName: "Derive",
  // Derive is private: one learner, never indexed.
  robots: { index: false, follow: false },
  referrer: "strict-origin-when-cross-origin",
};

/** The origin of a configured address, or null when it is unset or not a URL. */
function originOf(url: string | undefined): string | null {
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
}

// GitHub Pages cannot send headers, so the policy travels in a meta tag
// (which cannot carry frame-ancestors). The browser talks to Derive's server
// and to Supabase's sign-in, and to nothing else. Pyodide and its web worker
// need WebAssembly compilation; React's development build needs eval().
const connect = ["'self'", originOf(process.env.NEXT_PUBLIC_DERIVE_API_URL), originOf(process.env.NEXT_PUBLIC_SUPABASE_URL)];
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${[...new Set(connect.filter(Boolean))].join(" ")}`,
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f8" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0f17" },
  ],
};

// Applies a saved theme before the first paint, so there is no flash.
const themeScript = `(function(){try{var t=localStorage.getItem("derive-theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en-IN" suppressHydrationWarning>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-paper text-ink">
        <WireHost>{children}</WireHost>
        <ScrollStops />
      </body>
    </html>
  );
}
