import { describe, expect, it } from "vitest";

import { arcPoints, clean, listWords, num, pathPoints, piText, placeWords, pointAt, pointText, radians, turn, turnWords, unitCircleWords } from "./rotation";

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const same = (p: readonly number[], q: readonly number[]) => close(p[0]!, q[0]!) && close(p[1]!, q[1]!);

describe("pointAt", () => {
  it("gives the lesson's exact values", () => {
    expect(pointAt(0)).toEqual([1, 0]);
    expect(pointAt(90)).toEqual([0, 1]);
    expect(pointAt(180)).toEqual([-1, 0]);
    expect(pointAt(-90)).toEqual([0, -1]);
    // Rounding's leftovers are cleaned to a plain 0, never a negative zero.
    expect(Object.is(pointAt(-180)[1], 0)).toBe(true);
    const [c30, s30] = pointAt(30);
    expect(close(c30, Math.sqrt(3) / 2) && close(s30, 0.5)).toBe(true);
    const [c45, s45] = pointAt(45);
    expect(close(c45, 1 / Math.SQRT2) && close(s45, 1 / Math.SQRT2)).toBe(true);
    const [c150, s150] = pointAt(150);
    expect(close(c150, -Math.sqrt(3) / 2) && close(s150, 0.5)).toBe(true);
  });

  it("is always at distance 1 from the centre, and repeats every whole turn", () => {
    for (let d = -360; d <= 360; d += 7) {
      const [c, s] = pointAt(d);
      expect(close(c * c + s * s, 1)).toBe(true);
      const [c2, s2] = pointAt(d + 360);
      expect(close(c, c2) && close(s, s2)).toBe(true);
    }
  });
});

describe("turn", () => {
  it("follows the lesson's examples", () => {
    expect(same(turn([3, 1], 90), [-1, 3])).toBe(true);
    expect(turn([1, 0], 90)).toEqual([0, 1]);
    expect(same(turn([2, -5], 180), [-2, 5])).toBe(true);
    expect(same(turn([0, 2], -90), [2, 0])).toBe(true);
    const [u, v] = turn([0, 1], 30);
    expect(close(u, -0.5) && close(v, Math.sqrt(3) / 2)).toBe(true);
  });

  it("keeps distances, adds angles, and takes (1, 0) to the point at the angle", () => {
    for (const d of [-170, -45, 13, 30, 75, 120, 199]) {
      for (const p of [
        [3, 1],
        [-2, 5],
        [0.5, -0.25],
      ] as const) {
        const q = turn(p, d);
        expect(close(Math.hypot(...q), Math.hypot(...p))).toBe(true);
        const twice = turn(turn(p, d), 40);
        const once = turn(p, d + 40);
        expect(close(twice[0], once[0]) && close(twice[1], once[1])).toBe(true);
      }
      const [c, s] = turn([1, 0], d);
      const [pc, ps] = pointAt(d);
      expect(close(c, pc) && close(s, ps)).toBe(true);
    }
  });
});

describe("numbers in words", () => {
  it("rounds, groups, uses a true minus sign, and says rounding's leftovers as 0", () => {
    expect(num(-0.8660254)).toBe("−0.866");
    expect(num(0.5)).toBe("0.5");
    expect(num(6.123e-17)).toBe("0");
    expect(num(-1e-20)).toBe("0");
    expect(num(2.0984)).toBe("2.098");
    expect(num(12345.6, 0)).toBe("12,346");
    expect(clean(-3e-17)).toBe(0);
    expect(pointText([-0.5, 0.8660254])).toBe("(−0.5, 0.866)");
  });

  it("writes whole degrees as multiples of pi", () => {
    expect(piText(30)).toBe("π/6");
    expect(piText(150)).toBe("5π/6");
    expect(piText(180)).toBe("π");
    expect(piText(-180)).toBe("−π");
    expect(piText(360)).toBe("2π");
    expect(piText(-45)).toBe("−π/4");
    expect(piText(0)).toBe("0");
    expect(close(radians(57.29577951308232), 1)).toBe(true);
  });

  it("joins a list with commas and a final and", () => {
    expect(listWords(["A"])).toBe("A");
    expect(listWords(["A", "B"])).toBe("A and B");
    expect(listWords(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("arcs", () => {
  it("runs from (1, 0) to the point at the angle, along the circle", () => {
    for (const d of [-360, -30, 1, 150, 359]) {
      const pts = arcPoints(d);
      expect(same(pts[0]!, [1, 0])).toBe(true);
      const last = pts[pts.length - 1]!;
      const [c, s] = pointAt(d);
      expect(close(last[0], c) && close(last[1], s)).toBe(true);
      for (const p of pts) expect(close(Math.hypot(...p), 1)).toBe(true);
    }
  });

  it("follows a point round its own circle", () => {
    const pts = pathPoints([3, 1], 75);
    expect(same(pts[0]!, [3, 1])).toBe(true);
    const last = pts[pts.length - 1]!;
    const want = turn([3, 1], 75);
    expect(close(last[0], want[0]) && close(last[1], want[1])).toBe(true);
    for (const p of pts) expect(close(Math.hypot(...p), Math.hypot(3, 1))).toBe(true);
  });
});

describe("sentences", () => {
  it("says the signs of the coordinates in each quarter and on the axes", () => {
    expect(placeWords(pointAt(150))).toBe("It is left of the second axis and above the first, so its cosine is negative and its sine positive.");
    expect(placeWords(pointAt(30))).toContain("both its cosine and its sine are positive");
    expect(placeWords(pointAt(225))).toContain("both its cosine and its sine are negative");
    expect(placeWords(pointAt(-30))).toContain("its cosine is positive and its sine negative");
    expect(placeWords(pointAt(180))).toBe("It is on the first axis, left of the origin, so its sine is 0.");
    expect(placeWords(pointAt(-90))).toBe("It is on the second axis, below the origin, so its cosine is 0.");
  });

  it("describes the point at an angle", () => {
    expect(unitCircleWords(150)).toBe(
      "An angle of 150° is 2.618 radians, so the arc from (1, 0) to the point, going anticlockwise, is 2.618 long. " +
        "The point is (−0.866, 0.5), so cos 150° = −0.866 and sin 150° = 0.5. " +
        "It is left of the second axis and above the first, so its cosine is negative and its sine positive.",
    );
    expect(unitCircleWords(-30)).toContain("is −0.524 radians, so the arc from (1, 0) to the point, going clockwise, is 0.524 long");
    expect(unitCircleWords(-300)).toContain("so cos(−300°) = 0.5 and sin(−300°) = 0.866.");
    expect(unitCircleWords(0)).toBe("An angle of 0° is 0 radians, so the point has not moved from (1, 0): cos 0° = 1 and sin 0° = 0.");
  });

  it("describes one turn and then a second", () => {
    const points = [
      { label: "(1, 0)", at: [1, 0] as const },
      { label: "(0, 1)", at: [0, 1] as const },
      { label: "(3, 1)", at: [3, 1] as const },
    ];
    expect(turnWords(points, 90)).toEqual(["Turning by 90° takes (1, 0) to (0, 1), (0, 1) to (−1, 0) and (3, 1) to (−1, 3)."]);
    const two = turnWords(points, 30, 60);
    expect(two[1]).toBe("Then turning by a further 60° takes them on to (0, 1), (−1, 0) and (−1, 3), the same points that one turn by 90° gives.");
    expect(turnWords(points, 30, 0)[1]).toBe("The second turn is 0°, so they stay there: one turn by 30° in all.");
  });
});
