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
      <TextAreaField
        label="Something you do not understand yet"
        name="body"
        required
        maxLength={4000}
        hint="Write it as a question. Derive brings it back until it is resolved."
        error={state?.error}
      />
      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <legend className="sr-only">Kind of note</legend>
        {(
          [
            ["gap", "A gap"],
            ["question", "A question"],
            ["explanation", "My own explanation"],
          ] as const
        ).map(([value, label], i) => (
          <label key={value} className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="kind"
              value={value}
              defaultChecked={i === 0}
              className="size-4 accent-accent"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving" : "Add to notebook"}
        </Button>
      </div>
    </form>
  );
}
