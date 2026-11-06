/*
 * Marking an answer at a program trace's stop against the value Python shows.
 */

/** Text with its spaces taken out and its quotes made single, as Python's repr writes them. */
export function normalise(s: string): string {
  return s.replace(/\s+/g, "").replace(/"/g, "'");
}

/** A number as the learner or Python wrote it, and whether it was written as a whole number (an int). */
function readNumber(s: string): { whole: bigint } | { real: number } | null {
  const t = s.trim().replace(/_/g, "");
  if (/^[+-]?\d+$/.test(t)) return { whole: BigInt(t) };
  if (/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t)) return { real: Number(t) };
  const f = /^([+-]?\d+)\s*\/\s*(\d+)$/.exec(t);
  if (f && Number(f[2]) !== 0) return { real: Number(f[1]) / Number(f[2]) };
  return null;
}

/**
 * Whether an answer at a stop matches the value Python shows: the same text, or the same number
 * written another way (.125 or 1/8 for 0.125). An int and a float never match, since 6 and 6.0
 * are different values in Python.
 */
export function sameAnswer(said: string, actual: string): boolean {
  if (normalise(said) === normalise(actual)) return true;
  const a = readNumber(said);
  const b = readNumber(actual);
  if (!a || !b) return false;
  if ("whole" in a && "whole" in b) return a.whole === b.whole;
  if ("real" in a && "real" in b) return a.real === b.real;
  return false;
}
