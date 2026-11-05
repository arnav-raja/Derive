/*
 * Exact facts about the numbers a computer calls floats. JavaScript's numbers
 * are the same 64-bit floats as Python's, so everything here is what Python
 * stores too: every float is a whole number times a power of two, and its
 * exact value can always be written out in full with BigInt arithmetic.
 */

const view = new DataView(new ArrayBuffer(8));

function bitsOf(x: number): bigint {
  view.setFloat64(0, x);
  return view.getBigUint64(0);
}

function fromBits(b: bigint): number {
  view.setBigUint64(0, b);
  return view.getFloat64(0);
}

/** A fraction with BigInt parts; the denominator is always positive. */
export type Ratio = { num: bigint; den: bigint };

function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x;
}

export function reduce(r: Ratio): Ratio {
  if (r.num === 0n) return { num: 0n, den: 1n };
  const g = gcd(r.num, r.den);
  const sign = r.den < 0n ? -1n : 1n;
  return { num: (sign * r.num) / g, den: (sign * r.den) / g };
}

export function subtract(a: Ratio, b: Ratio): Ratio {
  return reduce({ num: a.num * b.den - b.num * a.den, den: a.den * b.den });
}

export function add(a: Ratio, b: Ratio): Ratio {
  return reduce({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
}

export function divide(a: Ratio, b: Ratio): Ratio {
  return reduce({ num: a.num * b.den, den: a.den * b.num });
}

export function compare(a: Ratio, b: Ratio): number {
  const d = a.num * b.den - b.num * a.den;
  return d === 0n ? 0 : d < 0n ? -1 : 1;
}

/** A fraction as the nearest number, good to about 17 figures, for drawing and for short readouts. */
export function toNumber(r: Ratio): number {
  if (r.num === 0n) return 0;
  const negative = r.num < 0n;
  const n = negative ? -r.num : r.num;
  const scale = 20 - (n.toString().length - r.den.toString().length);
  const q = scale >= 0 ? (n * 10n ** BigInt(scale)) / r.den : n / (r.den * 10n ** BigInt(-scale));
  const v = Number(q) / 10 ** scale;
  return negative ? -v : v;
}

/** The exact value of a finite float, as a fraction whose denominator is a power of two. */
export function exactValue(x: number): Ratio {
  if (!Number.isFinite(x)) throw new Error("Only a finite float has an exact value.");
  const b = bitsOf(x);
  const negative = b >> 63n === 1n;
  const expBits = Number((b >> 52n) & 0x7ffn);
  const frac = b & ((1n << 52n) - 1n);
  const m = expBits === 0 ? frac : frac | (1n << 52n);
  const e = expBits === 0 ? -1074 : expBits - 1075;
  const num = negative ? -m : m;
  return reduce(e >= 0 ? { num: num << BigInt(e), den: 1n } : { num, den: 1n << BigInt(-e) });
}

/** The power of two in a denominator, or null when it is not a power of two. */
export function powerOfTwo(den: bigint): number | null {
  if (den <= 0n || (den & (den - 1n)) !== 0n) return null;
  return den.toString(2).length - 1;
}

/**
 * The full decimal expansion of a fraction whose denominator has no prime
 * factors but 2 and 5: every float's value, and every decimal a learner types.
 * Such an expansion always ends.
 */
export function exactDecimal(r: Ratio): string {
  let rest = r.den;
  let twos = 0;
  let fives = 0;
  while (rest % 2n === 0n) {
    rest /= 2n;
    twos++;
  }
  while (rest % 5n === 0n) {
    rest /= 5n;
    fives++;
  }
  if (rest !== 1n) throw new Error("Only a fraction over a product of 2s and 5s has an ending decimal.");
  const k = Math.max(twos, fives);
  const negative = r.num < 0n;
  const n = negative ? -r.num : r.num;
  // n / den = n * (10^k / den) / 10^k.
  const digits = (n * (10n ** BigInt(k) / r.den)).toString().padStart(k + 1, "0");
  const whole = digits.slice(0, digits.length - k);
  const fraction = digits.slice(digits.length - k).replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${fraction ? `.${fraction}` : ""}`;
}

/** The next float up, towards plus infinity. */
export function nextUp(x: number): number {
  if (Number.isNaN(x) || x === Infinity) return x;
  if (x === 0) return Number.MIN_VALUE;
  const b = bitsOf(x);
  return fromBits(x > 0 ? b + 1n : b - 1n);
}

/** The next float down, towards minus infinity. */
export function nextDown(x: number): number {
  return -nextUp(-x);
}

/**
 * A number typed as a Python float literal, such as 0.1, -2.5e-3 or 1e16, read
 * exactly as the decimal it names. Returns null for anything else.
 */
export function parseLiteral(text: string): Ratio | null {
  const m = /^\s*([+-]?)(\d+(?:_\d+)*)?(?:\.(\d+(?:_\d+)*)?)?(?:[eE]([+-]?\d+))?\s*$/.exec(text);
  if (!m || (m[2] === undefined && m[3] === undefined)) return null;
  const whole = (m[2] ?? "").replaceAll("_", "");
  const frac = (m[3] ?? "").replaceAll("_", "");
  const exp = Number(m[4] ?? 0) - frac.length;
  if (Math.abs(exp) > 400) return null;
  let num = BigInt(`${whole}${frac}` || "0");
  if (m[1] === "-") num = -num;
  return reduce(exp >= 0 ? { num: num * 10n ** BigInt(exp), den: 1n } : { num, den: 10n ** BigInt(-exp) });
}

/**
 * The shortest decimal digits that lead back to a float, and the power of ten
 * of the first digit: 0.1 is { digits: "1", exp: -1 }. JavaScript's own
 * number-to-text rule picks, like Python's, the shortest such digits closest
 * to the float's exact value.
 */
function shortestDigits(x: number): { digits: string; exp: number } {
  const s = String(Math.abs(x));
  if (s.includes("e")) {
    const [m = "", e = "0"] = s.split("e");
    return { digits: m.replace(".", ""), exp: Number(e) };
  }
  const [whole = "", fraction = ""] = s.split(".");
  if (whole !== "0") return { digits: `${whole}${fraction}`.replace(/0+$/, ""), exp: whole.length - 1 };
  const zeros = /^0*/.exec(fraction)![0].length;
  return { digits: fraction.slice(zeros), exp: -(zeros + 1) };
}

/** What Python's print or repr shows for a float: the shortest decimal that leads back to it. */
export function pythonRepr(x: number): string {
  if (Number.isNaN(x)) return "nan";
  if (!Number.isFinite(x)) return x > 0 ? "inf" : "-inf";
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const sign = x < 0 ? "-" : "";
  const { digits, exp } = shortestDigits(x);
  // Python writes a power of ten when the first digit is at 10^16 or above, or at 10^-5 or below.
  if (exp < -4 || exp >= 16) {
    const lead = digits.length > 1 ? `${digits[0]}.${digits.slice(1)}` : digits;
    return `${sign}${lead}e${exp < 0 ? "-" : "+"}${String(Math.abs(exp)).padStart(2, "0")}`;
  }
  if (exp < 0) return `${sign}0.${"0".repeat(-exp - 1)}${digits}`;
  const whole = digits.slice(0, exp + 1).padEnd(exp + 1, "0");
  const rest = digits.slice(exp + 1);
  return `${sign}${whole}.${rest || "0"}`;
}

const THIN = " ";

/**
 * A long decimal grouped for reading: commas in the whole part, as elsewhere in
 * Derive, and thin spaces between threes after the point.
 */
export function groupDecimal(text: string): string {
  const [whole = "", fraction] = text.split(".");
  const sign = whole.startsWith("-") ? "−" : "";
  const w = whole.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (!fraction) return `${sign}${w}`;
  return `${sign}${w}.${fraction.replace(/(\d{3})(?=\d)/g, `$1${THIN}`)}`;
}
