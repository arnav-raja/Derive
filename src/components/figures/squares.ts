/*
 * Four copies of a triangle with a right angle, with shorter sides a and b, laid in a square of
 * side a + b in two ways: the arithmetic behind the FourTriangles figure. Laid one in each corner,
 * they leave a tilted square of side c uncovered in the middle; moved into two rectangles a by b,
 * they leave a square of side a and a square of side b. Either way they cover 2ab of the (a + b)^2,
 * so c^2 = a^2 + b^2.
 */

import type { Point } from "./rotation";
import { num } from "./rotation";

export type Arrangement = "tilted" | "rectangles";

/** The arrangements the figure offers, with the words on their buttons. */
export const ARRANGEMENTS: readonly { id: Arrangement; label: string }[] = [
  { id: "tilted", label: "One in each corner" },
  { id: "rectangles", label: "As two rectangles" },
];

/** The four triangles, each as its three corners, the right angle first. */
export function triangles(a: number, b: number, arrangement: Arrangement): Point[][] {
  const s = a + b;
  if (arrangement === "tilted") {
    return [
      [
        [0, 0],
        [a, 0],
        [0, b],
      ],
      [
        [s, 0],
        [s, a],
        [a, 0],
      ],
      [
        [s, s],
        [b, s],
        [s, a],
      ],
      [
        [0, s],
        [0, b],
        [b, s],
      ],
    ];
  }
  // Two rectangles a by b: one in the bottom right, b wide and a tall, and one in the top left, a wide and b tall, each cut by a diagonal.
  return [
    [
      [s, 0],
      [s, a],
      [a, 0],
    ],
    [
      [a, a],
      [a, 0],
      [s, a],
    ],
    [
      [0, a],
      [a, a],
      [0, s],
    ],
    [
      [a, s],
      [0, s],
      [a, a],
    ],
  ];
}

/** What the triangles leave uncovered: its corners, its name and its area. */
export function uncovered(a: number, b: number, arrangement: Arrangement): { points: Point[]; name: string; area: number }[] {
  const s = a + b;
  if (arrangement === "tilted") {
    return [
      {
        points: [
          [a, 0],
          [s, a],
          [b, s],
          [0, b],
        ],
        name: "middle",
        area: a * a + b * b,
      },
    ];
  }
  return [
    {
      points: [
        [0, 0],
        [a, 0],
        [a, a],
        [0, a],
      ],
      name: "a²",
      area: a * a,
    },
    {
      points: [
        [a, a],
        [s, a],
        [s, s],
        [a, s],
      ],
      name: "b²",
      area: b * b,
    },
  ];
}

/** The area of a polygon from its corners, by the shoelace formula. */
export function polygonArea(points: readonly Point[]): number {
  let twice = 0;
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length]!;
    twice += x1 * y2 - x2 * y1;
  });
  return Math.abs(twice) / 2;
}

/** The figure's sentence: the areas, and what is left uncovered. */
export function squareWords(a: number, b: number, arrangement: Arrangement): string {
  const s = a + b;
  const big = s * s;
  const covered = 2 * a * b;
  const left = big - covered;
  if (arrangement === "tilted") {
    return (
      `The big square has side ${num(a)} + ${num(b)} = ${num(s)} and area ${num(big)}. The four triangles cover ` +
      `4 × ½ × ${num(a)} × ${num(b)} = ${num(covered)} of it, so they leave ${num(big)} − ${num(covered)} = ` +
      `${num(left)} uncovered in the middle.`
    );
  }
  return (
    `The same four triangles, moved into two rectangles ${num(a)} by ${num(b)}, still cover ${num(covered)} of the ` +
    `${num(big)}. They leave two squares uncovered, of areas ${num(a)}² = ${num(a * a)} and ${num(b)}² = ` +
    `${num(b * b)}, which make ${num(left)}.`
  );
}
