/*
 * A hash table of whole-number keys, as the lesson builds one: the arithmetic behind the
 * HashBuckets figure. A whole number from 0 up is its own hash in Python, so key k goes in bucket
 * k % m of m buckets. When doubling is on, a key that would make the keys outnumber the buckets
 * first doubles them, moving every key already stored to its bucket among the new ones, and then
 * goes in its own; the moves are counted, to set beside 8 + 16 + 32 + ...
 */

import { generator, group } from "./ties";

/** The most keys the figure holds, so that its buckets stay readable on a phone. */
export const MAX_KEYS = 64;

/** The largest key that can be typed or drawn at random. */
export const KEY_MAX = 999;

export type HashTable = { buckets: number[][]; moves: number };

/** The bucket of a key among m buckets: its remainder on division by m. */
export function bucketOf(key: number, m: number): number {
  return ((key % m) + m) % m;
}

export function keyCount(table: HashTable): number {
  return table.buckets.reduce((n, b) => n + b.length, 0);
}

/** m empty buckets holding the keys given, in order, without doubling and without repeats. */
export function makeTable(keys: readonly number[], m: number): HashTable {
  const buckets = Array.from({ length: m }, () => [] as number[]);
  for (const k of keys) {
    const b = buckets[bucketOf(k, m)]!;
    if (!b.includes(k)) b.push(k);
  }
  return { buckets, moves: 0 };
}

/** Twice as many buckets, with every key moved to its bucket among them, in the order it is met. */
export function doubled(table: HashTable): HashTable {
  const m = table.buckets.length * 2;
  const buckets = Array.from({ length: m }, () => [] as number[]);
  for (const b of table.buckets) for (const k of b) buckets[bucketOf(k, m)]!.push(k);
  return { buckets, moves: table.moves + keyCount(table) };
}

/** Doubles the buckets until the keys no longer outnumber them, as turning doubling on does. */
export function fit(table: HashTable): { table: HashTable; doublings: number } {
  let t = table;
  let doublings = 0;
  while (keyCount(t) > t.buckets.length) {
    t = doubled(t);
    doublings += 1;
  }
  return { table: t, doublings };
}

export type Added = {
  table: HashTable;
  key: number;
  /** False when an equal key was in its bucket already, so nothing changed. */
  added: boolean;
  /** The key's bucket, after any doubling. */
  bucket: number;
  /** How many buckets there were before this key, and how many keys moved because of it. */
  bucketsBefore: number;
  moved: number;
};

/** Adds a key, as `HashSet.add` does: nothing happens if an equal key is in its bucket. */
export function addKey(table: HashTable, key: number, doubling: boolean): Added {
  const before = table.buckets.length;
  const home = bucketOf(key, before);
  if (table.buckets[home]!.includes(key)) {
    return { table, key, added: false, bucket: home, bucketsBefore: before, moved: 0 };
  }
  let t = table;
  if (doubling && keyCount(t) + 1 > before) t = doubled(t);
  const m = t.buckets.length;
  const bucket = bucketOf(key, m);
  const buckets = t.buckets.map((b, i) => (i === bucket ? [...b, key] : b));
  return { table: { buckets, moves: t.moves }, key, added: true, bucket, bucketsBefore: before, moved: t.moves - table.moves };
}

export type Lookup = { key: number; bucket: number; held: number[]; compared: number; found: boolean };

/** Looks a key up, comparing it with the keys of its bucket in order until one is equal. */
export function lookUp(table: HashTable, key: number): Lookup {
  const bucket = bucketOf(key, table.buckets.length);
  const held = table.buckets[bucket]!;
  const at = held.indexOf(key);
  return { key, bucket, held, compared: at < 0 ? held.length : at + 1, found: at >= 0 };
}

/** `count` keys from 0 to KEY_MAX, drawn from a seeded generator. */
export function randomKeys(seed: number, count: number): number[] {
  const next = generator(seed);
  return Array.from({ length: count }, () => Math.floor(next() * (KEY_MAX + 1)));
}

/** A whole number from 0 to KEY_MAX typed by the learner, or null. */
export function parseKey(text: string): number | null {
  const t = text.trim().replace(/,/g, "");
  if (!/^\d+$/.test(t)) return null;
  const k = Number(t);
  return k <= KEY_MAX ? k : null;
}

/** A list in words: "3", "3 and 11", "3, 11 and 19". */
export function listed(xs: readonly number[]): string {
  const g = xs.map(group);
  if (g.length <= 1) return g.join("");
  return `${g.slice(0, -1).join(", ")} and ${g.at(-1)}`;
}

/** A count of keys in words: "1 key", "5 keys". */
export const keysWord = (n: number) => `${group(n)} ${n === 1 ? "key" : "keys"}`;

/** What adding a key did, in words. */
export function addWords(a: Added): string {
  const m = a.table.buckets.length;
  if (!a.added) return `${group(a.key)} is in bucket ${a.bucket} already, so nothing changes.`;
  const into = `${group(a.key)} goes in bucket ${group(a.key)} % ${m} = ${a.bucket}`;
  const holds = a.table.buckets[a.bucket]!.length;
  const tail = holds === 1 ? "where it is alone." : `which now holds ${keysWord(holds)}.`;
  if (m === a.bucketsBefore) return `${into}, ${tail}`;
  return (
    `A new key would make the keys outnumber the ${a.bucketsBefore} buckets, so they double to ${m}, and the ` +
    `${keysWord(a.moved)} already stored move to their new buckets. Then ${into}, ${tail}`
  );
}

/** What looking a key up did, in words. */
export function lookWords(l: Lookup, m: number): string {
  const where = `Looking up ${group(l.key)}: its bucket is ${group(l.key)} % ${m} = ${l.bucket}`;
  if (l.held.length === 0) return `${where}, which is empty, so ${group(l.key)} is compared with no key and is not there.`;
  const holds = `, which holds ${listed(l.held)}`;
  if (l.found) {
    return `${where}${holds}. ${group(l.key)} is found after comparing it with ${keysWord(l.compared)}.`;
  }
  const all = l.held.length === 1 ? "the one key" : l.held.length === 2 ? "both keys" : `all ${group(l.held.length)} keys`;
  return `${where}${holds}. ${group(l.key)} is compared with ${all} there and is not found.`;
}

/** How full the table is, in words. */
export function tableWords(table: HashTable): string {
  const n = keyCount(table);
  const m = table.buckets.length;
  const fullest = Math.max(...table.buckets.map((b) => b.length));
  const average = (n / m).toFixed(2).replace(/\.?0+$/, "");
  return (
    `${keysWord(n)} in ${m} buckets, ${average} a bucket on average; the fullest bucket holds ${keysWord(fullest)}. ` +
    `Moves made by doubling so far: ${group(table.moves)}.`
  );
}
