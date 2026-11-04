"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getStore } from "@/lib/auth";

export type NoteFormState = { error?: string; ok?: boolean } | null;

const note = z.object({
  body: z.string().trim().min(3, { message: "Write at least a few words." }).max(4000),
  kind: z.enum(["gap", "question", "explanation"]),
});

export async function addNote(_prev: NoteFormState, formData: FormData): Promise<NoteFormState> {
  const parsed = note.safeParse({ body: formData.get("body"), kind: formData.get("kind") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the note." };
  const store = await getStore();
  await store.addNotebookEntry({ ...parsed.data, source: "learner" });
  revalidatePath("/notebook");
  return { ok: true };
}

export async function resolveNote(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;
  const store = await getStore();
  await store.resolveNotebookEntry(id);
  revalidatePath("/notebook");
}
