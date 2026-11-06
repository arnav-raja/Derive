import type { Metadata } from "next";

import { WiredPage } from "@/components/shell/wired-page";
import { allLessons, lesson } from "@/lib/curriculum/data";

// A static page for GitHub Pages; its content comes from Derive's server (src/server/app).

type Props = { params: Promise<{ code: string }> };

// Other addresses fall to 404.html, which asks the server all the same.
export const dynamicParams = false;

export function generateStaticParams() {
  return allLessons().map((l) => ({ code: l.code }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = lesson((await params).code);
  return { title: meta ? `${meta.code} ${meta.title}` : "Lesson" };
}

export default function Page() {
  return <WiredPage />;
}
