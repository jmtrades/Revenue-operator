/**
 * Structural tests for proof capsule modules.
 * Verifies: proof-capsule-period, proof-capsules re-export, line limits.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("proof-capsules re-export module", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/proof-capsules/index.ts"), "utf-8");

  it("re-exports buildProofCapsuleForPeriod", () => {
    expect(src).toContain("buildProofCapsuleForPeriod");
  });

  it("re-exports saveProofCapsule", () => {
    expect(src).toContain("saveProofCapsule");
  });

  it("delegates to proof-capsule-period module", () => {
    expect(src).toContain("proof-capsule-period");
  });
});

describe("proof-capsule-period module", () => {
  const modulePath = path.join(ROOT, "src/lib/proof-capsule-period/index.ts");

  it("module exists", () => {
    expect(existsSync(modulePath)).toBe(true);
  });

  const src = readFileSync(modulePath, "utf-8");

  it("exports buildProofCapsuleForPeriod", () => {
    expect(src).toContain("export async function buildProofCapsuleForPeriod");
  });

  it("exports saveProofCapsule", () => {
    expect(src).toContain("export async function saveProofCapsule");
  });

  it("enforces MAX_LINES (8)", () => {
    expect(src).toMatch(/MAX_LINES\s*=\s*8/);
  });

  it("enforces MAX_LINE_LEN (90)", () => {
    expect(src).toMatch(/MAX_LINE_LEN\s*=\s*90/);
  });

  it("has trim function for line capping", () => {
    expect(src).toContain("function trim");
  });
});

describe("proof-capsule-period ladder order", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");

  it("includes CAUSALITY_LINE mapping", () => {
    expect(src).toContain("CAUSALITY_LINE");
  });

  it("includes CONTINUATION_LINE mapping", () => {
    expect(src).toContain("CONTINUATION_LINE");
  });

  it("includes DISPLACEMENT_LINE mappings", () => {
    expect(src).toContain("DISPLACEMENT_LINE_AFTER");
    expect(src).toContain("DISPLACEMENT_LINE_WITHOUT");
  });

  it("includes RESPONSIBILITY_LINE mapping", () => {
    expect(src).toContain("RESPONSIBILITY_LINE");
  });
});

describe("proof-capsule-period data sources", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");

  it("queries causal_chains", () => {
    expect(src).toContain("causal_chains");
  });

  it("queries continuation_exposures", () => {
    expect(src).toContain("continuation_exposures");
  });

  it("queries coordination_displacement_events", () => {
    expect(src).toContain("coordination_displacement_events");
  });

  it("queries responsibility_moments", () => {
    expect(src).toContain("responsibility_moments");
  });

  it("checks provider detachment", () => {
    expect(src).toContain("providerDetachmentEstablished");
  });

  it("saveProofCapsule uses upsert with onConflict", () => {
    expect(src).toContain("upsert");
    expect(src).toContain("onConflict");
  });
});

describe("proof-capsule-period architectural invariants", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });

  it("does not contain economic or relief language", () => {
    // No dollar amounts, ROI, savings, cost reduction
    expect(src).not.toMatch(/\$\d/);
    expect(src).not.toContain("savings");
    expect(src).not.toContain("cost reduction");
  });
});
