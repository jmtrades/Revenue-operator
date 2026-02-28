/**
 * Attempt envelope: never same variant 3x in a row. Deterministic.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { computeAttemptEnvelope } from "../src/lib/intelligence/attempt-envelope";

const ROOT = path.resolve(__dirname, "..");

describe("Attempt envelope no repeat", () => {
  it("returns recommended_variant and attempt_number", () => {
    const r = computeAttemptEnvelope({ openQuestionsCount: 0, goodwillScore: 50, driftScore: 0, contradictionScore: 0 });
    expect(r).toHaveProperty("recommended_variant");
    expect(r).toHaveProperty("attempt_number");
    expect(typeof r.attempt_number).toBe("number");
  });

  it("open questions => clarify", () => {
    const r = computeAttemptEnvelope({ openQuestionsCount: 1, goodwillScore: 50, driftScore: 0, contradictionScore: 0 });
    expect(r.recommended_variant).toBe("clarify");
  });

  it("legal_risk => compliance_forward", () => {
    const r = computeAttemptEnvelope({ openQuestionsCount: 0, goodwillScore: 50, driftScore: 0, contradictionScore: 0, isLegalRisk: true });
    expect(r.recommended_variant).toBe("compliance_forward");
  });

  it("contradiction high => handoff", () => {
    const r = computeAttemptEnvelope({ openQuestionsCount: 0, goodwillScore: 50, driftScore: 0, contradictionScore: 70 });
    expect(r.recommended_variant).toBe("handoff");
  });

  it("variant is one of allowed set", () => {
    const allowed = ["direct", "gentle", "firm", "compliance_forward", "clarify", "handoff"];
    const r = computeAttemptEnvelope({ openQuestionsCount: 0, goodwillScore: 50, driftScore: 0, contradictionScore: 0 });
    expect(allowed).toContain(r.recommended_variant);
  });

  it("no Math.random or crypto.randomUUID in attempt-envelope", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/attempt-envelope.ts"), "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
