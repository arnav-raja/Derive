import { describe, expect, it } from "vitest";

import { bytesSentence, charName, markerBits, payloadBits, utf8Chars } from "./text-bytes";

describe("UTF-8 bytes of a text", () => {
  it("counts characters as Python does, one for each code point", () => {
    expect(utf8Chars("café").map((c) => c.codePoint)).toEqual([99, 97, 102, 233]);
    expect(utf8Chars("नमस्ते")).toHaveLength(6);
    expect(utf8Chars("𝑥")).toHaveLength(1);
  });

  it("gives each character its UTF-8 bytes", () => {
    expect(utf8Chars("é")[0]!.bytes).toEqual([195, 169]);
    expect(utf8Chars("न")[0]!.bytes).toEqual([224, 164, 168]);
    expect(utf8Chars("नमस्ते").reduce((s, c) => s + c.bytes.length, 0)).toBe(18);
    expect(utf8Chars("𝑥")[0]!.bytes).toEqual([240, 157, 145, 165]);
  });

  it("marks the bits that say where a character starts and how long it is", () => {
    expect([0b0100_0001, 0b1000_0000, 0b1100_0011, 0b1110_0000, 0b1111_0000].map(markerBits)).toEqual([1, 2, 3, 4, 5]);
  });

  it("reads a character's code point back from the bits its bytes carry", () => {
    for (const ch of ["A", "é", "न", "日", "𝑥"]) {
      const c = utf8Chars(ch)[0]!;
      expect(parseInt(payloadBits(c.bytes), 2)).toBe(c.codePoint);
    }
    // 5n + 1 bits for n bytes, from two bytes on, and 7 for one.
    expect(["A", "é", "न", "𝑥"].map((ch) => payloadBits(utf8Chars(ch)[0]!.bytes).length)).toEqual([7, 11, 16, 21]);
  });

  it("says what a text's bytes come to", () => {
    expect(bytesSentence("café")).toBe("café takes 5 bytes: one byte each for c, a and f, and two for é.");
    expect(bytesSentence("hello")).toBe("hello takes 5 bytes: one byte each for h, e, l and o.");
    expect(bytesSentence("नमस्ते")).toBe("नमस्ते takes 18 bytes: three bytes each for न, म, स, ◌्, त and ◌े.");
  });

  it("names a space, and draws a combining mark on a dotted circle", () => {
    expect(charName(" ")).toBe("a space");
    expect(charName("े")).toBe("◌े");
    expect(charName("a")).toBe("a");
  });
});
