/*
 * Turning about the origin: the arithmetic behind the UnitCircle and VectorPlane figures. Angles
 * arrive in degrees, as the figures' sliders give them, and become radians here, as the lesson says
 * Python's math.cos and math.sin need. The point at an angle is (cos, sin), and turning (x, y)
 * through an angle gives (x cos - y sin, x sin + y cos), the lesson's rule.
 */

export type Point = readonly [number, number];

export function radians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Rounding leaves cos 90° as about 6 × 10^-17; anything that small is drawn and said as 0. */
export function clean(v: number): number {
  return Math.abs(v) < 1e-12 ? 0 : v;
}

/** The point reached by turning anticlockwise from (1, 0) through `deg` degrees on the circle of radius 1. */
export function pointAt(deg: number): Point {
  const t = radians(deg);
  return [clean(Math.cos(t)), clean(Math.sin(t))];
}

/** The point `p` turned anticlockwise about the origin through `deg` degrees. */
export function turn(p: Point, deg: number): Point {
  const t = radians(deg);
  const c = Math.cos(t);
  const s = Math.sin(t);
  return [clean(p[0] * c - p[1] * s), clean(p[0] * s + p[1] * c)];
}

/** A number as a figure says it: rounded to `decimals` places at most, digits grouped, with a true minus sign. */
export function num(v: number, decimals = 3): string {
  const scale = 10 ** decimals;
  const r = Math.round(clean(v) * scale) / scale;
  if (r === 0) return "0";
  const text = Math.abs(r).toLocaleString("en-GB", { maximumFractionDigits: decimals });
  return r < 0 ? `−${text}` : text;
}

export function pointText(p: Point, decimals = 3): string {
  return `(${num(p[0], decimals)}, ${num(p[1], decimals)})`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A whole number of degrees as a multiple of π: 150 gives 5π/6, and −180 gives −π. */
export function piText(deg: number): string {
  if (!Number.isInteger(deg)) return "";
  if (deg === 0) return "0";
  const g = gcd(Math.abs(deg), 180);
  const top = deg / g;
  const bottom = 180 / g;
  const times = top === 1 ? "π" : top === -1 ? "−π" : `${num(top, 0)}π`;
  return bottom === 1 ? times : `${times}/${bottom}`;
}

/** Points along the arc of radius `r` from angle 0 to `deg`, at most a degree apart, for drawing. */
export function arcPoints(deg: number, r = 1): Point[] {
  const steps = Math.max(1, Math.ceil(Math.abs(deg)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = radians((deg * i) / steps);
    return [clean(r * Math.cos(t)), clean(r * Math.sin(t))] as const;
  });
}

/** Points along the circle about the origin from `from` round to its turn through `deg` degrees. */
export function pathPoints(from: Point, deg: number): Point[] {
  const steps = Math.max(1, Math.ceil(Math.abs(deg)));
  return Array.from({ length: steps + 1 }, (_, i) => turn(from, (deg * i) / steps));
}

/** Where the point at an angle lies, and so the signs of its cosine and sine. */
export function placeWords(p: Point): string {
  const [x, y] = [clean(p[0]), clean(p[1])];
  if (y === 0) return `It is on the first axis, ${x > 0 ? "right" : "left"} of the origin, so its sine is 0.`;
  if (x === 0) return `It is on the second axis, ${y > 0 ? "above" : "below"} the origin, so its cosine is 0.`;
  const side = x > 0 ? "right of the second axis" : "left of the second axis";
  const level = y > 0 ? "above the first" : "below the first";
  const signs =
    x > 0 && y > 0
      ? "both its cosine and its sine are positive"
      : x < 0 && y < 0
        ? "both its cosine and its sine are negative"
        : `its cosine is ${x > 0 ? "positive" : "negative"} and its sine ${y > 0 ? "positive" : "negative"}`;
  return `It is ${side} and ${level}, so ${signs}.`;
}

/** The UnitCircle figure's sentence for an angle of `deg` degrees. */
export function unitCircleWords(deg: number): string {
  const p = pointAt(deg);
  const d = num(deg, 0);
  // A negative angle is bracketed, cos(−300°), so that the minus is not read as a subtraction.
  const arg = deg < 0 ? `(${d}°)` : ` ${d}°`;
  const values = `cos${arg} = ${num(p[0])} and sin${arg} = ${num(p[1])}`;
  if (deg === 0) return `An angle of 0° is 0 radians, so the point has not moved from (1, 0): ${values}.`;
  const way = deg > 0 ? "anticlockwise" : "clockwise";
  return (
    `An angle of ${d}° is ${num(radians(deg))} radians, so the arc from (1, 0) to the point, going ${way}, ` +
    `is ${num(Math.abs(radians(deg)))} long. The point is ${pointText(p)}, so ${values}. ${placeWords(p)}`
  );
}

/** "A, B and C". */
export function listWords(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The VectorPlane figure's sentences: where a first turn, and then a second, take each point. */
export function turnWords(points: readonly { label: string; at: Point }[], first: number, second?: number): string[] {
  const once = points.map(({ label, at }) => `${label} to ${pointText(turn(at, first))}`);
  const lines = [`Turning by ${num(first, 0)}° takes ${listWords(once)}.`];
  if (second !== undefined) {
    const total = first + second;
    if (second === 0) {
      lines.push(`The second turn is 0°, so they stay there: one turn by ${num(total, 0)}° in all.`);
    } else {
      const twice = points.map(({ at }) => pointText(turn(turn(at, first), second)));
      lines.push(
        `Then turning by a further ${num(second, 0)}° takes them on to ${listWords(twice)}, ` +
          `the same points that one turn by ${num(total, 0)}° gives.`,
      );
    }
  }
  return lines;
}
