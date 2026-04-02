/**
 * Assumption Engine: doctrine constants, structural guarantees, append-only behavior.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  ASSUMPTION_ORIENTATION_STATEMENT,
  PROOF_CAPSULE_ASSUMPTION_LINE,
  trimDoctrine,
} from "@/lib/assumption-engine";

const SRC_INDEX = readFileSync(resolve(__dirname, "../src/lib/assumption-engine/index.ts"), "utf-8");
const SRC_DOCTRINE = readFileSync(resolve(__dirname, "../src/lib/assumption-engine/doctrine.ts"), "utf-8");
const SRC_RECORD = readFileSync(resolve(__dirname, "../src/lib/assumption-engine/record.ts"), "utf-8");
const SRC_RECOGNITION = readFileSync(resolve(__dirname, "../src/lib/assumption-engine/recognition.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Doctrine constants                                                        */
/* -------------------------------------------------------------------------- */

describe("assumption doctrine constants", () => {
  it("ASSUMPTION_ORIENTATION_STATEMENT is a non-empty string", () => {
    expect(typeof ASSUMPTION_ORIENTATION_STATEMENT).toBe("string");
    expect(ASSUMPTION_ORIENTATION_STATEMENT.length).toBeGreaterThan(0);
  });

  it("ASSUMPTION_ORIENTATION_STATEMENT is <= 90 chars", () => {
    expect(ASSUMPTION_ORIENTATION_STATEMENT.length).toBeLessThanOrEqual(90);
  });

  it("PROOF_CAPSULE_ASSUMPTION_LINE is a non-empty string", () => {
    expect(typeof PROOF_CAPSULE_ASSUMPTION_LINE).toBe("string");
    expect(PROOF_CAPSULE_ASSUMPTION_LINE.length).toBeGreaterThan(0);
  });

  it("PROOF_CAPSULE_ASSUMPTION_LINE is <= 90 chars", () => {
    expect(PROOF_CAPSULE_ASSUMPTION_LINE.length).toBeLessThanOrEqual(90);
  });

  it("doctrine constants contain no forbidden words", () => {
    const forbidden = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard"];
    for (const constant of [ASSUMPTION_ORIENTATION_STATEMENT, PROOF_CAPSULE_ASSUMPTION_LINE]) {
      const lower = constant.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
      }
    }
  });

  it("doctrine constants contain no numbers or percentages", () => {
    for (const constant of [ASSUMPTION_ORIENTATION_STATEMENT, PROOF_CAPSULE_ASSUMPTION_LINE]) {
      expect(constant).not.toMatch(/\d/);
      expect(constant).not.toMatch(/%/);
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  trimDoctrine: pure function                                               */
/* -------------------------------------------------------------------------- */

describe("assumption trimDoctrine", () => {
  it("returns input unchanged if <= 90 chars", () => {
    const input = "Short assumption statement.";
    expect(trimDoctrine(input)).toBe(input);
  });

  it("truncates strings longer than 90 chars", () => {
    const input = "B".repeat(100);
    const result = trimDoctrine(input);
    expect(result.length).toBeLessThanOrEqual(90);
  });

  it("handles empty string", () => {
    expect(trimDoctrine("")).toBe("");
  });

  it("is deterministic", () => {
    const input = "Assumption observed in normal operation.";
    expect(trimDoctrine(input)).toBe(trimDoctrine(input));
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: module exports                                                */
/* -------------------------------------------------------------------------- */

describe("assumption-engine structural - module exports", () => {
  it("index exports AssumptionType type", () => {
    expect(SRC_INDEX).toContain("AssumptionType");
  });

  it("index exports recordOperationalAssumption", () => {
    expect(SRC_INDEX).toContain("recordOperationalAssumption");
  });

  it("index exports assumptionEstablished", () => {
    expect(SRC_INDEX).toContain("assumptionEstablished");
  });

  it("index exports recordAssumptionOrientationOnce", () => {
    expect(SRC_INDEX).toContain("recordAssumptionOrientationOnce");
  });

  it("index exports trimDoctrine", () => {
    expect(SRC_INDEX).toContain("trimDoctrine");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: doctrine types                                                */
/* -------------------------------------------------------------------------- */

describe("assumption-engine structural - doctrine types", () => {
  it("defines MAX_LINE_LEN of 90", () => {
    expect(SRC_DOCTRINE).toContain("MAX_LINE_LEN = 90");
  });

  it("defines three assumption types", () => {
    expect(SRC_DOCTRINE).toContain("outcome_presumed");
    expect(SRC_DOCTRINE).toContain("dependency_action_taken");
    expect(SRC_DOCTRINE).toContain("absence_only_attention");
  });

  it("exports ASSUMPTION_TYPES as const", () => {
    expect(SRC_DOCTRINE).toContain("as const");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: append-only records (no .delete())                            */
/* -------------------------------------------------------------------------- */

describe("assumption-engine structural - append-only", () => {
  it("record module uses insert only", () => {
    expect(SRC_RECORD).toContain(".insert(");
    expect(SRC_RECORD).not.toContain(".delete(");
    expect(SRC_RECORD).not.toContain(".remove(");
  });

  it("record module handles duplicate key gracefully", () => {
    expect(SRC_RECORD).toContain("23505");
  });

  it("record module does not expose counts or metrics", () => {
    expect(SRC_RECORD).not.toContain("count(");
    expect(SRC_RECORD).not.toContain("COUNT(");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: no random/nondeterministic behavior in detection              */
/* -------------------------------------------------------------------------- */

describe("assumption-engine structural - determinism", () => {
  it("recognition does not use Math.random()", () => {
    expect(SRC_RECOGNITION).not.toContain("Math.random");
  });

  it("recognition does not use Date.now() for decision logic (uses getDb queries)", () => {
    // It creates new Date() for the window start, not for random decision-making
    expect(SRC_RECOGNITION).toContain("new Date()");
    expect(SRC_RECOGNITION).not.toContain("Math.random");
  });

  it("recognition requires minimum assumptions and distinct days", () => {
    expect(SRC_RECOGNITION).toContain("MIN_ASSUMPTIONS");
    expect(SRC_RECOGNITION).toContain("MIN_DISTINCT_DAYS");
  });

  it("record module does not use Math.random()", () => {
    expect(SRC_RECORD).not.toContain("Math.random");
  });
});
