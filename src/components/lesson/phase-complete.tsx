"use client";

import { completePhase } from "@/app/(app)/lessons/actions";
import { ActionButton } from "@/components/ui/action-button";

/** The end of a phase: what is still to do, and the button that finishes it. */
export function PhaseComplete({
  code,
  phase,
  left,
  checkLeft,
  label,
}: {
  code: string;
  phase: string;
  left: number;
  checkLeft: number;
  label: string;
}) {
  const parts = [
    left > 0 ? `${left} exercise${left === 1 ? "" : "s"}` : null,
    checkLeft > 0 ? `${checkLeft} mixed-check question${checkLeft === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return (
    <div className="flex flex-col gap-2">
      {parts.length ? (
        <p className="text-sm text-ink-muted">Still to do before you finish: {parts.join(" and ")}.</p>
      ) : (
        <p className="text-sm text-ink-muted">Everything required here is done.</p>
      )}
      <ActionButton action={() => completePhase(code, phase)} pendingText="Saving">
        {label}
      </ActionButton>
    </div>
  );
}
