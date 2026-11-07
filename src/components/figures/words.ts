/*
 * The counts behind E1.12's figures, worked out in the browser from the text of Alice's Adventures
 * in Wonderland with the lesson's own tokeniser: the text in lower case, cut into runs of letters,
 * marks and digits, with an apostrophe kept only between two of them. The words are ranked most
 * common first, with ties in alphabetical order, and a table counts which word follows which.
 */

import { withBase } from "@/lib/public-config";

import { generator, group } from "./ties";

export { generator, group };

const WORD_CHAR = /^[\p{L}\p{M}\p{N}]$/u;

/** True when ch is a letter, a mark or a digit, in any script: its Unicode category begins with L, M or N. */
export function inWord(ch: string): boolean {
  return WORD_CHAR.test(ch);
}

/** The words of text, in lower case: its runs of letters, marks and digits, with an apostrophe kept only between two of them. */
export function tokens(text: string): string[] {
  const chars = Array.from(text.toLowerCase());
  const words: string[] = [];
  let word = "";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const inner = ch === "'" && word !== "" && i + 1 < chars.length && inWord(chars[i + 1]!);
    if (inWord(ch) || inner) {
      word += ch;
    } else {
      if (word !== "") words.push(word);
      word = "";
    }
  }
  if (word !== "") words.push(word);
  return words;
}

export type Counted = { word: string; count: number };

/** Strings in code-point order, as Python compares them. */
function byCodePoint(a: string, b: string): number {
  const x = Array.from(a);
  const y = Array.from(b);
  for (let i = 0; i < Math.min(x.length, y.length); i++) {
    const d = x[i]!.codePointAt(0)! - y[i]!.codePointAt(0)!;
    if (d !== 0) return d;
  }
  return x.length - y.length;
}

/**
 * Larger counts first, and equal counts in code-point order, as the lesson's `by_count` sorts them:
 * alphabetical order for words of small letters, with an apostrophe before every letter.
 */
export function byCount(a: Counted, b: Counted): number {
  return b.count - a.count || byCodePoint(a.word, b.word);
}

/** Each different word with its count, most common first. */
export function rankByCount(words: readonly string[]): Counted[] {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts].map(([word, count]) => ({ word, count })).sort(byCount);
}

/** follows.get(a).get(b) is how many times the word b comes straight after the word a. */
export type Follows = Map<string, Map<string, number>>;

export function nextCounts(words: readonly string[]): Follows {
  const follows: Follows = new Map();
  for (let i = 0; i + 1 < words.length; i++) {
    const a = words[i]!;
    const b = words[i + 1]!;
    let row = follows.get(a);
    if (!row) {
      row = new Map();
      follows.set(a, row);
    }
    row.set(b, (row.get(b) ?? 0) + 1);
  }
  return follows;
}

/** The words that follow word, with their counts, most common first; empty when nothing follows it. */
export function followers(follows: Follows, word: string): Counted[] {
  const row = follows.get(word);
  if (!row) return [];
  return [...row].map(([w, count]) => ({ word: w, count })).sort(byCount);
}

/** The word that most often follows word, ties going to the word first in code-point order, or null. */
export function mostLikely(follows: Follows, word: string): string | null {
  return followers(follows, word)[0]?.word ?? null;
}

/**
 * A word drawn at random after word, each with a chance in proportion to its count, for a number u
 * from 0 up to 1; null when nothing follows word.
 */
export function drawNext(follows: Follows, word: string, u: number): string | null {
  const list = followers(follows, word);
  const total = list.reduce((s, x) => s + x.count, 0);
  if (total === 0) return null;
  let left = Math.min(Math.max(u, 0), 1 - Number.EPSILON) * total;
  for (const x of list) {
    if (left < x.count) return x.word;
    left -= x.count;
  }
  return list.at(-1)!.word;
}

export type Book = {
  /** The book's words, in order. */
  words: string[];
  /** Each different word with its count, most common first. */
  ranked: Counted[];
  /** before[r] is how many of the book's words are the words of ranks 1 to r. */
  before: number[];
  follows: Follows;
};

export function readBook(text: string): Book {
  const words = tokens(text);
  const ranked = rankByCount(words);
  const before = [0];
  for (const x of ranked) before.push(before.at(-1)! + x.count);
  return { words, ranked, before, follows: nextCounts(words) };
}

/** Where the figures find the book: the text as the lesson's counts read it, under the site's base path. */
export const BOOK_PATH = withBase("/texts/alice.txt");

let pending: Promise<Book> | null = null;

/** The book, read once for every figure on the page. A failed read is tried again the next time it is asked for. */
export function loadBook(): Promise<Book> {
  pending ??= fetch(BOOK_PATH)
    .then((r) => {
      if (!r.ok) throw new Error(`The book could not be read (${r.status}).`);
      return r.text();
    })
    .then(readBook)
    .catch((e: unknown) => {
      pending = null;
      throw e;
    });
  return pending;
}

/** A word in the figures' sentences, in curly quotation marks. */
export const quoted = (w: string) => `“${w}”`;

/** How many times, in words for one and two: "once", "twice", "3 times". */
export const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${group(n)} times`);

/** A share as a percentage: one decimal place below 10%, whole numbers above. */
export function percent(part: number, whole: number): string {
  const p = (100 * part) / whole;
  return `${p < 10 ? p.toFixed(1) : Math.round(p)}%`;
}

/** The first and last ranks, counted from 1, of the words that share the count of the word at rank. */
export function runOf(ranked: readonly Counted[], rank: number): { first: number; last: number } {
  const count = ranked[rank - 1]!.count;
  let first = rank;
  let last = rank;
  while (first > 1 && ranked[first - 2]!.count === count) first--;
  while (last < ranked.length && ranked[last]!.count === count) last++;
  return { first, last };
}

/** The ranks the slider stops at: every rank up to 38, then ranks about 4% apart, and the last. */
export function sliderRanks(n: number): number[] {
  const out: number[] = [];
  for (let r = 1; r <= n; r = Math.max(r + 1, Math.round(r * 1.04))) out.push(r);
  if (out.at(-1) !== n) out.push(n);
  return out;
}

/** What the word ranks figure says about the word at rank. */
export function rankWords(book: Book, rank: number): string[] {
  const { ranked, before } = book;
  const total = before.at(-1)!;
  const { word, count } = ranked[rank - 1]!;
  const { first, last } = runOf(ranked, rank);
  const share = `The words up to rank ${group(rank)} make up ${percent(before[rank]!, total)} of the book's ${group(total)} words.`;
  const what = `Rank ${group(rank)} is ${quoted(word)}, which appears ${times(count)}: count times rank is ${group(count * rank)}.`;
  // Ties are in code-point order: alphabetical for words of small letters, with an apostrophe before every letter.
  const apostrophe = ranked.slice(first - 1, last).some((x) => x.word.includes("'"));
  const order = apostrophe ? "in alphabetical order, with an apostrophe before every letter" : "in alphabetical order";
  const run =
    last > first ? `${group(last - first + 1)} words appear ${times(count)}, at ranks ${group(first)} to ${group(last)}, ${order}.` : null;
  return run ? [what, run, share] : [what, share];
}

/**
 * How the written text has come to repeat itself: the smallest L such that the last word was also
 * written L words before it, with every word since added as the commonest next word. Each word
 * then fixes the next, so adding the commonest next word goes round the same L words for ever.
 * null when there is no such L.
 */
export function loopLength(written: readonly string[], commonest: readonly boolean[]): number | null {
  const t = written.length - 1;
  for (let L = 1; L <= t; L++) {
    if (!commonest[t - L + 1]) return null;
    if (written[t - L] === written[t]) return L;
  }
  return null;
}

/** What the writer figure says about the text written so far. */
export function writerWords(book: Book, written: readonly string[], commonest: readonly boolean[]): string {
  const last = written.at(-1)!;
  const n = written.length;
  const so = `${group(n)} ${n === 1 ? "word" : "words"} so far.`;
  if (!book.follows.has(last)) return `${so} Nothing in the book comes after ${quoted(last)}, so the writer can add no more words.`;
  const L = loopLength(written, commonest);
  if (L === null) return so;
  const loop = written.slice(n - L).map(quoted).join(", ");
  return L === 1
    ? `${so} The commonest word after ${quoted(last)} is ${quoted(last)} itself, so adding the commonest next word writes it for ever.`
    : `${so} ${quoted(last)} has come round again, with each word since its last time the commonest after the one before. Adding the commonest next word now repeats the same ${L} words, ${loop}, for ever.`;
}
