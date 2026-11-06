import { describe, expect, it } from "vitest";

import type { TraceStep } from "@/lib/python/client";

import { changesBetween, finishedStep, frameMarks, returnText, sameCall } from "./trace-frames";

const main = (variables: Record<string, string>, line = 1) => ({ function: "(main program)", line, variables });
const call = (fn: string, variables: Record<string, string>, line = 1) => ({ function: fn, line, variables });
const at = (line: number, stack: TraceStep["stack"], event: TraceStep["event"] = "line", returned?: string): TraceStep => ({
  event,
  line,
  stack,
  output: "",
  ...(returned === undefined ? {} : { returned }),
});

// The trace the harness gives for:
//   lr = 0.1 / def halve(lr): lr = lr / 2; return lr / smaller = halve(lr) / print(lr, smaller)
const fn = "<function halve>";
const halveRun: TraceStep[] = [
  at(1, [main({})]),
  at(3, [main({ lr: "0.1" })]),
  at(7, [main({ lr: "0.1", halve: fn })]),
  at(4, [main({ lr: "0.1", halve: fn }, 7), call("halve", { lr: "0.1" }, 4)]),
  at(5, [main({ lr: "0.1", halve: fn }, 7), call("halve", { lr: "0.05" }, 5)]),
  at(5, [main({ lr: "0.1", halve: fn }, 7), call("halve", { lr: "0.05" }, 5)], "return", "0.05"),
  at(8, [main({ lr: "0.1", halve: fn, smaller: "0.05" }, 8)]),
  at(8, [main({ lr: "0.1", halve: fn, smaller: "0.05" }, 8)], "return", "None"),
];

// total = f(1) + f(2), with f(x): y = x * 2; return y. The second call starts at the same depth
// straight after the first returns.
const twoCalls: TraceStep[] = [
  at(5, [main({ f: "<function f>" }, 5)]),
  at(2, [main({ f: "<function f>" }, 5), call("f", { x: "1" }, 2)]),
  at(3, [main({ f: "<function f>" }, 5), call("f", { x: "1", y: "2" }, 3)]),
  at(3, [main({ f: "<function f>" }, 5), call("f", { x: "1", y: "2" }, 3)], "return", "2"),
  at(2, [main({ f: "<function f>" }, 5), call("f", { x: "2" }, 2)]),
];

describe("frame marks", () => {
  it("marks a name made by a line as new and a name it rebinds as changed", () => {
    expect(frameMarks(halveRun[1], halveRun[2], 0)).toEqual({ halve: "new" });
    expect(frameMarks(halveRun[3], halveRun[4], 1)).toEqual({ lr: "changed" });
  });

  it("marks every name of a call that has just started as new, and leaves the caller's alone", () => {
    expect(frameMarks(halveRun[2], halveRun[3], 1)).toEqual({ lr: "new" });
    expect(frameMarks(halveRun[2], halveRun[3], 0)).toEqual({});
  });

  it("treats a call that starts as the last one returns as a new call", () => {
    expect(sameCall(twoCalls[3], twoCalls[4]!, 1)).toBe(false);
    expect(frameMarks(twoCalls[3], twoCalls[4], 1)).toEqual({ x: "new" });
    expect(sameCall(twoCalls[3], twoCalls[4]!, 0)).toBe(true);
  });

  it("marks nothing at the first step", () => {
    expect(frameMarks(undefined, halveRun[0], 0)).toEqual({});
  });
});

describe("changes between steps", () => {
  it("says which call a line starts, with its parameters", () => {
    expect(changesBetween(halveRun[2]!, halveRun[3])).toBe("calls `halve` with `lr = 0.1`");
  });

  it("names the call whose name changed, and leaves the main program's unnamed", () => {
    expect(changesBetween(halveRun[3]!, halveRun[4])).toBe("`lr = 0.05` in `halve`");
    expect(changesBetween(halveRun[5]!, halveRun[6])).toBe("`smaller = 0.05`");
    expect(changesBetween(halveRun[1]!, halveRun[2])).toBe("`halve = <function halve>`");
  });

  it("finds no change for a return line, or at the end", () => {
    expect(changesBetween(halveRun[4]!, halveRun[5])).toBe("");
    expect(changesBetween(halveRun[7]!, undefined)).toBe("");
  });

  it("sees the second of two calls in one line as a new call", () => {
    expect(changesBetween(twoCalls[3]!, twoCalls[4])).toBe("calls `f` with `x = 2`");
  });
});

describe("finished step", () => {
  it("is the next step for a line that calls nothing", () => {
    expect(finishedStep(halveRun, 3)).toBe(4);
  });

  it("waits for a call made by the line to return", () => {
    expect(finishedStep(halveRun, 2)).toBe(6);
  });
});

describe("return text", () => {
  it("says what a call returns, and that the main program has finished", () => {
    expect(returnText(halveRun[5]!)).toBe("`halve` returns `0.05`");
    expect(returnText(halveRun[7]!)).toBe("the program has finished");
  });
});
