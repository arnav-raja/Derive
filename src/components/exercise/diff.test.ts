import { describe, expect, it } from "vitest";

import { changedLines } from "./diff";

const lines = (s: Set<number>) => [...s].sort((x, y) => x - y);

describe("changedLines", () => {
  it("marks one changed line", () => {
    expect(lines(changedLines("a = 1\nb = a / 2\nprint(b)\n", "a = 1\nb = a * 2\nprint(b)\n"))).toEqual([1]);
  });

  it("marks two separate edits without the unchanged lines between them", () => {
    const code = "from u import second, julian_year\n\nseconds = 3\nx = convert(seconds, julian_year)\ny = x / julian_year\nprint(x)";
    const broken = "from u import second, year\n\nseconds = 3\nx = convert(seconds, year)\ny = x / year\nprint(x)";
    expect(lines(changedLines(code, broken))).toEqual([0, 3, 4]);
  });

  it("marks an inserted line and nothing for a deleted one", () => {
    expect(lines(changedLines("a\nb\nc", "a\nnew\nb\nc"))).toEqual([1]);
    expect(lines(changedLines("a\nb\nc", "a\nc"))).toEqual([]);
  });

  it("marks nothing when the programs are the same", () => {
    expect(lines(changedLines("x = 1\nprint(x)\n", "x = 1\nprint(x)"))).toEqual([]);
  });
});
