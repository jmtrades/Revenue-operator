/**
 * Cadence governor: deterministic, no random, returns only allow | cool_off | freeze_24h | escalate.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { evaluateCadence, type CadenceResult } from "../src/lib/intelligence/cadence-governor";

const ROOT = path.resolve(__dirname, "..");
const ALLOWED: CadenceResult[] = ["allow", "cool_off", "freeze_24h", "escalate"];

describe("Cadence governor invariants", () => {
  it("returns only allowed cadence results", () => {
    const results = new Set<CadenceResult>();
    const inputs = [
      { lastContactAt: null, contactCount24h: 0, volatilityScore: 0, emotionalCategory: null, attemptCount48h: 0, brokenCommitmentsExist: false },
      { lastContactAt: null, contactCount24h: 10, volatilityScore: 0, emotionalCategory: null, attemptCount48h: 0, brokenCommitmentsExist: false },
      { lastContactAt: null, contactCount24h: 0, volatilityScore: 80, emotionalCategory: "hostile", attemptCount48h: 0, brokenCommitmentsExist: false },
      { lastContactAt: null, contactCount24h: 0, volatilityScore: 0, emotionalCategory: null, attemptCount48h: 5, brokenCommitmentsExist: false },
      { lastContactAt: null, contactCount24h: 0, volatilityScore: 0, emotionalCategory: null, attemptCount48h: 0, brokenCommitmentsExist: true },
    ];
    for (const i of inputs) {
      results.add(evaluateCadence(i));
    }
    for (const r of results) {
      expect(ALLOWED).toContain(r);
    }
  });

  it("hostile + high volatility returns freeze_24h", () => {
    const out = evaluateCadence({
      lastContactAt: null,
      contactCount24h: 0,
      volatilityScore: 75,
      emotionalCategory: "hostile",
      attemptCount48h: 0,
      brokenCommitmentsExist: false,
    });
    expect(out).toBe("freeze_24h");
  });

  it("broken commitments exist returns escalate", () => {
    const out = evaluateCadence({
      lastContactAt: null,
      contactCount24h: 0,
      volatilityScore: 0,
      emotionalCategory: null,
      attemptCount48h: 0,
      brokenCommitmentsExist: true,
    });
    expect(out).toBe("escalate");
  });

  it("no Math.random or crypto.randomUUID in cadence-governor", () => {
    const content = readFileSync(path.join(ROOT, "src/lib/intelligence/cadence-governor.ts"), "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
