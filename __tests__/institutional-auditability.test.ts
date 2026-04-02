/**
 * Structural tests for src/lib/institutional-auditability/index.ts
 * Verifies: amendment recording, reliance detection, append-only, no blame.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const src = readFileSync(path.join(ROOT, "src/lib/institutional-auditability/index.ts"), "utf-8");

describe("institutional-auditability module shape", () => {
  it("exports AmendmentType type", () => {
    expect(src).toContain("export type AmendmentType");
  });

  it("exports threadIsReliedUpon", () => {
    expect(src).toContain("export async function threadIsReliedUpon");
  });

  it("exports recordThreadAmendment", () => {
    expect(src).toContain("export async function recordThreadAmendment");
  });

  it("exports threadHasAmendment", () => {
    expect(src).toContain("export async function threadHasAmendment");
  });

  it("exports workspaceHasAmendmentInLast24h", () => {
    expect(src).toContain("export async function workspaceHasAmendmentInLast24h");
  });

  it("exports workspaceHasReliedThreadWithAmendment", () => {
    expect(src).toContain("export async function workspaceHasReliedThreadWithAmendment");
  });

  it("exports getAmendmentLinesForThread", () => {
    expect(src).toContain("export async function getAmendmentLinesForThread");
  });
});

describe("institutional-auditability constants", () => {
  it("exports STATEMENT_RECORD_UPDATED_AFTER_RELIANCE", () => {
    expect(src).toContain("export const STATEMENT_RECORD_UPDATED_AFTER_RELIANCE");
  });

  it("exports STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES", () => {
    expect(src).toContain("export const STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES");
  });

  it("exports STATEMENT_EARLIER_ACTIVITY_AMENDED", () => {
    expect(src).toContain("export const STATEMENT_EARLIER_ACTIVITY_AMENDED");
  });

  it("all statement constants are <=90 chars", () => {
    const statementMatches = src.matchAll(/export const (STATEMENT_\w+)\s*=\s*\n?\s*"([^"]+)"/g);
    for (const match of statementMatches) {
      expect(match[2].length).toBeLessThanOrEqual(90);
    }
  });
});

describe("institutional-auditability invariants", () => {
  it("AmendmentType includes state_change, outcome_change, evidence_change, responsibility_change", () => {
    expect(src).toContain('"state_change"');
    expect(src).toContain('"outcome_change"');
    expect(src).toContain('"evidence_change"');
    expect(src).toContain('"responsibility_change"');
  });

  it("never uses .delete() — append-only", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });

  it("caps amendment summary to 200 chars", () => {
    expect(src).toContain(".slice(0, 200)");
  });

  it("amendment log line is <=90 chars", () => {
    const match = src.match(/AMENDMENT_LOG_LINE\s*=\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1].length).toBeLessThanOrEqual(90);
  });

  it("records to thread_amendments table", () => {
    expect(src).toContain("thread_amendments");
  });

  it("checks cross-party reliance for thread reliance detection", () => {
    expect(src).toContain("crossPartyRelianceEstablished");
  });

  it("checks outcome_dependencies for reliance", () => {
    expect(src).toContain("outcome_dependencies");
  });

  it("checks thread_reference_memory for reliance", () => {
    expect(src).toContain("thread_reference_memory");
  });

  it("checks thread_evidence with counterparty/downstream roles", () => {
    expect(src).toContain("thread_evidence");
    expect(src).toContain('"counterparty"');
    expect(src).toContain('"downstream"');
  });
});
