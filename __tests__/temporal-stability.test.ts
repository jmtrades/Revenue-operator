/**
 * Temporal Stability: doctrine constants, pure functions, structural guarantees.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

import {
  STATEMENT_PUBLIC_STABILITY,
  STATEMENT_PROOF_STABILITY,
  STATEMENT_PRESENCE_STABILITY,
  MAX_CHARS,
  trimDoctrine,
  MIN_THREADS,
  MIN_DAYS,
} from "@/lib/temporal-stability";

const SRC_INDEX = readFileSync(resolve(__dirname, "../src/lib/temporal-stability/index.ts"), "utf-8");
const SRC_DOCTRINE = readFileSync(resolve(__dirname, "../src/lib/temporal-stability/doctrine.ts"), "utf-8");
const SRC_DETECT = readFileSync(resolve(__dirname, "../src/lib/temporal-stability/detect.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Doctrine constants                                                        */
/* -------------------------------------------------------------------------- */

describe("temporal-stability doctrine constants", () => {
  it("STATEMENT_PUBLIC_STABILITY is a non-empty string", () => {
    expect(typeof STATEMENT_PUBLIC_STABILITY).toBe("string");
    expect(STATEMENT_PUBLIC_STABILITY.length).toBeGreaterThan(0);
  });

  it("STATEMENT_PROOF_STABILITY is a non-empty string", () => {
    expect(typeof STATEMENT_PROOF_STABILITY).toBe("string");
    expect(STATEMENT_PROOF_STABILITY.length).toBeGreaterThan(0);
  });

  it("STATEMENT_PRESENCE_STABILITY is a non-empty string", () => {
    expect(typeof STATEMENT_PRESENCE_STABILITY).toBe("string");
    expect(STATEMENT_PRESENCE_STABILITY.length).toBeGreaterThan(0);
  });

  it("all statements are <= MAX_CHARS (90)", () => {
    expect(STATEMENT_PUBLIC_STABILITY.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(STATEMENT_PROOF_STABILITY.length).toBeLessThanOrEqual(MAX_CHARS);
    expect(STATEMENT_PRESENCE_STABILITY.length).toBeLessThanOrEqual(MAX_CHARS);
  });

  it("MAX_CHARS is 90", () => {
    expect(MAX_CHARS).toBe(90);
  });

  it("doctrine constants contain no forbidden words", () => {
    const forbidden = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard", "assistant"];
    for (const stmt of [STATEMENT_PUBLIC_STABILITY, STATEMENT_PROOF_STABILITY, STATEMENT_PRESENCE_STABILITY]) {
      for (const word of forbidden) {
        expect(stmt.toLowerCase()).not.toMatch(new RegExp(`\\b${word}\\b`, "i"));
      }
    }
  });

  it("doctrine constants contain no numbers or percentages", () => {
    for (const stmt of [STATEMENT_PUBLIC_STABILITY, STATEMENT_PROOF_STABILITY, STATEMENT_PRESENCE_STABILITY]) {
      expect(stmt).not.toMatch(/\d/);
      expect(stmt).not.toMatch(/%/);
    }
  });
});

/* -------------------------------------------------------------------------- */
/*  trimDoctrine: pure function                                               */
/* -------------------------------------------------------------------------- */

describe("temporal-stability trimDoctrine", () => {
  it("returns input unchanged if <= 90 chars", () => {
    const input = "A short statement.";
    expect(trimDoctrine(input)).toBe(input);
  });

  it("truncates strings longer than 90 chars", () => {
    const input = "X".repeat(100);
    const result = trimDoctrine(input);
    expect(result.length).toBeLessThanOrEqual(90);
  });

  it("strips forbidden words from output", () => {
    const result = trimDoctrine("This is your dashboard optimization.");
    expect(result).not.toMatch(/\byour\b/i);
    expect(result).not.toMatch(/\bdashboard\b/i);
    expect(result).not.toMatch(/\boptimize\b/i);
  });

  it("collapses multiple spaces after stripping", () => {
    const result = trimDoctrine("The  your  result.");
    expect(result).not.toMatch(/  /);
  });

  it("handles empty string", () => {
    expect(trimDoctrine("")).toBe("");
  });

  it("is deterministic", () => {
    const input = "Outcomes occurred repeatedly.";
    expect(trimDoctrine(input)).toBe(trimDoctrine(input));
  });
});

/* -------------------------------------------------------------------------- */
/*  Detection thresholds                                                      */
/* -------------------------------------------------------------------------- */

describe("temporal-stability detection thresholds", () => {
  it("MIN_THREADS is at least 2", () => {
    expect(MIN_THREADS).toBeGreaterThanOrEqual(2);
  });

  it("MIN_THREADS is 3", () => {
    expect(MIN_THREADS).toBe(3);
  });

  it("MIN_DAYS is at least 2", () => {
    expect(MIN_DAYS).toBeGreaterThanOrEqual(2);
  });

  it("MIN_DAYS is 2", () => {
    expect(MIN_DAYS).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: module exports and shape                                      */
/* -------------------------------------------------------------------------- */

describe("temporal-stability structural", () => {
  it("index exports all three statements", () => {
    expect(SRC_INDEX).toContain("STATEMENT_PUBLIC_STABILITY");
    expect(SRC_INDEX).toContain("STATEMENT_PROOF_STABILITY");
    expect(SRC_INDEX).toContain("STATEMENT_PRESENCE_STABILITY");
  });

  it("index exports StabilityType", () => {
    expect(SRC_INDEX).toContain("StabilityType");
  });

  it("index exports upsertStabilityRecord", () => {
    expect(SRC_INDEX).toContain("upsertStabilityRecord");
  });

  it("index exports runTemporalStabilityDetectors", () => {
    expect(SRC_INDEX).toContain("runTemporalStabilityDetectors");
  });

  it("index exports signal functions", () => {
    expect(SRC_INDEX).toContain("workspaceHasTemporalStability");
    expect(SRC_INDEX).toContain("workspaceHasMultiDayStability");
    expect(SRC_INDEX).toContain("workspaceHadStabilityInPeriod");
  });

  it("index provides legacy aliases", () => {
    expect(SRC_INDEX).toContain("STATEMENT_WORK_CONSISTENT_ACROSS_OCCASIONS");
    expect(SRC_INDEX).toContain("STATEMENT_OUTCOME_OCCURRED_REPEATEDLY");
    expect(SRC_INDEX).toContain("STATEMENT_SIMILAR_OUTCOMES_SEPARATE_OCCASIONS");
    expect(SRC_INDEX).toContain("refreshTemporalStabilityForWorkspace");
  });

  it("doctrine defines four stability types", () => {
    expect(SRC_DOCTRINE).toContain("repeated_resolution");
    expect(SRC_DOCTRINE).toContain("repeated_confirmation");
    expect(SRC_DOCTRINE).toContain("repeated_settlement");
    expect(SRC_DOCTRINE).toContain("repeated_followthrough");
  });

  it("detect module uses UTC date truncation", () => {
    expect(SRC_DETECT).toContain("slice(0, 10)");
  });

  it("detect module enforces MIN_THREADS and MIN_DAYS", () => {
    expect(SRC_DETECT).toContain("MIN_THREADS");
    expect(SRC_DETECT).toContain("MIN_DAYS");
  });

  it("detect module uses 7-day window", () => {
    expect(SRC_DETECT).toContain("WINDOW_DAYS = 7");
  });

  it("detect module does not use Math.random()", () => {
    expect(SRC_DETECT).not.toContain("Math.random");
  });

  it("detect module does not delete records", () => {
    expect(SRC_DETECT).not.toContain(".delete(");
  });
});
