/**
 * Normalization Engine: doctrine constants, trim functions, structural guarantees.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  NORMALIZATION_ORIENTATION_STATEMENT,
  PROOF_CAPSULE_NORMALIZATION_LINE,
  trimDoctrine,
} from "@/lib/normalization-engine";

const SRC_INDEX = readFileSync(resolve(__dirname, "../src/lib/normalization-engine/index.ts"), "utf-8");
const SRC_DOCTRINE = readFileSync(resolve(__dirname, "../src/lib/normalization-engine/doctrine.ts"), "utf-8");
const SRC_RECORD = readFileSync(resolve(__dirname, "../src/lib/normalization-engine/record.ts"), "utf-8");
const SRC_RECOGNITION = readFileSync(resolve(__dirname, "../src/lib/normalization-engine/recognition.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Doctrine constants                                                        */
/* -------------------------------------------------------------------------- */

describe("normalization doctrine constants", () => {
  it("NORMALIZATION_ORIENTATION_STATEMENT is a non-empty string", () => {
    expect(typeof NORMALIZATION_ORIENTATION_STATEMENT).toBe("string");
    expect(NORMALIZATION_ORIENTATION_STATEMENT.length).toBeGreaterThan(0);
  });

  it("NORMALIZATION_ORIENTATION_STATEMENT is <= 90 chars", () => {
    expect(NORMALIZATION_ORIENTATION_STATEMENT.length).toBeLessThanOrEqual(90);
  });

  it("PROOF_CAPSULE_NORMALIZATION_LINE is a non-empty string", () => {
    expect(typeof PROOF_CAPSULE_NORMALIZATION_LINE).toBe("string");
    expect(PROOF_CAPSULE_NORMALIZATION_LINE.length).toBeGreaterThan(0);
  });

  it("PROOF_CAPSULE_NORMALIZATION_LINE is <= 90 chars", () => {
    expect(PROOF_CAPSULE_NORMALIZATION_LINE.length).toBeLessThanOrEqual(90);
  });

  it("doctrine constants contain no forbidden words", () => {
    const forbidden = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard"];
    for (const constant of [NORMALIZATION_ORIENTATION_STATEMENT, PROOF_CAPSULE_NORMALIZATION_LINE]) {
      const lower = constant.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
      }
    }
  });

  it("doctrine constants contain no numbers or percentages", () => {
    for (const constant of [NORMALIZATION_ORIENTATION_STATEMENT, PROOF_CAPSULE_NORMALIZATION_LINE]) {
      expect(constant).not.toMatch(/\d/);
      expect(constant).not.toMatch(/%/);
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  trimDoctrine: pure function                                               */
/* -------------------------------------------------------------------------- */

describe("trimDoctrine", () => {
  it("returns input unchanged if <= 90 chars", () => {
    const input = "Short string.";
    expect(trimDoctrine(input)).toBe(input);
  });

  it("truncates strings longer than 90 chars", () => {
    const input = "A".repeat(100);
    const result = trimDoctrine(input);
    expect(result.length).toBeLessThanOrEqual(90);
  });

  it("trims whitespace after truncation", () => {
    const input = "A".repeat(89) + " B" + "C".repeat(10);
    const result = trimDoctrine(input);
    expect(result).not.toMatch(/\s$/);
  });

  it("handles empty string", () => {
    expect(trimDoctrine("")).toBe("");
  });

  it("is deterministic", () => {
    const input = "Some doctrine statement that is factual.";
    expect(trimDoctrine(input)).toBe(trimDoctrine(input));
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: module shape and exports                                      */
/* -------------------------------------------------------------------------- */

describe("normalization-engine structural", () => {
  it("index exports NormalizationType type", () => {
    expect(SRC_INDEX).toContain("NormalizationType");
  });

  it("index exports recordNormalization", () => {
    expect(SRC_INDEX).toContain("recordNormalization");
  });

  it("index exports normalizationEstablished", () => {
    expect(SRC_INDEX).toContain("normalizationEstablished");
  });

  it("index exports recordNormalizationOrientationOnce", () => {
    expect(SRC_INDEX).toContain("recordNormalizationOrientationOnce");
  });

  it("index exports runNormalizationDetectors", () => {
    expect(SRC_INDEX).toContain("runNormalizationDetectors");
  });

  it("doctrine defines MAX_LINE_LEN of 90", () => {
    expect(SRC_DOCTRINE).toContain("MAX_LINE_LEN = 90");
  });

  it("doctrine defines four normalization types", () => {
    expect(SRC_DOCTRINE).toContain("verification_absent");
    expect(SRC_DOCTRINE).toContain("direct_progression");
    expect(SRC_DOCTRINE).toContain("silent_acceptance");
    expect(SRC_DOCTRINE).toContain("uninterrupted_followthrough");
  });

  it("record module uses insert (append-only, no delete)", () => {
    expect(SRC_RECORD).toContain(".insert(");
    expect(SRC_RECORD).not.toContain(".delete(");
    expect(SRC_RECORD).not.toContain(".remove(");
  });

  it("record module handles duplicate key (23505) gracefully", () => {
    expect(SRC_RECORD).toContain("23505");
  });

  it("recognition requires minimum events and distinct days", () => {
    expect(SRC_RECOGNITION).toContain("MIN_EVENTS");
    expect(SRC_RECOGNITION).toContain("MIN_DISTINCT_DAYS");
  });

  it("recognition uses UTC date truncation for day counting", () => {
    expect(SRC_RECOGNITION).toContain("slice(0, 10)");
  });
});
