import { describe, expect, it } from "vitest";

import {
  add,
  exactDecimal,
  exactValue,
  groupDecimal,
  nextDown,
  nextUp,
  parseLiteral,
  powerOfTwo,
  pythonRepr,
  subtract,
  toNumber,
} from "./floats";

// The expected values were printed by Python 3.14: Decimal(x), Fraction(x) and repr(x).

describe("exact values of floats", () => {
  it("writes out what a float really holds", () => {
    expect(exactDecimal(exactValue(0.1))).toBe("0.1000000000000000055511151231257827021181583404541015625");
    expect(exactDecimal(exactValue(0.3))).toBe("0.299999999999999988897769753748434595763683319091796875");
    expect(exactDecimal(exactValue(0.1 + 0.2))).toBe("0.3000000000000000444089209850062616169452667236328125");
    expect(exactDecimal(exactValue(0.75))).toBe("0.75");
    expect(exactDecimal(exactValue(1e16))).toBe("10000000000000000");
    expect(exactDecimal(exactValue(-2.5))).toBe("-2.5");
  });

  it("gives a fraction over a power of two", () => {
    const v = exactValue(0.1);
    expect(v.num).toBe(3602879701896397n);
    expect(powerOfTwo(v.den)).toBe(55);
    expect(powerOfTwo(exactValue(0.75).den)).toBe(2);
    expect(powerOfTwo(10n)).toBeNull();
  });

  it("adds two floats exactly, before any rounding", () => {
    const sum = add(exactValue(0.1), exactValue(0.2));
    expect(sum.num).toBe(10808639105689191n);
    expect(powerOfTwo(sum.den)).toBe(55);
    expect(exactDecimal(sum)).toBe("0.3000000000000000166533453693773481063544750213623046875");
  });
});

describe("neighbouring floats", () => {
  it("are a fixed number of significant figures apart", () => {
    expect(nextUp(1e16) - 1e16).toBe(2);
    expect(nextUp(1e20) - 1e20).toBe(16384);
    expect(nextUp(0.3) - 0.3).toBe(5.551115123125783e-17);
    expect(nextUp(0.3)).toBe(0.1 + 0.2);
    expect(nextDown(1)).toBe(1 - 2 ** -53);
    expect(nextUp(-1)).toBe(-1 + 2 ** -53);
    expect(nextUp(0)).toBe(Number.MIN_VALUE);
  });
});

describe("reading a typed number", () => {
  it("reads Python's float literals exactly", () => {
    expect(parseLiteral("0.1")).toEqual({ num: 1n, den: 10n });
    expect(parseLiteral("2.5e-3")).toEqual({ num: 1n, den: 400n });
    expect(parseLiteral("1e16")).toEqual({ num: 10n ** 16n, den: 1n });
    expect(parseLiteral("-.5")).toEqual({ num: -1n, den: 2n });
    expect(parseLiteral("1_024")).toEqual({ num: 1024n, den: 1n });
    expect(parseLiteral("0.1 + 0.2")).toBeNull();
    expect(parseLiteral("abc")).toBeNull();
    expect(parseLiteral(".")).toBeNull();
  });

  it("measures how far the stored float is from the decimal", () => {
    const gap = subtract(exactValue(0.1), parseLiteral("0.1")!);
    expect(toNumber(gap)).toBeCloseTo(5.551115123125783e-18, 30);
  });
});

describe("pythonRepr", () => {
  it("prints floats as Python does", () => {
    const cases: [number, string][] = [
      [0.1, "0.1"],
      [0.1 + 0.2, "0.30000000000000004"],
      [0.7 + 0.2 + 0.1, "0.9999999999999999"],
      [1e16, "1e+16"],
      [1e15, "1000000000000000.0"],
      [1e-5, "1e-05"],
      [0.0001, "0.0001"],
      [123456789012345678, "1.2345678901234568e+17"],
      [300, "300.0"],
      [2.5e-3, "0.0025"],
      [-0.5, "-0.5"],
      [0, "0.0"],
      [1e100, "1e+100"],
      [5e-324, "5e-324"],
      [Infinity, "inf"],
      [1234.5678, "1234.5678"],
    ];
    for (const [x, text] of cases) expect(pythonRepr(x)).toBe(text);
  });
});

describe("groupDecimal", () => {
  it("groups the whole part with commas and the rest in threes", () => {
    expect(groupDecimal("10000000000000000")).toBe("10,000,000,000,000,000");
    expect(groupDecimal("0.1000000000000000055")).toBe("0.100 000 000 000 000 005 5");
    expect(groupDecimal("-1234.5")).toBe("−1,234.5");
  });
});
