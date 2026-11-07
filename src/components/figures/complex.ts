/*
 * Complex numbers for the ComplexPlane and EulerSteps figures. The number a + bi is the point
 * (a, b), as in the lesson, and every product is made by the lesson's rule: multiply out, and put
 * -1 for i². The figures make each product that way and only then measure its length and angle, so
 * what they say about lengths multiplying and angles adding is seen, not assumed.
 */

import { clean, num, radians, type Point } from "./rotation";

/** a + bi as the point (a, b): the real part first, then the imaginary part. */
export type Complex = Point;

const SUPERSCRIPT = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** A whole number raised, for the figure's labels drawn on the picture: 8 as ⁸ in z⁸, 24 as ²⁴. */
export function raised(n: number): string {
  return String(n)
    .split("")
    .map((d) => SUPERSCRIPT[Number(d)])
    .join("");
}

export function add([a, b]: Complex, [c, d]: Complex): Complex {
  return [a + c, b + d];
}

/** (a + bi)(c + di) multiplied out, with -1 for i²: (ac - bd) + (ad + bc)i. */
export function mul([a, b]: Complex, [c, d]: Complex): Complex {
  return [a * c - b * d, a * d + b * c];
}

/** The distance of a + bi from 0, the square root of a² + b², which Python's abs gives. */
export function length([a, b]: Complex): number {
  return Math.hypot(a, b);
}

/** The angle of a + bi in degrees, from just above -180 to 180, as cmath.phase gives it in radians. */
export function angleOf([a, b]: Complex): number {
  const deg = (Math.atan2(clean(b), clean(a)) * 180) / Math.PI;
  return deg === -180 ? 180 : clean(deg);
}

/** The number with length r and angle deg degrees: r(cos θ + i sin θ). */
export function fromPolar(r: number, deg: number): Complex {
  const t = radians(deg);
  return [clean(r * Math.cos(t)), clean(r * Math.sin(t))];
}

/** An angle in degrees moved by whole turns to the range from just above -180 to 180. */
export function wrap(deg: number): number {
  const d = (((deg % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : clean(d);
}

/** 1, z, z², …, z^n, each made from the one before by one more multiplication. */
export function powers(z: Complex, n: number): Complex[] {
  const out: Complex[] = [[1, 0]];
  for (let k = 1; k <= n; k++) out.push(mul(out[k - 1]!, z));
  return out;
}

/** z^n by repeated squaring, still one multiplication at a time, for n in the millions. */
export function power(z: Complex, n: number): Complex {
  let result: Complex = [1, 0];
  let base = z;
  let k = n;
  while (k > 0) {
    if (k % 2 === 1) result = mul(result, base);
    base = mul(base, base);
    k = Math.floor(k / 2);
  }
  return result;
}

/** a + bi as the lesson writes it: 0.725 + 2.705i, 3 − 2i, 2i, −i, −4. */
export function complexText([a, b]: Complex, decimals = 3): string {
  const re = num(a, decimals);
  const im = num(Math.abs(b), decimals);
  if (im === "0") return re;
  const imPart = im === "1" ? "i" : `${im}i`;
  if (re === "0") return b < 0 ? `−${imPart}` : imPart;
  return `${re} ${b < 0 ? "−" : "+"} ${imPart}`;
}

/** An angle in degrees as a figure says it: 75°, −165°, 17.44°. */
export function degText(deg: number, decimals = 1): string {
  return `${num(deg, decimals)}°`;
}

/** Two angles added, as words: 45° + 30°, or 45° − 30° when the second is negative. */
function sumText(a: number, b: number): string {
  return b < 0 ? `${degText(a)} − ${degText(-b)}` : `${degText(a)} + ${degText(b)}`;
}

/** The ComplexPlane figure's sentences for the product of z and w, each given by length and angle. */
export function productWords(zr: number, zd: number, wr: number, wd: number): string[] {
  const z = fromPolar(zr, zd);
  const w = fromPolar(wr, wd);
  const p = mul(z, w);
  const sum = zd + wd;
  const measured = angleOf(p);
  const angle =
    wrap(sum) === sum
      ? `its angle is ${degText(measured)}, the same as ${sumText(zd, wd)}`
      : `its angle is ${degText(measured)}, which points the same way as ${sumText(zd, wd)} = ${degText(sum)}, a whole turn of 360° away`;
  return [
    `z has length ${num(zr, 3)} and angle ${degText(zd)}, so z = ${complexText(z)}; w has length ${num(wr, 3)} and angle ${degText(wd)}, so w = ${complexText(w)}.`,
    `Multiplied out, zw = ${complexText(p)}. Its length is ${num(length(p), 3)}, the same as ${num(zr, 3)} × ${num(wr, 3)}, and ${angle}.`,
  ];
}

/** The ComplexPlane figure's sentences for the powers of z, up to z^n, which FigureLabel draws raised. */
export function powersWords(r: number, deg: number, n: number): string[] {
  const z = fromPolar(r, deg);
  const last = powers(z, n)[n]!;
  const total = n * deg;
  const measured = angleOf(last);
  const turn =
    wrap(total) === clean(total)
      ? `${n} × ${degText(deg)} = ${degText(total)}`
      : `${n} × ${degText(deg)} = ${degText(total)}, which points the same way as ${degText(measured)}`;
  const lines = [
    `z = ${complexText(z)}, with length ${num(r, 3)} and angle ${degText(deg)}.`,
    `Multiplying out ${n} ${n === 1 ? "copy" : "copies"} of z gives z^${n} = ${complexText(last)}, with length ${num(length(last), 3)} and angle ${degText(measured)}. That length is ${num(r, 3)}^${n} = ${num(r ** n, 3)}, and ${turn}.`,
  ];
  if (n > 1 && Math.abs(last[0] - 1) < 1e-9 && Math.abs(last[1]) < 1e-9) lines.push(`So z^${n} = 1.`);
  return lines;
}

/** One of the n factors of the EulerSteps figure: 1 + iθ/n, with θ in radians. */
export function eulerFactor(deg: number, n: number): Complex {
  return [1, radians(deg) / n];
}

/** 1, (1 + iθ/n), (1 + iθ/n)², …, (1 + iθ/n)^n: the corners of the figure's chain of steps. */
export function eulerChain(deg: number, n: number): Complex[] {
  return powers(eulerFactor(deg, n), n);
}

/** How far the n factors turn in all, in degrees: n times the angle of one, which may pass 180°. */
export function eulerTurn(deg: number, n: number): number {
  return (n * Math.atan(radians(deg) / n) * 180) / Math.PI;
}

/** The EulerSteps figure's sentences for the angle deg, in degrees, and n steps. */
export function eulerWords(deg: number, n: number): string[] {
  const f = eulerFactor(deg, n);
  const p = eulerChain(deg, n)[n]!;
  const one = n === 1 ? "The one factor" : `Each of the ${num(n, 0)} factors`;
  return [
    `θ = ${degText(deg, 0)}, which is ${num(radians(deg))} radians. ${one}, ${complexText(f)}, has length ${num(length(f), 4)} and turns by ${degText(angleOf(f), 2)}, where ${degText(deg, 0)} ÷ ${num(n, 0)} is ${degText(deg / n, 2)}.`,
    `Multiplied together, the ${n === 1 ? "factor gives" : `${num(n, 0)} factors give`} ${complexText(p)}, at length ${num(length(p), 4)}, turned through ${degText(eulerTurn(deg, n), 2)} in all. The point at angle θ on the circle, cos θ + i sin θ, is ${complexText(fromPolar(1, deg))}.`,
  ];
}

/** The rows of the EulerSteps figure's table: (1 + iθ/n)^n for ever more steps, then the point at θ. */
export function eulerRows(deg: number): string[][] {
  const rows = [1, 2, 4, 10, 100, 1000, 10000, 1000000].map((n) => {
    const p = power(eulerFactor(deg, n), n);
    return [num(n, 0), complexText(p, 4), num(length(p), 6), degText(eulerTurn(deg, n), 3)];
  });
  rows.push(["cos θ + i sin θ", complexText(fromPolar(1, deg), 4), "1", degText(deg, 0)]);
  return rows;
}
