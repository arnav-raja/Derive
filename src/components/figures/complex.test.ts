import { describe, expect, it } from "vitest";

import {
  add,
  angleOf,
  complexText,
  eulerChain,
  eulerFactor,
  eulerRows,
  eulerTurn,
  eulerWords,
  fromPolar,
  length,
  mul,
  power,
  powers,
  powersWords,
  productWords,
  raised,
  wrap,
} from "./complex";
import { tickStep } from "./complex-plane";

const close = (a: number, b: number, tol = 1e-9) => Math.abs(a - b) < tol;
const same = (p: readonly number[], q: readonly number[], tol = 1e-9) => close(p[0]!, q[0]!, tol) && close(p[1]!, q[1]!, tol);

describe("arithmetic", () => {
  it("follows the lesson's examples", () => {
    expect(mul([0, 1], [0, 1])).toEqual([-1, 0]);
    expect(mul([0, 1], [3, 1])).toEqual([-1, 3]);
    expect(mul([1, 2], [3, -1])).toEqual([5, 5]);
    expect(add([2, 1], [1, 3])).toEqual([3, 4]);
    expect(mul([1, 2], [1, -2])).toEqual([5, 0]);
    expect(length([3, 4])).toBe(5);
    expect(power([1, 1], 8)).toEqual([16, 0]);
    expect(powers([1, 1], 4)).toEqual([
      [1, 0],
      [1, 1],
      [0, 2],
      [-2, 2],
      [-4, 0],
    ]);
  });

  it("multiplies lengths and adds angles", () => {
    for (const [zr, zd, wr, wd] of [
      [1.5, 45, 2, 30],
      [0.5, -120, 1.75, 170],
      [2, 90, 2, 90],
      [1.25, 10, 0.75, -60],
    ] as const) {
      const p = mul(fromPolar(zr, zd), fromPolar(wr, wd));
      expect(close(length(p), zr * wr)).toBe(true);
      expect(close(angleOf(p), wrap(zd + wd))).toBe(true);
    }
  });

  it("gives angles as cmath.phase does, from just above -180 to 180", () => {
    expect(angleOf([-1, 0])).toBe(180);
    expect(angleOf([0, 1])).toBe(90);
    expect(angleOf([0, -1])).toBe(-90);
    expect(close(angleOf([1, 1]), 45)).toBe(true);
    expect(wrap(195)).toBe(-165);
    expect(wrap(-180)).toBe(180);
    expect(wrap(360)).toBe(0);
    expect(wrap(-200)).toBe(160);
  });

  it("raises to large powers one multiplication at a time", () => {
    const z = fromPolar(1.0001, 0.01);
    expect(same(power(z, 1000), powers(z, 1000)[1000]!, 1e-9)).toBe(true);
    expect(power([2, 0], 10)).toEqual([1024, 0]);
    expect(power([3, -2], 0)).toEqual([1, 0]);
  });
});

describe("complexText", () => {
  it("writes a + bi as the lesson does", () => {
    expect(complexText([0.7765, 2.8978])).toBe("0.777 + 2.898i");
    expect(complexText([3, -2])).toBe("3 − 2i");
    expect(complexText([0, 2])).toBe("2i");
    expect(complexText([0, -1])).toBe("−i");
    expect(complexText([-4, 0])).toBe("−4");
    expect(complexText([1, 1])).toBe("1 + i");
    expect(complexText([1e-17, -1e-17])).toBe("0");
    expect(complexText([1_000, 2_500])).toBe("1,000 + 2,500i");
  });

  it("raises a power's digits for the labels on the picture, as in z⁸", () => {
    expect(raised(8)).toBe("⁸");
    expect(raised(24)).toBe("²⁴");
    expect(raised(10)).toBe("¹⁰");
  });

  it("spaces the axis numbers 1, 2 or 5 times a power of ten apart, at most five on each side", () => {
    expect(tickStep(1.5)).toBe(0.5);
    expect(tickStep(3)).toBe(1);
    expect(tickStep(10)).toBe(2);
    expect(tickStep(160)).toBe(50);
    expect(tickStep(19_357)).toBe(5_000);
    for (const limit of [1.5, 2.6, 7, 40, 160, 900, 5_000, 19_357]) expect(limit / tickStep(limit)).toBeLessThanOrEqual(5);
  });
});

describe("productWords", () => {
  it("says the lengths multiply and the angles add", () => {
    const [first, second] = productWords(1.5, 45, 2, 30);
    expect(first).toBe("z has length 1.5 and angle 45°, so z = 1.061 + 1.061i; w has length 2 and angle 30°, so w = 1.732 + i.");
    expect(second).toBe("Multiplied out, zw = 0.776 + 2.898i. Its length is 3, the same as 1.5 × 2, and its angle is 75°, the same as 45° + 30°.");
  });

  it("names a whole turn when the angles add past 180°", () => {
    const [, second] = productWords(1, 45, 1, 150);
    expect(second).toContain("its angle is −165°, which points the same way as 45° + 150° = 195°, a whole turn of 360° away");
    const [, third] = productWords(1, 45, 1, -30);
    expect(third).toContain("the same as 45° − 30°");
  });
});

describe("powersWords", () => {
  it("tells the puzzle's eighth power of 1 + i", () => {
    const lines = powersWords(Math.SQRT2, 45, 8);
    expect(lines[0]).toBe("z = 1 + i, with length 1.414 and angle 45°.");
    expect(lines[1]).toBe(
      "Multiplying out 8 copies of z gives z^8 = 16, with length 16 and angle 0°. That length is 1.414^8 = 16, and 8 × 45° = 360°, which points the same way as 0°.",
    );
    expect(lines).toHaveLength(2);
  });

  it("says when a power comes back to 1", () => {
    const lines = powersWords(1, 120, 3);
    expect(lines[2]).toBe("So z^3 = 1.");
    expect(powersWords(1, 0, 1)).toHaveLength(2);
    expect(powersWords(1, 90, 1)[1]).toContain("1 copy of z");
  });
});

describe("Euler's steps", () => {
  it("makes the chain from 1 by repeated multiplication", () => {
    const chain = eulerChain(180, 2);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toEqual([1, 0]);
    expect(same(chain[1]!, [1, Math.PI / 2])).toBe(true);
    expect(same(chain[2]!, [1 - (Math.PI * Math.PI) / 4, Math.PI])).toBe(true);
  });

  it("steps at right angles to the way to the current corner", () => {
    const chain = eulerChain(120, 7);
    for (let k = 1; k < chain.length; k++) {
      const [x, y] = chain[k - 1]!;
      const [u, v] = chain[k]!;
      expect(close(x * (u - x) + y * (v - y), 0)).toBe(true);
    }
  });

  it("closes in on the point at the angle as the steps grow in number", () => {
    for (const deg of [180, 90, -270, 360, 45]) {
      const target = fromPolar(1, deg);
      let before = Infinity;
      for (const n of [10, 100, 1000, 10000, 1000000]) {
        const p = power(eulerFactor(deg, n), n);
        const gap = Math.hypot(p[0] - target[0], p[1] - target[1]);
        expect(gap).toBeLessThan(before);
        before = gap;
      }
      expect(before).toBeLessThan(1e-4);
      expect(close(eulerTurn(deg, 1000000), deg, 1e-6)).toBe(true);
    }
    // The lesson's numbers for θ = π and n = 1,000.
    const p = power(eulerFactor(180, 1000), 1000);
    expect(close(p[0], -1.004946973864266, 1e-12)).toBe(true);
    expect(close(length(p), 1.0049469739179402, 1e-12)).toBe(true);
  });

  it("says each factor's length and turn, and where the product lands", () => {
    const [first, second] = eulerWords(180, 10);
    expect(first).toBe("θ = 180°, which is 3.142 radians. Each of the 10 factors, 1 + 0.314i, has length 1.0482 and turns by 17.44°, where 180° ÷ 10 is 18°.");
    expect(second).toBe(
      "Multiplied together, the 10 factors give −1.593 + 0.156i, at length 1.601, turned through 174.41° in all. The point at angle θ on the circle, cos θ + i sin θ, is −1.",
    );
    expect(eulerWords(90, 1)[0]).toContain("The one factor, 1 + 1.571i,");
    expect(eulerWords(90, 1)[1]).toContain("the factor gives 1 + 1.571i");
  });

  it("tabulates ever more steps and ends with the point at the angle", () => {
    const rows = eulerRows(180);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toEqual(["1", "1 + 3.1416i", "3.296908", "72.343°"]);
    expect(rows[5]).toEqual(["1,000", "−1.0049", "1.004947", "179.999°"]);
    expect(rows[7]![0]).toBe("1,000,000");
    expect(rows[8]).toEqual(["cos θ + i sin θ", "−1", "1", "180°"]);
  });
});
