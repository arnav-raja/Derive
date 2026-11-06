import { describe, expect, it } from "vitest";

import type { TraceStep } from "@/lib/python/client";

import { changesBetween, finishedStep, frameHeading, frameMarks, frameStatus, lookupName, returnText, runningIn, sameCall } from "./trace-frames";

const main = (variables: Record<string, string>, line = 1, refs?: Record<string, string>, digests?: Record<string, number>) => ({
  function: "(main program)",
  line,
  variables,
  ...(refs ? { refs } : {}),
  ...(digests ? { digests } : {}),
});
const call = (fn: string, variables: Record<string, string>, line = 1, refs?: Record<string, string>) => ({
  function: fn,
  line,
  variables,
  ...(refs ? { refs } : {}),
});
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

// The traces the harness gives for three programs with lists, with each list's tag.
//   a = [1, 2] / b = a / a.append(3) / print(b)
const alias: TraceStep[] = [
  at(1, [main({})]),
  at(2, [main({ a: "[1, 2]" }, 2, { a: "list 1" })]),
  at(3, [main({ a: "[1, 2]", b: "[1, 2]" }, 3, { a: "list 1", b: "list 1" })]),
  at(4, [main({ a: "[1, 2, 3]", b: "[1, 2, 3]" }, 4, { a: "list 1", b: "list 1" })]),
];
//   a = [1, 2] / b = a / a = a + [3] / b = list(b)
const rebind: TraceStep[] = [
  at(3, [main({ a: "[1, 2]", b: "[1, 2]" }, 3, { a: "list 1", b: "list 1" })]),
  at(4, [main({ a: "[1, 2, 3]", b: "[1, 2]" }, 4, { a: "list 2", b: "list 1" })]),
  at(4, [main({ a: "[1, 2, 3]", b: "[1, 2]" }, 4, { a: "list 2", b: "list 3" })], "return", "None"),
];
//   def add_loss(history, loss): history.append(loss) / h = [2.0] / add_loss(h, 1.5)
const mutatingCall: TraceStep[] = [
  at(5, [main({ h: "[2.0]" }, 5, { h: "list 1" })]),
  at(2, [main({ h: "[2.0]" }, 5, { h: "list 1" }), call("add_loss", { history: "[2.0]", loss: "1.5" }, 2, { history: "list 1" })]),
  at(2, [main({ h: "[2.0, 1.5]" }, 5, { h: "list 1" }), call("add_loss", { history: "[2.0, 1.5]", loss: "1.5" }, 2, { history: "list 1" })], "return", "None"),
];

//   xs = list(range(30)) / ys = xs / xs.append(99): the shown value is cut before the change.
const cut = "[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, …";
const longList: TraceStep[] = [
  at(3, [main({ xs: cut, ys: cut }, 3, { xs: "list 1", ys: "list 1" }, { xs: 3616081132, ys: 3616081132 })]),
  at(4, [main({ xs: cut, ys: cut }, 4, { xs: "list 1", ys: "list 1" }, { xs: 477558168, ys: 477558168 })]),
];

//   count = 0 / def tick(): count = count + 1 / tick(): the error stops the call and the program.
const stopped: TraceStep[] = [
  at(4, [main({ count: "0", tick: "<function tick>" }, 6), call("tick", {}, 4)]),
  { ...at(4, [main({ count: "0", tick: "<function tick>" }, 6), call("tick", {}, 4)], "return"), raised: "UnboundLocalError" },
  { ...at(6, [main({ count: "0", tick: "<function tick>" }, 6)], "return"), raised: "UnboundLocalError" },
];

// def countdown(n): if n == 0: print("go"); return / print(n) / countdown(n - 1) / print(n)
// countdown(2): three calls in progress, each named by the argument it began with.
const counting = (n: string, line: number) => ({ function: "countdown", call: `countdown(${n})`, line, variables: { n } });
const countdownMain = main({ countdown: "<function countdown>" }, 9);
const nested: TraceStep[] = [
  { ...at(4, [countdownMain, counting("2", 6), counting("1", 4)]), output: "2\n" },
  { ...at(6, [countdownMain, counting("2", 6), counting("1", 6)]), output: "2\n1\n" },
  { ...at(3, [countdownMain, counting("2", 6), counting("1", 6), counting("0", 3)]), output: "2\n1\n" },
  { ...at(3, [countdownMain, counting("2", 6), counting("1", 6), counting("0", 3)], "return", "None"), output: "2\n1\ngo\n" },
  { ...at(7, [countdownMain, counting("2", 6), counting("1", 7)]), output: "2\n1\ngo\n" },
  { ...at(7, [countdownMain, counting("2", 6), counting("1", 7)], "return", "None"), output: "2\n1\ngo\n1\n" },
];

describe("calls of one function", () => {
  it("are named by the arguments each began with", () => {
    expect(frameHeading(nested[2]!.stack[3]!, 3)).toBe("Call `countdown(0)`");
    expect(frameHeading(nested[2]!.stack[0]!, 0)).toBe("Main program");
    expect(runningIn(nested[0])).toBe("countdown(1)");
    expect(runningIn(halveRun[1])).toBe("(main program)");
    expect(returnText(nested[3]!)).toBe("`countdown(0)` returns `None`");
  });

  it("fall back to the function's name in a trace without arguments", () => {
    expect(frameHeading(halveRun[3]!.stack[1]!, 1)).toBe("Call `halve`");
    expect(runningIn(halveRun[3])).toBe("halve");
  });
});

describe("what a line prints", () => {
  it("is part of what the line changed", () => {
    expect(changesBetween(nested[0]!, nested[1])).toBe("prints `1`");
    expect(changesBetween(nested[4]!, nested[5])).toBe("prints `1`");
  });

  it("is given for every line printed, and only by the line that printed it", () => {
    const twoLines: TraceStep[] = [
      { ...at(1, [main({})]), output: "" },
      { ...at(1, [main({})], "return", "None"), output: "a\n\nb\n" },
    ];
    expect(changesBetween(twoLines[0]!, twoLines[1])).toBe("prints `a`, an empty line and `b`");
    expect(changesBetween(nested[1]!, nested[2])).toBe("calls `countdown` with `n = 0`");
  });
});

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

  it("marks every name for a list changed in place", () => {
    expect(frameMarks(alias[2], alias[3], 0)).toEqual({ a: "changed", b: "changed" });
  });

  it("marks a name that moves to another list with an equal value", () => {
    expect(frameMarks(rebind[1], rebind[2], 0)).toEqual({ b: "changed" });
  });

  it("marks a long list changed past the point where its value is cut", () => {
    expect(frameMarks(longList[0], longList[1], 0)).toEqual({ xs: "changed", ys: "changed" });
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

  it("says which list a name is made to refer to, by its tag", () => {
    expect(changesBetween(alias[1]!, alias[2])).toBe("`b` refers to list 1 (`[1, 2]`)");
    expect(changesBetween(rebind[0]!, rebind[1])).toBe("`a` now refers to list 2 (`[1, 2, 3]`)");
    expect(changesBetween(rebind[1]!, rebind[2])).toBe("`b` now refers to list 3 (`[1, 2]`)");
  });

  it("says a list changed in place, with every name that refers to it", () => {
    expect(changesBetween(alias[2]!, alias[3])).toBe("list 1, which `a` and `b` refer to, is now `[1, 2, 3]`");
    expect(changesBetween(mutatingCall[1]!, mutatingCall[2])).toBe(
      "list 1, which `h` and `history` in `add_loss` refer to, is now `[2.0, 1.5]`",
    );
  });

  it("says a long list changed in place even when its shown value did not change", () => {
    expect(changesBetween(longList[0]!, longList[1])).toBe(`list 1, which \`xs\` and \`ys\` refer to, is now \`${cut}\``);
  });

  it("gives the tag of a list passed to a call", () => {
    expect(changesBetween(mutatingCall[0]!, mutatingCall[1])).toBe("calls `add_loss` with `history` referring to list 1 (`[2.0]`) and `loss = 1.5`");
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

  it("says that an error stopped a call, and the program, rather than that they returned", () => {
    expect(returnText(stopped[1]!)).toBe("`tick` stops with `UnboundLocalError`");
    expect(returnText(stopped[2]!)).toBe("the program stops with `UnboundLocalError`");
  });
});

describe("frame status", () => {
  it("says whether the running call is running, returning a value or stopping with an error", () => {
    expect(frameStatus(stopped[0])).toBe("running");
    expect(frameStatus(halveRun[5])).toBe("returning `0.05`");
    expect(frameStatus(stopped[1])).toBe("stopping with `UnboundLocalError`");
  });
});

// The trace the harness gives for a method call, m.add(3), on an object of the program's own
// class: self and m refer to one object, Meter 1, whose attributes are kept one by one.
const meter = (total: string, count: string) => ({ total, count });
const inMethod: TraceStep = at(
  8,
  [
    { ...main({ Meter: "methods: __init__, add", m: "total=0, count=0" }, 12, { Meter: "class Meter", m: "Meter 1" }), attrs: { m: meter("0", "0") } },
    { ...call("Meter.add", { self: "total=3, count=0", x: "3" }, 8, { self: "Meter 1" }), call: "Meter.add(Meter 1, 3)", attrs: { self: meter("3", "0") } },
  ],
);

describe("looking a name up", () => {
  it("finds the running call's own name before the main program's", () => {
    expect(lookupName(halveRun[4], "lr")).toEqual({ value: "0.05", owner: "halve" });
    expect(lookupName(halveRun[6], "lr")).toEqual({ value: "0.1", owner: "(main program)" });
  });

  it("finds an object's attribute by the name of the object", () => {
    expect(lookupName(inMethod, "self.total")).toEqual({ value: "3", owner: "Meter.add(Meter 1, 3)" });
    expect(lookupName(inMethod, "m.count")).toEqual({ value: "0", owner: "(main program)" });
  });

  it("finds nothing for a name not yet made, or an attribute the object does not have", () => {
    expect(lookupName(halveRun[0], "lr")).toBeUndefined();
    expect(lookupName(inMethod, "self.mean")).toBeUndefined();
    expect(lookupName(inMethod, "x.real")).toBeUndefined();
  });
});

describe("objects of the program's own classes", () => {
  it("are said to be referred to by their tag, with their attributes", () => {
    const before = at(11, [main({ Meter: "methods: __init__, add" }, 11, { Meter: "class Meter" })]);
    const after = at(12, [main({ Meter: "methods: __init__, add", m: "total=0, count=0" }, 12, { Meter: "class Meter", m: "Meter 1" })]);
    expect(changesBetween(before, after)).toBe("`m` refers to Meter 1 (`total=0, count=0`)");
  });

  it("are said to change in place, with every name that refers to them", () => {
    const step = (total: string) => at(12, [main({ m: `total=${total}`, n: `total=${total}` }, 12, { m: "Meter 1", n: "Meter 1" })]);
    expect(changesBetween(step("0"), step("3"))).toBe("Meter 1, which `m` and `n` refer to, is now `total=3`");
  });
});
