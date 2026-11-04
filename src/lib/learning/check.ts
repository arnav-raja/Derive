import type { Answer } from "@/lib/content/exercise-schema";

/*
 * Checks for answers whose key lives only on the server: choices, numbers and
 * justified steps. Code, break-it and expression answers are checked in the
 * browser by the Python harness, against public tests and fingerprints.
 */

export type ServerCheck = { correct: boolean; detail?: Record<string, unknown> };

export function checkChoice(answer: Extract<Answer, { type: "choice" }>, selected: string[]): ServerCheck {
  const want = [...answer.correct].sort();
  const got = [...new Set(selected)].sort();
  return { correct: want.length === got.length && want.every((v, i) => v === got[i]) };
}

export function checkNumber(answer: Extract<Answer, { type: "number" }>, value: number): ServerCheck {
  if (!Number.isFinite(value)) return { correct: false };
  const target = answer.value;
  const t = answer.tolerance;
  let correct: boolean;
  if ("abs" in t) correct = Math.abs(value - target) <= t.abs;
  else if ("rel" in t) correct = Math.abs(value - target) <= t.rel * Math.max(Math.abs(target), Number.EPSILON);
  else correct = target > 0 && value > 0 && value >= target / t.factor && value <= target * t.factor;
  // How far off, as a factor, for estimates: shown after the answer.
  const ratio = target !== 0 && value !== 0 && Math.sign(target) === Math.sign(value) ? value / target : null;
  return { correct, detail: ratio === null ? undefined : { ratio } };
}

export function checkSteps(answer: Extract<Answer, { type: "steps" }>, rules: string[]): ServerCheck {
  const wrongLines = answer.lines.flatMap((line, i) => (rules[i] === line.rule ? [] : [i]));
  return { correct: wrongLines.length === 0, detail: { wrongLines } };
}

/**
 * Reads a number the way people write it: 3e23, 3 × 10^23, 3*10**23,
 * 3,00,000 or 300 000. Returns NaN when it cannot be read.
 */
export function parseNumber(text: string): number {
  const s = text
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/[,\s_]/g, "")
    .replace(/×|\*|x(?=10)/gi, "*");
  if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(s)) return Number(s);
  const power = /^([-+]?(?:\d+\.?\d*|\.\d+))\*10(?:\^|\*\*)\(?([-+]?\d+)\)?$/.exec(s);
  // Built as "3e23" so the result is correctly rounded (3 * 10 ** 23 is not).
  if (power) return Number(`${power[1]}e${power[2]}`);
  const bare = /^10(?:\^|\*\*)\(?([-+]?\d+)\)?$/.exec(s);
  if (bare) return Number(`1e${bare[1]}`);
  const fraction = /^([-+]?\d+)\/(\d+)$/.exec(s);
  if (fraction && Number(fraction[2]) !== 0) return Number(fraction[1]) / Number(fraction[2]);
  return Number.NaN;
}
