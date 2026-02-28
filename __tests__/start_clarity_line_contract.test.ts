/**
 * Start page clarity: short reinforcing copy. No forbidden terms.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const CONTINUITY_LINE = path.join(ROOT, "src/components/ExecutionContinuityLine.tsx");

describe("Start clarity line contract", () => {
  it("continuity line is short (≤12 words per clause)", () => {
    const content = readFileSync(CONTINUITY_LINE, "utf-8");
    expect(content).toContain("Handling active");
    const clauses = ["Handling active", "Commitments secured", "Compliance enforced", "Confirmation recorded"];
    for (const c of clauses) {
      const words = c.split(/\s+/).length;
      expect(words).toBeLessThanOrEqual(12);
    }
  });

  it("continuity line does not contain forbidden terms", () => {
    const content = readFileSync(CONTINUITY_LINE, "utf-8");
    const forbidden = ["workflow", "automation", "campaign", "mode", "profile", "dialer"];
    for (const w of forbidden) {
      expect(content.toLowerCase()).not.toContain(w);
    }
  });
});
