/*
 * Models and prices for the tutor, kept in one place so a price or model
 * change is a one-line edit (the plan's "model names kept in configuration").
 * Prices are US dollars per million tokens.
 */

export const TUTOR_MODEL = "claude-opus-5-5";
export const GUARD_MODEL = "claude-haiku-5-5";
/** Judges the leak tests: a different call from the guard, at low effort. */
export const JUDGE_MODEL = TUTOR_MODEL;

type Price = { input: number; output: number; cacheRead: number; cacheWrite: number };

export const PRICES: Record<string, Price> = {
  // Cache writes cost 1.25 times the input price for the five-minute cache.
  [TUTOR_MODEL]: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  [GUARD_MODEL]: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
};

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

export const NO_USAGE: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

export function costUsd(model: string, usage: TokenUsage): number {
  const p = PRICES[model];
  if (!p) return 0;
  return (
    (usage.inputTokens * p.input +
      usage.outputTokens * p.output +
      usage.cacheReadTokens * p.cacheRead +
      usage.cacheWriteTokens * p.cacheWrite) /
    1_000_000
  );
}

/** Hints are capped at about 150 words. */
export const HINT_WORD_LIMIT = 150;
