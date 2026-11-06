import "@/app/fonts/serif";

import type { Metadata } from "next";

import { WiredPage } from "@/components/shell/wired-page";

// A static page for GitHub Pages; its content comes from Derive's server (src/server/app).

export const metadata: Metadata = { title: "Review" };

export default function Page() {
  return <WiredPage />;
}
