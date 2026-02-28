/**
 * Path variant selection determinism. No randomness.
 */

import { describe, it, expect } from "vitest";
import { selectPathVariant } from "../src/lib/intelligence/path-variant";

describe("Path variant determinism", () => {
  it("same input yields same output", () => {
    const input = { commitmentState: null, emotionalCategory: "neutral", objective: "qualify", attemptNumber: 1 };
    expect(selectPathVariant(input)).toBe(selectPathVariant(input));
  });

  it("returns only allowed variant keys", () => {
    const allowed = ["direct", "gentle", "firm", "compliance_forward", "clarify", "handoff"];
    const out = selectPathVariant({ attemptNumber: 0 });
    expect(allowed).toContain(out);
  });

  it("hostile emotional returns handoff", () => {
    expect(selectPathVariant({ emotionalCategory: "hostile", attemptNumber: 0 })).toBe("handoff");
  });

  it("path-variant.ts does not use Math.random", () => {
    const path = require("path");
    const fs = require("fs");
    const full = path.resolve(__dirname, "../src/lib/intelligence/path-variant.ts");
    const content = fs.readFileSync(full, "utf-8");
    expect(content).not.toContain("Math.random");
  });
});
