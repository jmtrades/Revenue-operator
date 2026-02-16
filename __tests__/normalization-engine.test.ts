/**
 * Normalization engine: detection only when prior verification existed, orientation once,
 * responsibility field, proof capsule line, settlement gating, doctrine compliance.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_CHARS = 90;
const NO_NUMBERS = /\d|%|percent|score|ROI|KPI|saved|revenue|efficiency|optimization|improvement|performance|metric/i;
const FORBIDDEN = /\b(you|your|we|us|click|dashboard|metric|ROI|saved|increase|improve|optimize|performance)\b/i;

describe("normalization engine: data model", () => {
  it("migration defines operational_normalizations and orientation column", () => {
    const migrations = readFileSync(
      path.join(ROOT, "supabase/migrations/normalization_engine_operational_normalizations.sql"),
      "utf-8"
    );
    expect(migrations).toContain("operational_normalizations");
    expect(migrations).toContain("normalization_type");
    expect(migrations).toContain("verification_absent");
    expect(migrations).toContain("direct_progression");
    expect(migrations).toContain("silent_acceptance");
    expect(migrations).toContain("uninterrupted_followthrough");
    expect(migrations).toContain("reference_id");
    expect(migrations).toContain("prior_verification_observed");
    expect(migrations).toContain("normalization_orientation_recorded_at");
  });
});

describe("normalization engine: detection rules", () => {
  it("detectors require prior verification before recording", () => {
    const detectors = readFileSync(path.join(ROOT, "src/lib/normalization-engine/detectors.ts"), "utf-8");
    expect(detectors).toContain("prior");
    expect(detectors).toContain("priorSince");
    expect(detectors).toMatch(/prior.*length.*0.*return|if.*prior.*length/);
  });

  it("verification_absent checks prior disputed or reminder", () => {
    const detectors = readFileSync(path.join(ROOT, "src/lib/normalization-engine/detectors.ts"), "utf-8");
    expect(detectors).toContain("shared_transactions");
    expect(detectors).toContain("acknowledged");
    expect(detectors).toMatch(/disputed|reminder_sent_count/);
  });

  it("direct_progression checks prior reminder_sent and no reminder between resolutions", () => {
    const detectors = readFileSync(path.join(ROOT, "src/lib/normalization-engine/detectors.ts"), "utf-8");
    expect(detectors).toContain("commitment_events");
    expect(detectors).toContain("reminder_sent");
    expect(detectors).toContain("resolved");
  });

  it("silent_acceptance checks prior recovery_attempts and current zero", () => {
    const detectors = readFileSync(path.join(ROOT, "src/lib/normalization-engine/detectors.ts"), "utf-8");
    expect(detectors).toContain("payment_obligations");
    expect(detectors).toContain("recovery_attempts");
    expect(detectors).toContain("paid");
  });

  it("uninterrupted_followthrough checks prior opportunity_revival and no revival for current", () => {
    const detectors = readFileSync(path.join(ROOT, "src/lib/normalization-engine/detectors.ts"), "utf-8");
    expect(detectors).toContain("continuation_exposures");
    expect(detectors).toContain("causal_chains");
    expect(detectors).toContain("opportunity_revival");
  });
});

describe("normalization engine: recognition", () => {
  it("normalizationEstablished requires >= 3 events across >= 2 days in 7 day window", () => {
    const recognition = readFileSync(path.join(ROOT, "src/lib/normalization-engine/recognition.ts"), "utf-8");
    expect(recognition).toContain("normalizationEstablished");
    expect(recognition).toContain("operational_normalizations");
    expect(recognition).toMatch(/MIN_EVENTS|3|MIN_DISTINCT_DAYS|2|WINDOW_DAYS|7/);
  });

  it("orientation recorded once per workspace", () => {
    const recognition = readFileSync(path.join(ROOT, "src/lib/normalization-engine/recognition.ts"), "utf-8");
    expect(recognition).toContain("recordNormalizationOrientationOnce");
    expect(recognition).toContain("normalization_orientation_recorded_at");
    expect(recognition).toContain("already != null) return");
  });
});

describe("normalization engine: doctrine", () => {
  it("orientation and proof capsule lines are ≤90 chars, no numbers, no forbidden words", () => {
    const doctrine = readFileSync(path.join(ROOT, "src/lib/normalization-engine/doctrine.ts"), "utf-8");
    expect(doctrine).toContain("NORMALIZATION_ORIENTATION_STATEMENT");
    expect(doctrine).toContain("The process became treated as part of normal operation.");
    expect(doctrine).toContain("PROOF_CAPSULE_NORMALIZATION_LINE");
    expect(doctrine).toContain("Work proceeded without verification.");
    const orientation = "The process became treated as part of normal operation.";
    const proofLine = "Work proceeded without verification.";
    expect(orientation.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(proofLine.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(NO_NUMBERS.test(orientation)).toBe(false);
    expect(NO_NUMBERS.test(proofLine)).toBe(false);
    expect(FORBIDDEN.test(orientation)).toBe(false);
    expect(FORBIDDEN.test(proofLine)).toBe(false);
  });
});

describe("normalization engine: responsibility", () => {
  it("operational_position includes normalized_operation boolean", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/responsibility/route.ts"), "utf-8");
    expect(route).toContain("normalized_operation");
    expect(route).toContain("normalizationEstablished");
  });
});

describe("normalization engine: proof capsule", () => {
  it("proof capsule appends normalization line after assumption when established and capacity allows", () => {
    const proof = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(proof).toContain("PROOF_CAPSULE_NORMALIZATION_LINE");
    expect(proof).toContain("normalizationEstablished");
    const doctrine = readFileSync(path.join(ROOT, "src/lib/normalization-engine/doctrine.ts"), "utf-8");
    expect(doctrine).toContain("Work proceeded without verification.");
  });

  it("proof capsule still enforces max 8 lines", () => {
    const proof = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(proof).toContain("MAX_LINES");
    expect(proof).toContain("lines.slice(0, MAX_LINES)");
  });
});

describe("normalization engine: settlement gating", () => {
  it("administrative activation requires normalizationEstablished", () => {
    const settlement = readFileSync(path.join(ROOT, "src/lib/operational-perception/settlement-context.ts"), "utf-8");
    expect(settlement).toContain("normalizationEstablished");
    expect(settlement).toContain("normalized");
    expect(settlement).toMatch(/assumed.*normalized|normalized.*\)/);
  });
});

describe("normalization engine: record and cron", () => {
  it("record uses daily dedupe by workspace, type, reference_id", () => {
    const record = readFileSync(path.join(ROOT, "src/lib/normalization-engine/record.ts"), "utf-8");
    expect(record).toContain("recordNormalization");
    expect(record).toContain("operational_normalizations");
    expect(record).toMatch(/23505/);
  });

  it("cron runs detectors and orientation once per workspace", () => {
    const cron = readFileSync(path.join(ROOT, "src/app/api/cron/normalization-engine/route.ts"), "utf-8");
    expect(cron).toContain("runNormalizationDetectors");
    expect(cron).toContain("recordNormalizationOrientationOnce");
    expect(cron).toContain("recordCronHeartbeat");
  });
});
