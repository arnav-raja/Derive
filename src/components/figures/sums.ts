/*
 * The readouts of the PartialSums figure, worked out exactly. Its ratios are
 * whole numbers of hundredths, k / 100, so the sum of the first n terms,
 * 1 + r + ... + r^(n-1) = (1 - r^n) / (1 - r), is the fraction
 * (100^n - k^n) / (100^(n-1) (100 - k)), and BigInt arithmetic gives its digits
 * exactly. A sum is cut off after four decimal places, never rounded up, so a
 * sum that falls short of where it is heading never reads as that number.
 */

const PLACES = 10_000n;

function hundredths(r: number): bigint {
  return BigInt(Math.round(r * 100));
}

/** num / den cut off after four decimal places, with … when more digits follow. */
function decimalDown(num: bigint, den: bigint): string {
  const scaled = num * PLACES;
  const text = String(Number(scaled / den) / Number(PLACES));
  return scaled % den === 0n ? text : `${text}…`;
}

/** The sum of the first n terms, for a ratio between 0.01 and 0.99. */
export function sumText(r: number, n: number): string {
  const k = hundredths(r);
  const N = BigInt(n);
  return decimalDown(100n ** N - k ** N, 100n ** (N - 1n) * (100n - k));
}

/** Where the sums are heading, 1 / (1 - r), cut off in the same way. */
export function limitText(r: number): string {
  return decimalDown(100n, 100n - hundredths(r));
}

/** How far short of 1 / (1 - r) the sum of the first n terms falls, r^n / (1 - r), to two significant figures. */
export function shortText(r: number, n: number): string {
  const short = r ** n / (1 - r);
  if (short >= 1e-4) return String(Number(short.toPrecision(2)));
  const [mantissa = "", exponent = ""] = short.toExponential(1).split("e");
  return `${mantissa} × 10^{${exponent.replace("-", "−")}}`;
}
