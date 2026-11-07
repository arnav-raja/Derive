import { describe, expect, it } from "vitest";

import {
  addKey,
  addWords,
  bucketOf,
  doubled,
  fit,
  keyCount,
  listed,
  lookUp,
  lookWords,
  makeTable,
  MAX_KEYS,
  parseKey,
  randomKeys,
  tableWords,
} from "./buckets";

const lesson = () => makeTable([3, 11, 19, 27, 13], 8);

describe("makeTable", () => {
  it("puts the lesson's keys in their buckets", () => {
    const t = lesson();
    expect(t.buckets[3]).toEqual([3, 11, 19, 27]);
    expect(t.buckets[5]).toEqual([13]);
    expect(keyCount(t)).toBe(5);
    expect(makeTable([4, 4, 12], 8).buckets[4]).toEqual([4, 12]);
  });

  it("finds a key's bucket by its remainder", () => {
    expect(bucketOf(21, 8)).toBe(5);
    expect(bucketOf(35, 8)).toBe(3);
    expect(bucketOf(35, 16)).toBe(3);
    expect(bucketOf(56, 64)).toBe(56);
  });
});

describe("lookUp", () => {
  it("compares with every key of the bucket when the key is not there", () => {
    expect(lookUp(lesson(), 35)).toEqual({ key: 35, bucket: 3, held: [3, 11, 19, 27], compared: 4, found: false });
    expect(lookUp(lesson(), 0)).toMatchObject({ bucket: 0, compared: 0, found: false });
  });

  it("stops at the first equal key", () => {
    expect(lookUp(lesson(), 19)).toMatchObject({ bucket: 3, compared: 3, found: true });
    expect(lookUp(lesson(), 13)).toMatchObject({ bucket: 5, compared: 1, found: true });
  });
});

describe("addKey", () => {
  it("adds a new key at the end of its bucket, and ignores a repeat", () => {
    const a = addKey(lesson(), 35, false);
    expect(a.added).toBe(true);
    expect(a.table.buckets[3]).toEqual([3, 11, 19, 27, 35]);
    const b = addKey(a.table, 35, false);
    expect(b.added).toBe(false);
    expect(b.table).toBe(a.table);
  });

  it("never doubles when doubling is off", () => {
    let t = makeTable([], 8);
    for (let k = 0; k < 40; k += 1) t = addKey(t, k, false).table;
    expect(t.buckets).toHaveLength(8);
    expect(t.buckets[0]).toEqual([0, 8, 16, 24, 32]);
  });

  it("doubles when a new key would make the keys outnumber the buckets, as HashSet does", () => {
    let t = makeTable([], 8);
    const sizes: number[] = [];
    for (let k = 0; k < MAX_KEYS; k += 1) {
      const a = addKey(t, k, true);
      t = a.table;
      sizes.push(t.buckets.length);
      if (k === 8) {
        expect(a.bucketsBefore).toBe(8);
        expect(a.moved).toBe(8);
      }
    }
    expect(sizes.slice(0, 8).every((m) => m === 8)).toBe(true);
    expect(sizes[8]).toBe(16);
    expect(sizes[16]).toBe(32);
    expect(sizes[32]).toBe(64);
    expect(sizes[63]).toBe(64);
    // 8 + 16 + 32 keys moved: fewer than 2 for each of the 64 keys added.
    expect(t.moves).toBe(56);
    t.buckets.forEach((b, i) => b.forEach((k) => expect(bucketOf(k, 64)).toBe(i)));
  });

  it("keeps each bucket in the order its keys were added, as the lesson's reference does", () => {
    let t = makeTable([], 8);
    for (const k of [1, 17, 9, 25, 33, 41, 49, 57, 65]) t = addKey(t, k, true).table;
    expect(t.buckets).toHaveLength(16);
    expect(t.buckets[1]).toEqual([1, 17, 33, 49, 65]);
    expect(t.buckets[9]).toEqual([9, 25, 41, 57]);
  });
});

describe("fit and doubled", () => {
  it("doubles until the keys no longer outnumber the buckets", () => {
    let t = makeTable([], 8);
    for (let k = 0; k < 20; k += 1) t = addKey(t, k * 3, false).table;
    const f = fit(t);
    expect(f.doublings).toBe(2);
    expect(f.table.buckets).toHaveLength(32);
    expect(f.table.moves).toBe(40);
    expect(keyCount(f.table)).toBe(20);
    expect(fit(lesson()).doublings).toBe(0);
    expect(doubled(lesson()).buckets[3]).toEqual([3, 19]);
    expect(doubled(lesson()).buckets[11]).toEqual([11, 27]);
  });
});

describe("parseKey and randomKeys", () => {
  it("reads a whole number from 0 to 999", () => {
    expect(parseKey(" 35 ")).toBe(35);
    expect(parseKey("0")).toBe(0);
    expect(parseKey("999")).toBe(999);
    expect(parseKey("1,000")).toBeNull();
    expect(parseKey("-3")).toBeNull();
    expect(parseKey("2.5")).toBeNull();
    expect(parseKey("")).toBeNull();
  });

  it("draws the same keys from the same seed, all in range", () => {
    expect(randomKeys(4, 5)).toEqual(randomKeys(4, 5));
    expect(randomKeys(4, 200).every((k) => Number.isInteger(k) && k >= 0 && k <= 999)).toBe(true);
  });
});

describe("words", () => {
  it("says where a key went, and when the buckets doubled", () => {
    expect(addWords(addKey(lesson(), 35, false))).toBe("35 goes in bucket 35 % 8 = 3, which now holds 5 keys.");
    expect(addWords(addKey(lesson(), 6, false))).toBe("6 goes in bucket 6 % 8 = 6, where it is alone.");
    expect(addWords(addKey(lesson(), 19, false))).toBe("19 is in bucket 3 already, so nothing changes.");
    let t = makeTable([0, 1, 2, 3, 4, 5, 6, 7], 8);
    const a = addKey(t, 40, true);
    t = a.table;
    expect(addWords(a)).toBe(
      "A new key would make the keys outnumber the 8 buckets, so they double to 16, and the 8 keys already stored " +
        "move to their new buckets. Then 40 goes in bucket 40 % 16 = 8, where it is alone.",
    );
  });

  it("says what a lookup compared", () => {
    expect(lookWords(lookUp(lesson(), 35), 8)).toBe(
      "Looking up 35: its bucket is 35 % 8 = 3, which holds 3, 11, 19 and 27. 35 is compared with all 4 keys there and is not found.",
    );
    expect(lookWords(lookUp(lesson(), 19), 8)).toBe(
      "Looking up 19: its bucket is 19 % 8 = 3, which holds 3, 11, 19 and 27. 19 is found after comparing it with 3 keys.",
    );
    expect(lookWords(lookUp(lesson(), 13), 8)).toBe(
      "Looking up 13: its bucket is 13 % 8 = 5, which holds 13. 13 is found after comparing it with 1 key.",
    );
    expect(lookWords(lookUp(lesson(), 21), 8)).toBe(
      "Looking up 21: its bucket is 21 % 8 = 5, which holds 13. 21 is compared with the one key there and is not found.",
    );
    expect(lookWords(lookUp(lesson(), 8), 8)).toBe(
      "Looking up 8: its bucket is 8 % 8 = 0, which is empty, so 8 is compared with no key and is not there.",
    );
  });

  it("says how full the table is", () => {
    expect(tableWords(lesson())).toBe(
      "5 keys in 8 buckets, 0.63 a bucket on average; the fullest bucket holds 4 keys. Moves made by doubling so far: 0.",
    );
    expect(tableWords(makeTable([1, 2, 3, 4, 5, 6, 7, 8], 8))).toContain("8 keys in 8 buckets, 1 a bucket on average");
    expect(listed([3])).toBe("3");
    expect(listed([3, 11])).toBe("3 and 11");
  });
});
