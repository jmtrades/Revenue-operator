/**
 * Causality engine: deterministic dependency only. No metrics, no probabilities.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const RECORD_PATH = path.join(ROOT, "src/lib/causality-engine/record.ts");
const TYPES_PATH = path.join(ROOT, "src/lib/causality-engine/types.ts");

describe("Causality engine", () => {
  it("record module defines recordCausalChain and countCausalChainsInLastDays", () => {
    const content = readFileSync(RECORD_PATH, "utf-8");
    expect(content).toContain("recordCausalChain");
    expect(content).toContain("countCausalChainsInLastDays");
    expect(content).toContain("causal_chains");
    expect(content).toContain("dependency_established");
  });

  it("types define intervention types and outcomes", () => {
    const content = readFileSync(TYPES_PATH, "utf-8");
    expect(content).toContain("commitment_recovery");
    expect(content).toContain("opportunity_revival");
    expect(content).toContain("payment_recovery");
    expect(content).toContain("shared_transaction_ack");
    expect(content).toContain("not_confirmed");
    expect(content).toContain("observed_outcome");
  });

  it("no metrics or ROI language in engine", () => {
    const record = readFileSync(RECORD_PATH, "utf-8");
    const types = readFileSync(TYPES_PATH, "utf-8");
    const combined = record + types;
    expect(combined).not.toMatch(/\b(ROI|saved|revenue|percent|efficiency|optimization)\b/i);
  });
});
