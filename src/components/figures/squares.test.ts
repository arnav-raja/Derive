import { describe, expect, it } from "vitest";

import { polygonArea, squareWords, triangles, uncovered, type Arrangement } from "./squares";

const ARRANGEMENTS: Arrangement[] = ["tilted", "rectangles"];

describe("four triangles in a square", () => {
  it("lays four copies of the same triangle, each with a right angle at its first corner", () => {
    for (const arrangement of ARRANGEMENTS) {
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) {
          for (const t of triangles(a, b, arrangement)) {
            const [r, p, q] = t;
            const u = [p![0] - r![0], p![1] - r![1]];
            const v = [q![0] - r![0], q![1] - r![1]];
            expect(Math.abs(u[0]! * v[0]! + u[1]! * v[1]!)).toBe(0);
            const legs = [Math.hypot(u[0]!, u[1]!), Math.hypot(v[0]!, v[1]!)].sort((x, y) => x - y);
            expect(legs).toEqual([Math.min(a, b), Math.max(a, b)]);
            expect(polygonArea(t)).toBe((a * b) / 2);
          }
        }
      }
    }
  });

  it("leaves uncovered exactly what the big square holds beyond the triangles", () => {
    for (const arrangement of ARRANGEMENTS) {
      for (let a = 1; a <= 6; a += 1) {
        for (let b = 1; b <= 6; b += 1) {
          const gaps = uncovered(a, b, arrangement);
          const gapArea = gaps.reduce((t, g) => t + polygonArea(g.points), 0);
          expect(gapArea).toBe((a + b) ** 2 - 2 * a * b);
          expect(gapArea).toBe(a * a + b * b);
          for (const g of gaps) expect(polygonArea(g.points)).toBe(g.area);
        }
      }
    }
  });

  it("makes the middle shape a square of side c", () => {
    const [middle] = uncovered(3, 4, "tilted");
    const pts = middle!.points;
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % 4]!;
      expect(Math.hypot(q[0] - p[0], q[1] - p[1])).toBe(5);
    });
  });

  it("says the areas", () => {
    expect(squareWords(3, 4, "tilted")).toBe(
      "The big square has side 3 + 4 = 7 and area 49. The four triangles cover 4 × ½ × 3 × 4 = 24 of it, so they leave 49 − 24 = 25 uncovered in the middle.",
    );
    expect(squareWords(1, 2, "tilted")).toContain("they leave 9 − 4 = 5 uncovered in the middle.");
    expect(squareWords(3, 4, "rectangles")).toBe(
      "The same four triangles, moved into two rectangles 3 by 4, still cover 24 of the 49. They leave two squares uncovered, of areas 3² = 9 and 4² = 16, which make 25.",
    );
  });
});
