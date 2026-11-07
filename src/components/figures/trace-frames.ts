import type { TraceFrame, TraceStep } from "@/lib/python/client";

/*
 * Reading a program trace call by call. Each step holds the whole stack, from
 * the main program to the call running now, so a change is found by setting a
 * frame against the same call at the step before.
 */

export const MAIN = "(main program)";

/**
 * A call as the figure names it: with the arguments it began with, such as `countdown(2)`, so
 * that several calls of one function can be told apart. A trace without them gives the function.
 */
export function callName(frame: TraceFrame): string {
  return frame.call ?? frame.function;
}

/** Whether the frame at this depth is the same call at both steps, not a new call of the same function. */
export function sameCall(prev: TraceStep | undefined, cur: TraceStep, index: number): boolean {
  const before = prev?.stack[index];
  const now = cur.stack[index];
  if (!prev || !before || !now || before.function !== now.function) return false;
  // A call that returned at the step before, at this depth, is gone, and a generator that yielded
  // there has paused: the frame here now is a new call, or the generator going on after its yield.
  if (prev.event === "return" && index === prev.stack.length - 1 && index > 0) return false;
  // A trace that numbers its calls tells apart a generator that left the stack at a yield and
  // another call of the same function in its place.
  return before.id === undefined || now.id === undefined || before.id === now.id;
}

/** A call by its number, among the calls in progress and the generators paused at the step. */
function findCall(step: TraceStep, id: number): TraceFrame | undefined {
  return step.stack.find((f) => f.id === id) ?? step.paused?.find((f) => f.id === id);
}

/**
 * The frame at this depth as it stood at the step before: the same call at the same depth, or, for
 * a generator going on after its yield, the generator as it paused.
 */
export function earlierFrame(prev: TraceStep | undefined, cur: TraceStep, index: number): TraceFrame | undefined {
  if (!prev) return undefined;
  if (sameCall(prev, cur, index)) return prev.stack[index];
  const now = cur.stack[index];
  return now?.resumed && now.id !== undefined ? findCall(prev, now.id) : undefined;
}

function marksAgainst(was: TraceFrame | undefined, now: TraceFrame): Record<string, "new" | "changed"> {
  const marks: Record<string, "new" | "changed"> = {};
  const before = was?.variables ?? {};
  for (const [name, value] of Object.entries(now.variables)) {
    if (!(name in before)) marks[name] = "new";
    else if (before[name] !== value || was?.refs?.[name] !== now.refs?.[name] || was?.digests?.[name] !== now.digests?.[name]) {
      marks[name] = "changed";
    }
  }
  return marks;
}

/**
 * The names of one frame that are new or changed since the step before. A name is changed when
 * its value is, or when it now refers to another list, dict, set or object, even one with an
 * equal value. A long value is cut where it is shown, so its fingerprint is compared as well.
 */
export function frameMarks(prev: TraceStep | undefined, cur: TraceStep | undefined, index: number): Record<string, "new" | "changed"> {
  const now = cur?.stack[index];
  if (!cur || !now || !prev) return {};
  return marksAgainst(earlierFrame(prev, cur, index), now);
}

/**
 * The names of a paused generator that changed since the step before: none, unless a list or
 * object it refers to was changed in place while it waited.
 */
export function pausedMarks(prev: TraceStep | undefined, frame: TraceFrame): Record<string, "new" | "changed"> {
  const was = prev && frame.id !== undefined ? findCall(prev, frame.id) : undefined;
  return was ? marksAgainst(was, frame) : {};
}

/** Names as a list in words: "`a`", "`a` and `b`", "`a`, `b` and `c`". */
function inWords(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/**
 * Names and their values in words. A name for a list, dict, set or object is said to refer to
 * it, by its tag, since writing `b = [1, 2]` would read as the line that makes a second list:
 * "`b` refers to list 1 (`[1, 2]`)", or "now refers" for a name moved to another one. Passed to a
 * call, a name is "referring to" it. An object's value is its attributes, such as `lr=0.01`.
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
 * dict, set or object it changed in place, with every name that refers to it.
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
    const was = earlierFrame(a, b, i);
    const names: string[] = [];
    for (const name of Object.keys(marks)) {
      const tag = frame.refs?.[name];
      if (marks[name] === "changed" && tag && was?.refs?.[name] === tag) {
        const entry = inPlace.get(tag) ?? { value: frame.variables[name]!, names: [] };
        entry.names.push(i === 0 ? `\`${name}\`` : `\`${name}\` in \`${callName(frame)}\``);
        inPlace.set(tag, entry);
      } else {
        names.push(name);
      }
    }
    if (same) {
      if (!names.length) return;
      parts.push(assignments(frame, names, marks) + (i === 0 ? "" : ` in \`${callName(frame)}\``));
    } else if (i > 0 && was) {
      // A generator asked for its next value goes on after its yield, with the names it kept.
      parts.push(`resumes \`${callName(frame)}\` after its \`yield\``);
      if (names.length) parts.push(`${assignments(frame, names, marks)} in \`${callName(frame)}\``);
    } else if (i > 0) {
      // A generator's body starts at the first `next`, not when the generator is made.
      const verb = frame.generator ? "starts" : "calls";
      parts.push(names.length ? `${verb} \`${frame.function}\` with ${assignments(frame, names, marks, true)}` : `${verb} \`${frame.function}\``);
    } else if (names.length) {
      parts.push(assignments(frame, names, marks));
    }
  });
  for (const [tag, { value, names }] of inPlace) {
    parts.push(`${tag}, which ${inWords(names)} ${names.length === 1 ? "refers" : "refer"} to, is now \`${value}\``);
  }
  // What the line printed, line by line as print showed it.
  if (b.output.length > a.output.length && b.output.startsWith(a.output)) {
    const printed = b.output.slice(a.output.length).replace(/\n$/, "").split("\n");
    parts.push(`prints ${inWords(printed.map((p) => (p === "" ? "an empty line" : `\`${p}\``)))}`);
  }
  return parts.join("; ");
}

/**
 * A name's value as the running code sees it, and the call whose name it is: the running call's
 * own names first, then the main program's, as Python looks a name up. A caller's names are not
 * seen from inside a call it made. A name such as `self.count` is an object's attribute: the
 * object is looked up by its name, then the attribute among its own.
 */
export function lookupName(step: TraceStep | undefined, name: string): { value: string; owner: string } | undefined {
  if (!step) return undefined;
  const dot = name.indexOf(".");
  const base = dot < 0 ? name : name.slice(0, dot);
  const top = step.stack.length - 1;
  for (const i of top > 0 ? [top, 0] : [0]) {
    const frame = step.stack[i]!;
    if (frame.variables[base] === undefined) continue;
    const value = dot < 0 ? frame.variables[base] : frame.attrs?.[base]?.[name.slice(dot + 1)];
    return value === undefined ? undefined : { value, owner: i === 0 ? MAIN : callName(frame) };
  }
  return undefined;
}

/** The step at which the line run at `at` has finished, with any calls it made: the next step no deeper than it. */
export function finishedStep(steps: TraceStep[], at: number): number {
  const depth = steps[at]?.stack.length ?? 1;
  for (let j = at + 1; j < steps.length; j++) {
    if (steps[j]!.stack.length <= depth) return j;
  }
  return Math.max(0, steps.length - 1);
}

/** The call a step is in, such as `countdown(2)`, or the main program. */
export function runningIn(step: TraceStep | undefined): string {
  const top = step?.stack.at(-1);
  return top ? (top.function === MAIN ? MAIN : callName(top)) : MAIN;
}

/**
 * What a step that is not a line does, in words with code in backticks: a call returns, a
 * generator yields a value and pauses, or reaches the end of its body, or an error stops it.
 */
export function returnText(step: TraceStep): string {
  const fn = runningIn(step);
  if (step.raised) {
    if (fn === MAIN) return `the program stops with \`${step.raised}\``;
    // close(), or a generator dropped while it is paused, ends it at its yield with GeneratorExit.
    return step.raised === "GeneratorExit" ? `\`${fn}\` is closed while paused` : `\`${fn}\` stops with \`${step.raised}\``;
  }
  if (step.yielded !== undefined) return `\`${fn}\` yields \`${step.yielded}\` and pauses`;
  if (step.ended) return `\`${fn}\` ends, so the \`next\` that asked it raises \`StopIteration\``;
  return fn === MAIN ? "the program has finished" : `\`${fn}\` returns \`${step.returned ?? "None"}\``;
}

/**
 * What the call running at a step is doing, for its frame: running, returning a value, yielding
 * one, ending, or stopping with an error.
 */
export function frameStatus(step: TraceStep | undefined): string {
  if (step?.event !== "return") return "running";
  if (step.raised) return `stopping with \`${step.raised}\``;
  if (step.yielded !== undefined) return `yielding \`${step.yielded}\``;
  if (step.ended) return "ending, with nothing more to yield";
  return `returning \`${step.returned ?? "None"}\``;
}

/** What a call below the running one is doing: waiting for the call it made to return, or for the generator it asked to give its next value. */
export function waitingText(next: TraceFrame): string {
  return next.generator ? `waiting for \`${callName(next)}\` to give its next value` : `waiting for \`${callName(next)}\` to return`;
}

/** Where a paused generator waits, for its frame. */
export function pausedStatus(frame: TraceFrame): string {
  return `paused at its \`yield\` on line ${frame.line}`;
}

/** The heading over one frame of the stack. */
export function frameHeading(frame: TraceFrame, index: number): string {
  return index === 0 ? "Main program" : `Call \`${callName(frame)}\``;
}
