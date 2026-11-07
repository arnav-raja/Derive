import "@/app/fonts/serif";

import type { Metadata } from "next";

import { WiredPage } from "@/components/shell/wired-page";
import { writtenLessonCodes } from "@/lib/content/files";
import { lesson } from "@/lib/curriculum/data";
import { PHASES } from "@/lib/store/types";

// A static page for GitHub Pages; its content comes from Derive's server (src/server/app).
// Every written lesson has its six phase pages; the server decides which the learner may open.

type Props = { params: Promise<{ code: string; phase: string }> };

// Other addresses fall to 404.html, which asks the server all the same.
export const dynamicParams = false;

export function generateStaticParams() {
  return writtenLessonCodes().flatMap((code) => PHASES.map((phase) => ({ code, phase })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const meta = lesson((await params).code);
  return { title: meta ? `${meta.code} ${meta.title}` : "Lesson" };
}

export default function Page() {
  return <WiredPage />;
}
