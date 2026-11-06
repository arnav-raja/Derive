import type { TraceFrame, TraceStep } from "@/lib/python/client";

/*
 * Reading a program trace call by call. Each step holds the whole stack, from
 * the main program to the call running now, so a change is found by setting a
 * frame against the same call at the step before.
 */

export const MAIN = "(main program)";

/** Whether the frame at this depth is the same call at both steps, not a new call of the same function. */
export function sameCall(prev: TraceStep | undefined, cur: TraceStep, index: number): boolean {
  const before = prev?.stack[index];
  const now = cur.stack[index];
  if (!prev || !before || !now || before.function !== now.function) return false;
  // A call that returned at the step before, at this depth, is gone: the frame here now is a new call.
  return !(prev.event === "return" && index === prev.stack.length - 1 && index > 0);
}

/** The names of one frame that are new or changed since the step before. */
export function frameMarks(prev: TraceStep | undefined, cur: TraceStep | undefined, index: number): Record<string, "new" | "changed"> {
  const marks: Record<string, "new" | "changed"> = {};
  const now = cur?.stack[index];
  if (!cur || !now || !prev) return marks;
  const before = sameCall(prev, cur, index) ? prev.stack[index]!.variables : {};
  for (const [name, value] of Object.entries(now.variables)) {
    if (!(name in before)) marks[name] = "new";
    else if (before[name] !== value) marks[name] = "changed";
  }
  return marks;
}

function assignments(variables: Record<string, string>, names: string[]): string {
  return names.map((n) => `\`${n} = ${variables[n]}\``).join(", ");
}

/**
 * What running the line at step `a` changed, by the time of step `b`, in words with code in
 * backticks: the names it made or changed, frame by frame, and any call it started.
 */
export function changesBetween(a: TraceStep, b: TraceStep | undefined): string {
  if (!b) return "";
  const parts: string[] = [];
  b.stack.forEach((frame, i) => {
    const marks = frameMarks(a, b, i);
    const names = Object.keys(marks);
    if (sameCall(a, b, i)) {
      if (!names.length) return;
      parts.push(assignments(frame.variables, names) + (i === 0 ? "" : ` in \`${frame.function}\``));
    } else if (i > 0) {
      parts.push(names.length ? `calls \`${frame.function}\` with ${assignments(frame.variables, names)}` : `calls \`${frame.function}\``);
    } else if (names.length) {
      parts.push(assignments(frame.variables, names));
    }
  });
  return parts.join("; ");
}

/** The step at which the line run at `at` has finished, with any calls it made: the next step no deeper than it. */
export function finishedStep(steps: TraceStep[], at: number): number {
  const depth = steps[at]?.stack.length ?? 1;
  for (let j = at + 1; j < steps.length; j++) {
    if (steps[j]!.stack.length <= depth) return j;
  }
  return Math.max(0, steps.length - 1);
}

/** The function a step is in, or the main program. */
export function runningIn(step: TraceStep | undefined): string {
  return step?.stack.at(-1)?.function ?? MAIN;
}

/** What a step that is not a line does, in words with code in backticks. */
export function returnText(step: TraceStep): string {
  const fn = runningIn(step);
  return fn === MAIN ? "the program has finished" : `\`${fn}\` returns \`${step.returned ?? "None"}\``;
}

/** The heading over one frame of the stack. */
export function frameHeading(frame: TraceFrame, index: number): string {
  return index === 0 ? "Main program" : `Call to \`${frame.function}\``;
}
