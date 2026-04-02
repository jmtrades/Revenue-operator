/**
 * Proof Capsules: structural tests verifying re-exports and module shape.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC = readFileSync(resolve(__dirname, "../src/lib/proof-capsules/index.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Module exports                                                            */
/* -------------------------------------------------------------------------- */

describe("proof-capsules - module exports", () => {
  it("re-exports buildProofCapsuleForPeriod from proof-capsule-period", () => {
    expect(SRC).toContain("buildProofCapsuleForPeriod");
    expect(SRC).toContain("@/lib/proof-capsule-period");
  });

  it("re-exports saveProofCapsule from proof-capsule-period", () => {
    expect(SRC).toContain("saveProofCapsule");
  });

  it("is a barrel module (only re-exports, no logic)", () => {
    // Should only contain export statements and comments
    const nonCommentLines = SRC.split("\n")
      .filter((line) => line.trim() && !line.trim().startsWith("*") && !line.trim().startsWith("/**") && !line.trim().startsWith("//"));
    for (const line of nonCommentLines) {
      expect(line.trim().startsWith("export") || line.trim() === "").toBe(true);
    }
  });
});
