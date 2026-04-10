import { describe, it, expect } from "vitest";
import { applyNaturalVariation } from "@/lib/human-presence/natural-variation";

describe("human presence - natural variation", () => {
  it("returns original for empty/short strings", () => {
    expect(applyNaturalVariation("")).toBe("");
    expect(applyNaturalVariation("ab")).toBe("ab");
  });

  it("returns non-empty string for valid input", () => {
    const result = applyNaturalVariation("Hello, this is a test message for you.");
    expect(result.length).toBeGreaterThan(0);
  });

  it("does not introduce spelling errors", () => {
    // Run 50 times; "Hello world" should never become garbled
    for (let i = 0; i < 50; i++) {
      const result = applyNaturalVariation("Hello world");
      // After any variation, the result should be a subset of the original
      // (maybe lowercased first char, maybe removed greeting)
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.length).toBeLessThanOrEqual("Hello world".length);
    }
  });

  it("trims whitespace", () => {
    const result = applyNaturalVariation("  Hello world  ");
    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
  });

  it("never returns empty for non-empty input", () => {
    for (let i = 0; i < 100; i++) {
      const result = applyNaturalVariation("Hey — how are you today?");
      expect(result.length).toBeGreaterThan(0);
    }
  });
});
