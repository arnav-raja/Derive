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

/**
 * The names of one frame that are new or changed since the step before. A name is changed when
 * its value is, or when it now refers to another list, dict or set, even one with an equal value.
 * A long value is cut where it is shown, so its fingerprint is compared as well.
 */
export function frameMarks(prev: TraceStep | undefined, cur: TraceStep | undefined, index: number): Record<string, "new" | "changed"> {
  const marks: Record<string, "new" | "changed"> = {};
  const now = cur?.stack[index];
  if (!cur || !now || !prev) return marks;
  const was = sameCall(prev, cur, index) ? prev.stack[index] : undefined;
  const before = was?.variables ?? {};
  for (const [name, value] of Object.entries(now.variables)) {
    if (!(name in before)) marks[name] = "new";
    else if (before[name] !== value || was?.refs?.[name] !== now.refs?.[name] || was?.digests?.[name] !== now.digests?.[name]) {
      marks[name] = "changed";
    }
  }
  return marks;
}

/** Names as a list in words: "`a`", "`a` and `b`", "`a`, `b` and `c`". */
function inWords(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * Names and their values in words. A name for a list, dict or set is said to refer to it, by its
 * tag, since writing `b = [1, 2]` would read as the line that makes a second list: "`b` refers to
 * list 1 (`[1, 2]`)", or "now refers" for a name moved to another one. Passed to a call, a name is
 * "referring to" it.
 */
function assignments(frame: TraceFrame, names: string[], marks: Record<string, "new" | "changed">, inCall = false): string {
  return inWords(
    names.map((n) => {
      const tag = frame.refs?.[n];
      if (!tag) return `\`${n} = ${frame.variables[n]}\``;
      const verb = inCall ? "referring" : marks[n] === "changed" ? "now refers" : "refers";
      return `\`${n}\` ${verb} to ${tag} (\`${frame.variables[n]}\`)`;
    }),
  );
}

/**
 * What running the line at step `a` changed, by the time of step `b`, in words with code in
 * backticks: the names it made or changed, frame by frame, any call it started, and any list,
 * dict or set it changed in place, with every name that refers to it.
 */
export function changesBetween(a: TraceStep, b: TraceStep | undefined): string {
  if (!b) return "";
  const parts: string[] = [];
  // Objects changed in place: a name that refers to the same object at both steps, whose value
  // differs. Every name for the object shows the change, in whichever frame it is.
  const inPlace = new Map<string, { value: string; names: string[] }>();
  b.stack.forEach((frame, i) => {
    const marks = frameMarks(a, b, i);
    const same = sameCall(a, b, i);
    const was = same ? a.stack[i] : undefined;
    const names: string[] = [];
    for (const name of Object.keys(marks)) {
      const tag = frame.refs?.[name];
      if (marks[name] === "changed" && tag && was?.refs?.[name] === tag) {
        const entry = inPlace.get(tag) ?? { value: frame.variables[name]!, names: [] };
        entry.names.push(i === 0 ? `\`${name}\`` : `\`${name}\` in \`${frame.function}\``);
        inPlace.set(tag, entry);
      } else {
        names.push(name);
      }
    }
    if (same) {
      if (!names.length) return;
      parts.push(assignments(frame, names, marks) + (i === 0 ? "" : ` in \`${frame.function}\``));
    } else if (i > 0) {
      parts.push(names.length ? `calls \`${frame.function}\` with ${assignments(frame, names, marks, true)}` : `calls \`${frame.function}\``);
    } else if (names.length) {
      parts.push(assignments(frame, names, marks));
    }
  });
  for (const [tag, { value, names }] of inPlace) {
    parts.push(`${tag}, which ${inWords(names)} ${names.length === 1 ? "refers" : "refer"} to, is now \`${value}\``);
  }
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

/** What a step that is not a line does, in words with code in backticks: a call returns, or an error stops it. */
export function returnText(step: TraceStep): string {
  const fn = runningIn(step);
  if (step.raised) return fn === MAIN ? `the program stops with \`${step.raised}\`` : `\`${fn}\` stops with \`${step.raised}\``;
  return fn === MAIN ? "the program has finished" : `\`${fn}\` returns \`${step.returned ?? "None"}\``;
}

/** What the call running at a step is doing, for its frame: running, returning a value, or stopping with an error. */
export function frameStatus(step: TraceStep | undefined): string {
  if (step?.event !== "return") return "running";
  return step.raised ? `stopping with \`${step.raised}\`` : `returning \`${step.returned ?? "None"}\``;
}

/** The heading over one frame of the stack. */
export function frameHeading(frame: TraceFrame, index: number): string {
  return index === 0 ? "Main program" : `Call to \`${frame.function}\``;
}
