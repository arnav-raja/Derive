import { describe, expect, it } from "vitest";

import { labelToText, texToText } from "./plain-tex";

describe("texToText", () => {
  it("turns powers and operators into Unicode", () => {
    expect(texToText(String.raw`10^a \div 10^b = 10^{a-b}`)).toBe("10ᵃ ÷ 10ᵇ = 10ᵃ⁻ᵇ");
    expect(texToText(String.raw`10^a \times 10^b = 10^{a+b}`)).toBe("10ᵃ × 10ᵇ = 10ᵃ⁺ᵇ");
  });

  it("writes fractions with a slash and brackets only where needed", () => {
    expect(texToText(String.raw`\frac{a}{b}`)).toBe("a/b");
    expect(texToText(String.raw`\tfrac{a+1}{b}`)).toBe("(a+1)/b");
    expect(texToText(String.raw`\dfrac{\text{m}}{\text{s}}`)).toBe("m/s");
    expect(texToText(String.raw`\frac{a}{\hat{b}}`)).toBe("a/b");
  });

  it("falls back to a caret when a character has no superscript form", () => {
    expect(texToText("x^{q}")).toBe("x^q");
    expect(texToText("x^{2q}")).toBe("x^(2q)");
  });

  it("keeps unknown commands readable and drops spacing commands", () => {
    expect(texToText(String.raw`3\ \text{s} \approx \pi`)).toBe("3 s ≈ π");
    expect(texToText(String.raw`\sqrt{L/g}`)).toBe("√(L/g)");
    expect(texToText(String.raw`\hat{x} + \widetilde{y}`)).toBe("x + y");
  });

  it("handles subscripts", () => {
    expect(texToText("x_1 + x_{n}")).toBe("x₁ + xₙ");
  });
});

describe("labelToText", () => {
  it("converts the maths inside a Markdown label and strips emphasis", () => {
    expect(labelToText(String.raw`Dividing powers: $10^a \div 10^b = 10^{a-b}$`)).toBe("Dividing powers: 10ᵃ ÷ 10ᵇ = 10ᵃ⁻ᵇ");
    expect(labelToText("**Cancel** a unit")).toBe("Cancel a unit");
    expect(labelToText("Set `seconds_per_year` *first*")).toBe("Set seconds_per_year first");
  });
});
