/**
 * Record Reference: structural tests for types, exports, and behavioral guarantees.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const SRC_INDEX = readFileSync(resolve(__dirname, "../src/lib/record-reference/index.ts"), "utf-8");
const SRC_TYPES = readFileSync(resolve(__dirname, "../src/lib/record-reference/types.ts"), "utf-8");
const SRC_RECORD = readFileSync(resolve(__dirname, "../src/lib/record-reference/record.ts"), "utf-8");

/* -------------------------------------------------------------------------- */
/*  Module exports                                                            */
/* -------------------------------------------------------------------------- */

describe("record-reference - module exports", () => {
  it("exports RecordReferenceActor type", () => {
    expect(SRC_INDEX).toContain("RecordReferenceActor");
  });

  it("exports RecordReferenceType type", () => {
    expect(SRC_INDEX).toContain("RecordReferenceType");
  });

  it("exports recordRecordReference function", () => {
    expect(SRC_INDEX).toContain("recordRecordReference");
  });

  it("exports countReferencesInLastDays function", () => {
    expect(SRC_INDEX).toContain("countReferencesInLastDays");
  });

  it("exports hasReferenceAcrossDays function", () => {
    expect(SRC_INDEX).toContain("hasReferenceAcrossDays");
  });

  it("exports getRecordReferenceLinesInLastDays function", () => {
    expect(SRC_INDEX).toContain("getRecordReferenceLinesInLastDays");
  });
});

/* -------------------------------------------------------------------------- */
/*  Type definitions                                                          */
/* -------------------------------------------------------------------------- */

describe("record-reference - type definitions", () => {
  it("RecordReferenceActor has three values", () => {
    expect(SRC_TYPES).toContain('"staff"');
    expect(SRC_TYPES).toContain('"customer"');
    expect(SRC_TYPES).toContain('"counterparty"');
  });

  it("RecordReferenceType has three values", () => {
    expect(SRC_TYPES).toContain('"public_record"');
    expect(SRC_TYPES).toContain('"dashboard_record"');
    expect(SRC_TYPES).toContain('"ack_flow"');
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: record module                                                 */
/* -------------------------------------------------------------------------- */

describe("record-reference - record module structure", () => {
  it("uses insert for recording references (append-only)", () => {
    expect(SRC_RECORD).toContain(".insert(");
  });

  it("does not delete records", () => {
    expect(SRC_RECORD).not.toContain(".delete(");
    expect(SRC_RECORD).not.toContain(".remove(");
  });

  it("records to record_reference_events table", () => {
    expect(SRC_RECORD).toContain('"record_reference_events"');
  });

  it("includes recorded_at timestamp on insert", () => {
    expect(SRC_RECORD).toContain("recorded_at");
    expect(SRC_RECORD).toContain("new Date().toISOString()");
  });

  it("enforces MAX_LINE_LEN of 90 for reference lines", () => {
    expect(SRC_RECORD).toContain("MAX_LINE_LEN = 90");
  });

  it("trim function caps at MAX_LINE_LEN", () => {
    expect(SRC_RECORD).toContain("function trim");
    expect(SRC_RECORD).toContain("MAX_LINE_LEN");
  });

  it("hasReferenceAcrossDays requires >= 2 distinct days", () => {
    expect(SRC_RECORD).toContain("daysWithRef.size >= 2");
  });

  it("getRecordReferenceLinesInLastDays deduplicates lines", () => {
    expect(SRC_RECORD).toContain("new Set(lines)");
  });

  it("does not use Math.random()", () => {
    expect(SRC_RECORD).not.toContain("Math.random");
  });
});

/* -------------------------------------------------------------------------- */
/*  Reference line content                                                    */
/* -------------------------------------------------------------------------- */

describe("record-reference - reference line content", () => {
  it("defines REFERENCE_LINES mapping for all types", () => {
    expect(SRC_RECORD).toContain("public_record");
    expect(SRC_RECORD).toContain("dashboard_record");
    expect(SRC_RECORD).toContain("ack_flow");
  });

  it("reference lines are factual and contain no forbidden words", () => {
    const forbidden = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard"];
    // Extract the REFERENCE_LINES values from source
    const lineMatches = SRC_RECORD.match(/"[^"]*participant[^"]*"/g) ?? [];
    for (const line of lineMatches) {
      const lower = line.toLowerCase();
      for (const word of forbidden) {
        expect(lower).not.toMatch(new RegExp(`\\b${word}\\b`));
      }
    }
  });
});
