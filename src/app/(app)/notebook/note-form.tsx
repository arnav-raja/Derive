"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/field";

import { addNote, type NoteFormState } from "./actions";

export function NoteForm() {
  const [state, action, pending] = useActionState<NoteFormState, FormData>(addNote, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-ink">Kind of note</legend>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-inset p-1">
          {(
            [
              ["gap", "A gap"],
              ["question", "A question"],
              ["explanation", "My own explanation"],
            ] as const
          ).map(([value, label], i) => (
            <label key={value} className="relative flex cursor-pointer">
              <input type="radio" name="kind" value={value} defaultChecked={i === 0} className="peer sr-only" />
              <span className="flex w-full items-center justify-center rounded-md px-2 py-1.5 text-center text-xs font-semibold text-ink-muted transition-colors peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus hover:text-ink">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextAreaField
        label="Something you do not understand yet"
        name="body"
        required
        maxLength={4000}
        error={state?.error}
      />
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Saving" : "Add to notebook"}
        </Button>
      </div>
    </form>
  );
}
