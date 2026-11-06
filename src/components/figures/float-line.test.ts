import { describe, expect, it } from "vitest";

import { sizeText } from "./float-line";
import { exactValue, parseLiteral, subtract } from "./floats";

const off = (text: string) => subtract(exactValue(Number(text)), parseLiteral(text)!);

describe("sizeText", () => {
  it("sizes an ordinary difference as formatValue does", () => {
    expect(sizeText(off("0.1"))).toBe("5.55 × 10⁻¹⁸");
  });

  it("sizes a difference far below the smallest float from the exact fraction", () => {
    expect(sizeText(off("5e-324"))).toBe("5.93 × 10⁻³²⁶");
    expect(off("5e-324").num < 0n).toBe(true);
  });

  it("says 0 for no difference", () => {
    expect(sizeText(off("0.5"))).toBe("0");
  });
});
