import type { Metadata } from "next";

import { WiredPage } from "@/components/shell/wired-page";
import { course, curriculum } from "@/lib/curriculum/data";

// A static page for GitHub Pages; its content comes from Derive's server (src/server/app).

type Props = { params: Promise<{ code: string }> };

// Other addresses fall to 404.html, which asks the server all the same.
export const dynamicParams = false;

export function generateStaticParams() {
  return curriculum().curricula.flatMap((c) => c.courses.map((k) => ({ code: k.code })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = course((await params).code);
  return { title: meta ? `${meta.code} ${meta.title}` : "Course" };
}

export default function Page() {
  return <WiredPage />;
}
