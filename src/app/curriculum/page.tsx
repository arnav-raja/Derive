// A static page for GitHub Pages; its content comes from Derive's server (src/server/app).
import type { Metadata } from "next";

import { WiredPage } from "@/components/shell/wired-page";

export const metadata: Metadata = { title: "Curriculum" };

export default function Page() {
  return <WiredPage />;
}
