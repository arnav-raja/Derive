/*
 * A stream shuffled with a buffer, as E1.11's `shuffled` does it: the arithmetic behind the
 * ShuffleBuffer figure. The stream is 12 items about each of three topics, in order. The buffer
 * fills with the first k items; then each new item takes the place of one handed out at random,
 * and when the stream ends the buffer is shuffled and handed out. The random choices come from a
 * seeded generator, so that the same seed gives the same shuffle on the server and in the browser.
 */

import { generator } from "./ties";

export const TOPICS = ["A", "B", "C"] as const;

/** How many items there are about each topic, and how many the figure draws in each row. */
export const PER_TOPIC = 12;

export const STREAM_LENGTH = TOPICS.length * PER_TOPIC;

export type Item = {
  /** 0 for A, 1 for B, 2 for C. */
  topic: number;
  /** The item's number within its topic, from 1 to PER_TOPIC. */
  number: number;
  /** Its place in the stream, from 0, in the order the items arrive. */
  place: number;
};

export const itemName = (item: Item) => `${TOPICS[item.topic]}${item.number}`;

/** The stream in order: every item about A, then every item about B, then every item about C. */
export function stream(): Item[] {
  return Array.from({ length: STREAM_LENGTH }, (_, place) => ({
    topic: Math.floor(place / PER_TOPIC),
    number: (place % PER_TOPIC) + 1,
    place,
  }));
}

/**
 * The items in the order a buffer of k hands them out, as the lesson's `shuffled(items, k)` does,
 * with `random.randrange(k)` for each choice and `random.shuffle` for the buffer left at the end.
 */
export function bufferShuffle(items: readonly Item[], k: number, seed: number): Item[] {
  const next = generator(seed);
  const below = (n: number) => Math.min(n - 1, Math.floor(next() * n));
  const size = Math.max(1, Math.round(k));
  const buffer: Item[] = [];
  const out: Item[] = [];
  for (const x of items) {
    if (buffer.length < size) {
      buffer.push(x);
    } else {
      const i = below(size);
      out.push(buffer[i]!);
      buffer[i] = x;
    }
  }
  for (let i = buffer.length - 1; i > 0; i--) {
    const j = below(i + 1);
    [buffer[i], buffer[j]] = [buffer[j]!, buffer[i]!];
  }
  return out.concat(buffer);
}

/** The items cut into rows of PER_TOPIC, in order. */
export function rows(items: readonly Item[]): Item[][] {
  const out: Item[][] = [];
  for (let i = 0; i < items.length; i += PER_TOPIC) out.push(items.slice(i, i + PER_TOPIC));
  return out;
}

/** How many items of each topic a row holds, in the order A, B, C. */
export function topicCounts(row: readonly Item[]): number[] {
  const counts = TOPICS.map(() => 0);
  for (const item of row) counts[item.topic]! += 1;
  return counts;
}

/** "12 items about A", "1 about B", "none about C": the counts of a row in words. */
function countWords(counts: readonly number[]): string {
  const parts = counts.map((c, t) => {
    const about = `about ${TOPICS[t]}`;
    if (t === 0) return c === 0 ? `no items ${about}` : `${c} ${c === 1 ? "item" : "items"} ${about}`;
    return c === 0 ? `none ${about}` : `${c} ${about}`;
  });
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}

/** The figure's sentence: what the first row of the output holds, with a buffer of k. */
export function firstRowWords(out: readonly Item[], k: number): string {
  const first = rows(out)[0] ?? [];
  const buffer = `a buffer of ${k} ${k === 1 ? "item" : "items"}`;
  return `With ${buffer}, the first row of ${PER_TOPIC} handed out holds ${countWords(topicCounts(first))}.`;
}
