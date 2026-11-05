import { describe, expect, it } from "vitest";

import {
  combineValues,
  evaluate,
  exprText,
  formatValue,
  parseExpr,
  parseLooseNumber,
  parseUnit,
  roundSig,
  sigText,
  unitOf,
  unitText,
  type ExprNode,
} from "./expr";

/** Evaluates like a calculator that rounds every result, as ExpressionTree does with sigfigs. */
function rounded(node: ExprNode, figures: number): number {
  const kids =
    node.kind === "bin" ? [node.left, node.right] : node.kind === "neg" ? [node.arg] : node.kind === "call" ? node.args : [];
  return roundSig(combineValues(node, kids.map((k) => rounded(k, figures)), {}), figures);
}

describe("exprText", () => {
  it("keeps every bracket that changes the shape of the tree", () => {
    expect(exprText(parseExpr("(1 + 0.004) + 0.004"))).toBe("1 + 0.004 + 0.004");
    expect(exprText(parseExpr("1 + (0.004 + 0.004)"))).toBe("1 + (0.004 + 0.004)");
    expect(exprText(parseExpr("8 - (3 - 2)"))).toBe("8 − (3 − 2)");
    expect(exprText(parseExpr("a + (b - c)"))).toBe("a + (b − c)");
    expect(exprText(parseExpr("a*(b/c)"))).toBe("a × (b ÷ c)");
    expect(exprText(parseExpr("(3 + 4)*2"))).toBe("(3 + 4) × 2");
  });

  it("drops brackets the order of operations already implies", () => {
    expect(exprText(parseExpr("3 + (4*2)"))).toBe("3 + 4 × 2");
    expect(exprText(parseExpr("(8 - 3) - 2"))).toBe("8 − 3 − 2");
    expect(exprText(parseExpr("2^(3^2)"))).toBe("2^3^2");
    expect(exprText(parseExpr("(2^3)^2"))).toBe("(2^3)^2");
  });
});

describe("evaluate", () => {
  it("follows the order of operations and the brackets", () => {
    expect(evaluate(parseExpr("3 + 4*2"), {})).toBe(11);
    expect(evaluate(parseExpr("(3 + 4)*2"), {})).toBe(14);
    expect(evaluate(parseExpr("8 - 3 - 2"), {})).toBe(3);
    expect(evaluate(parseExpr("8 - (3 - 2)"), {})).toBe(7);
    expect(evaluate(parseExpr("C/R"), { C: 3.15e23, R: 1e14 })).toBeCloseTo(3.15e9, -3);
  });
});

describe("a calculator that rounds every result", () => {
  it("breaks associativity, as in M1.2", () => {
    expect(rounded(parseExpr("(1 + 0.004) + 0.004"), 3)).toBe(1);
    expect(rounded(parseExpr("1 + (0.004 + 0.004)"), 3)).toBe(1.01);
    expect(rounded(parseExpr("(100 + 0.4) + 0.4"), 3)).toBe(100);
    expect(rounded(parseExpr("100 + (0.4 + 0.4)"), 3)).toBe(101);
  });

  it("never breaks commutativity", () => {
    for (const [a, b] of [
      [1, 0.004],
      [123, 0.456],
      [9.99, 0.006],
    ]) {
      expect(rounded(parseExpr(`${a} + ${b}`), 3)).toBe(rounded(parseExpr(`${b} + ${a}`), 3));
    }
  });

  it("shows trailing zeros, as a calculator display does", () => {
    expect(sigText(1, 3)).toBe("1.00");
    expect(sigText(0.008, 3)).toBe("0.00800");
    expect(sigText(1.01, 3)).toBe("1.01");
    expect(roundSig(0, 3)).toBe(0);
  });
});

describe("formatValue", () => {
  it("groups digits in threes and uses powers of ten for very large or small values", () => {
    expect(formatValue(500050)).toBe("500,050");
    expect(formatValue(31557600)).toBe("3.16 × 10⁷");
    expect(formatValue(0.25)).toBe("0.25");
    expect(formatValue(3.15e23)).toBe("3.15 × 10²³");
  });
});

describe("parseLooseNumber", () => {
  it("reads the ways a learner types a number", () => {
    expect(parseLooseNumber("3e23")).toBe(3e23);
    expect(parseLooseNumber("3 × 10^23")).toBe(3e23);
    expect(parseLooseNumber("1/4")).toBe(0.25);
    expect(parseLooseNumber("-3/4")).toBe(-0.75);
    expect(parseLooseNumber("1/0")).toBeNaN();
    expect(parseLooseNumber("10^5")).toBe(1e5);
    expect(parseLooseNumber("31,557,600")).toBe(31557600);
    expect(parseLooseNumber("−2")).toBe(-2);
    expect(Number.isNaN(parseLooseNumber("about 3"))).toBe(true);
  });
});

describe("units", () => {
  it("cancel and combine like symbols", () => {
    const units = { C: parseUnit("FLOP"), R: parseUnit("FLOP/s") };
    const time = unitOf(parseExpr("C/R"), units);
    expect(time.ok && unitText(time.unit)).toBe("s");
    const wrong = unitOf(parseExpr("C*R"), units);
    expect(wrong.ok && unitText(wrong.unit)).toBe("FLOP^2/s");
  });
});
