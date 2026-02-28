/**
 * Drift detector: deterministic. No GPT. No randomness.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { evaluateDrift } from "../src/lib/intelligence/drift-detector";

const ROOT = path.resolve(__dirname, "..");

describe("Drift detector determinism", () => {
  it("same input yields same driftScore, contradictionScore, requiresEscalation", () => {
    const input = { lastOutcomeTypes: ["payment_promised", "payment_failed"], commitmentReversalsCount: 1 };
    const a = evaluateDrift(input);
    const b = evaluateDrift(input);
    expect(a.driftScore).toBe(b.driftScore);
    expect(a.contradictionScore).toBe(b.contradictionScore);
    expect(a.requiresEscalation).toBe(b.requiresEscalation);
  });

  it("scores are clamped 0-100", () => {
    const r = evaluateDrift({ lastOutcomeTypes: [], commitmentReversalsCount: 0 });
    expect(r.driftScore).toBeGreaterThanOrEqual(0);
    expect(r.driftScore).toBeLessThanOrEqual(100);
    expect(r.contradictionScore).toBeGreaterThanOrEqual(0);
    expect(r.contradictionScore).toBeLessThanOrEqual(100);
  });

  it("requiresEscalation true when drift or contradiction high or commitment reversals", () => {
    const high = evaluateDrift({ commitmentReversalsCount: 5, repeatedUnknownCount: 5 });
    expect(high.requiresEscalation).toBe(true);
  });

  it("no Math.random or crypto.randomUUID in drift-detector", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/drift-detector.ts"), "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
