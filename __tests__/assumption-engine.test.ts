/**
 * Assumption engine: operational assumptions, orientation, responsibility, proof capsule, settlement.
 * Doctrine: no numbers, ≤90 chars, no forbidden words.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;
const FORBIDDEN = /\b(you|your|we|us|click|try|discover|unlock|leverage|boost|maximize|minimize)\b/i;

describe("assumption engine: daily dedupe", () => {
  it("record uses insert and unique constraint for daily dedupe", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/assumption-engine/record.ts"), "utf-8");
    expect(record).toContain("operational_assumptions");
    expect(record).toContain("insert");
    expect(record).toMatch(/23505|unique|dedupe/i);
  });
});

describe("assumption engine: assumptionEstablished", () => {
  it("requires 3 events and >=2 distinct UTC days", () => {
    const recognition = readFileSync(path.join(ROOT, "src/lib/assumption-engine/recognition.ts"), "utf-8");
    expect(recognition).toContain("assumptionEstablished");
    expect(recognition).toMatch(/MIN_ASSUMPTIONS|3/);
    expect(recognition).toMatch(/MIN_DISTINCT_DAYS|2|utcDays/);
    expect(recognition).toContain("recorded_at");
  });
});

describe("assumption engine: responsibility", () => {
  it("operational_position includes assumed_operation boolean", () => {
    const responsibility = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(responsibility).toContain("assumed_operation");
    expect(responsibility).toContain("assumptionEstablished");
  });
});

describe("assumption engine: orientation recorded once", () => {
  it("orientation statement and column exist", () => {
    const recognition = readFileSync(path.join(ROOT, "src/lib/assumption-engine/recognition.ts"), "utf-8");
    expect(recognition).toContain("recordAssumptionOrientationOnce");
    expect(recognition).toContain("assumption_orientation_recorded_at");
    const doctrine = readFileSync(path.join(ROOT, "src/lib/assumption-engine/doctrine.ts"), "utf-8");
    expect(doctrine).toContain("The process became expected in normal operation.");
  });
});

describe("assumption engine: proof capsule", () => {
  it("includes assumption line only when established and capacity allows", () => {
    const proof = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(proof).toContain("assumptionEstablished");
    expect(proof).toContain("PROOF_CAPSULE_ASSUMPTION_LINE");
    expect(proof).toContain("MAX_LINES");
    expect(proof).toMatch(/lines\.length\s*<\s*MAX_LINES/);
  });

  it("assumption line is ≤90 chars and no numbers", () => {
    const line = "Work proceeded assuming the process.";
    expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(NO_NUMBERS.test(line)).toBe(false);
    expect(FORBIDDEN.test(line)).toBe(false);
  });
});

describe("assumption engine: settlement gating", () => {
  it("isAdministrativeActivationAvailable requires assumptionEstablished", () => {
    const settlement = readFileSync(path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"), "utf-8");
    expect(settlement).toContain("assumptionEstablished");
    expect(settlement).toContain("assumed");
    expect(settlement).toContain("anchoredAcrossDays &&");
  });
});

describe("assumption engine: doctrine", () => {
  it("orientation and proof lines have no numbers and ≤90 chars", () => {
    const orientation = "The process became expected in normal operation.";
    const proofLine = "Work proceeded assuming the process.";
    expect(orientation.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(proofLine.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(NO_NUMBERS.test(orientation)).toBe(false);
    expect(NO_NUMBERS.test(proofLine)).toBe(false);
  });

  it("doctrine module exports allowed strings", () => {
    const doctrine = readFileSync(path.join(ROOT, "src/lib/assumption-engine/doctrine.ts"), "utf-8");
    expect(doctrine).toContain("ASSUMPTION_ORIENTATION_STATEMENT");
    expect(doctrine).toContain("PROOF_CAPSULE_ASSUMPTION_LINE");
    expect(doctrine).toContain("MAX_LINE_LEN");
  });
});
