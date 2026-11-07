"use client";

import { clsx } from "clsx";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/field";
import { HintIcon } from "@/components/ui/icons";

import { Conversation, asLearnerHtml, post, type TutorEntry } from "./tutor";

/*
 * After a missed review, the tutor asks why the answer went wrong. It knows
 * this question's answer, which the learner has now seen, and keeps the
 * card's other questions hidden, since they come back later.
 */

export function SocraticChat({
  cardId,
  configured,
}: {
  cardId: string;
  configured: boolean;
}) {
  const [entries, setEntries] = useState<TutorEntry[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return <p className="text-sm text-ink-muted">The tutor is not connected yet, so read the explanation above and try saying in one sentence where your answer went wrong.</p>;
  }

  async function send(text: string) {
    setPending(true);
    setError(null);
    const history = entries.map((e) => ({ role: e.role, text: e.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }));
    const reply = await post("tutor/talk", { mode: "socratic", cardId, message: text, history });
    setPending(false);
    if (!reply.ok) {
      setError(reply.error);
      return;
    }
    setEntries((prev) => [...prev, ...(text ? [{ role: "learner" as const, html: asLearnerHtml(text) }] : []), { role: "tutor" as const, html: reply.html, source: reply.source }]);
    setMessage("");
  }

  return (
    <section aria-label="Talk it through with the tutor" className="flex flex-col gap-3 rounded-lg border border-hint/40 bg-surface p-4">
      <div className="flex items-center gap-2">
        <HintIcon className="size-4 text-hint" />
        <p className="text-sm font-semibold text-ink">Talk it through</p>
      </div>
      {entries.length === 0 ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-ink-muted">
            A miss is useful when you find out why it happened. The tutor asks a question or two; this card comes back soon with a different question on the same idea.
          </p>
          <Button size="sm" variant="secondary" onClick={() => void send("")} disabled={pending}>
            {pending ? "Thinking" : "Start"}
          </Button>
        </div>
      ) : (
        <>
          <Conversation entries={entries} />
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (message.trim()) void send(message.trim());
            }}
          >
            <label htmlFor={`socratic-${cardId}`} className="sr-only">
              Your reply
            </label>
            <textarea
              id={`socratic-${cardId}`}
              rows={3}
              maxLength={3000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={pending}
              className={clsx(inputClasses, "resize-y py-2")}
            />
            <div className="flex items-center justify-between gap-3">
              <Button type="submit" size="sm" disabled={pending || !message.trim()}>
                {pending ? "Thinking" : "Reply"}
              </Button>
            </div>
          </form>
        </>
      )}
      {error ? (
        <p role="alert" className="text-sm text-incorrect">
          {error}
        </p>
      ) : null}
    </section>
  );
}
