import { describe, expect, it } from "vitest";

import { formatNumber } from "./views";

describe("formatNumber", () => {
  it("groups the digits of ordinary numbers in threes", () => {
    expect(formatNumber(86400)).toBe("86,400");
    expect(formatNumber(0.30103)).toBe("0.30103");
  });

  it("keeps every digit of an exact whole number that four figures would round", () => {
    expect(formatNumber(1048576)).toBe("1,048,576");
  });

  it("writes round and very large or small numbers as powers of ten", () => {
    expect(formatNumber(3e8)).toBe("$3 \\times 10^{8}$");
    expect(formatNumber(3.15e9)).toBe("$3.15 \\times 10^{9}$");
    expect(formatNumber(6.02e23)).toBe("$6.02 \\times 10^{23}$");
    expect(formatNumber(0.0004)).toBe("$4 \\times 10^{-4}$");
  });
});
