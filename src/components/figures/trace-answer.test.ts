import { describe, expect, it } from "vitest";

import { sameAnswer } from "./trace-answer";

describe("sameAnswer", () => {
  it("accepts the value as Python shows it, ignoring spaces and quote marks", () => {
    expect(sameAnswer("0.125", "0.125")).toBe(true);
    expect(sameAnswer(' "ab" ', "'ab'")).toBe(true);
  });

  it("accepts the same float written another way", () => {
    expect(sameAnswer(".125", "0.125")).toBe(true);
    expect(sameAnswer("1/8", "0.125")).toBe(true);
    expect(sameAnswer("1.25e-1", "0.125")).toBe(true);
    expect(sameAnswer("1/3", "0.3333333333333333")).toBe(true);
  });

  it("refuses a float that is only close", () => {
    expect(sameAnswer("0.3", "0.30000000000000004")).toBe(false);
  });

  it("keeps ints and floats apart, as Python does", () => {
    expect(sameAnswer("6", "6")).toBe(true);
    expect(sameAnswer("6.0", "6")).toBe(false);
    expect(sameAnswer("6", "6.0")).toBe(false);
  });

  it("compares big whole numbers exactly", () => {
    expect(sameAnswer("9007199254740993", "9007199254740993")).toBe(true);
    expect(sameAnswer("9007199254740992", "9007199254740993")).toBe(false);
    expect(sameAnswer("1_000", "1000")).toBe(true);
  });

  it("refuses an answer that is not the value", () => {
    expect(sameAnswer("0.25", "0.125")).toBe(false);
    expect(sameAnswer("lr", "0.125")).toBe(false);
    expect(sameAnswer("1/0", "0.125")).toBe(false);
  });
});
