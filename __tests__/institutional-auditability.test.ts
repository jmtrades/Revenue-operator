/**
 * Institutional auditability: amendment recorded only when relied upon.
 * No amendment before reliance. Statements ≤90 chars. Deterministic. Settlement gating uses amendment state.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  threadIsReliedUpon,
  recordThreadAmendment,
  threadHasAmendment,
  workspaceHasAmendmentInLast24h,
  workspaceHasReliedThreadWithAmendment,
  STATEMENT_RECORD_UPDATED_AFTER_RELIANCE,
  STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES,
  STATEMENT_EARLIER_ACTIVITY_AMENDED,
} from "@/lib/institutional-auditability";

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "src", "lib", "institutional-auditability", "index.ts");
const SETTLEMENT = path.join(ROOT, "src", "lib", "operational-perception", "settlement-context.ts");
const MAX_LEN = 90;
const FORBIDDEN = /\b(you should|please|click|blame|actor|technical)\b/i;

describe("Institutional auditability contract", () => {
  it("statements are ≤90 chars", () => {
    expect(STATEMENT_RECORD_UPDATED_AFTER_RELIANCE.length).toBeLessThanOrEqual(MAX_LEN);
    expect(STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES.length).toBeLessThanOrEqual(MAX_LEN);
    expect(STATEMENT_EARLIER_ACTIVITY_AMENDED.length).toBeLessThanOrEqual(MAX_LEN);
  });

  it("deterministic wording (no forbidden language)", () => {
    expect(FORBIDDEN.test(STATEMENT_RECORD_UPDATED_AFTER_RELIANCE)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_PAST_ACTIVITY_POST_RELIANCE_UPDATES)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_EARLIER_ACTIVITY_AMENDED)).toBe(false);
  });

  it("amendment recorded only when relied (recordThreadAmendment called by callers when relied)", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("recordThreadAmendment");
    expect(content).toContain("threadIsReliedUpon");
  });

  it("no amendment before reliance (callers check threadIsReliedUpon before recording)", () => {
    const sharedContent = readFileSync(
      path.join(ROOT, "src/lib/shared-transaction-assurance/index.ts"),
      "utf-8"
    );
    expect(sharedContent).toContain("reliedBefore");
    expect(sharedContent).toMatch(/threadIsReliedUpon.*transactionId/);
  });

  it("settlement gating uses amendment state (no activation when amendment in last 24h)", () => {
    const content = readFileSync(SETTLEMENT, "utf-8");
    expect(content).toContain("workspaceHasAmendmentInLast24h");
    expect(content).toContain("amendmentInLast24h");
    expect(content).toMatch(/if\s*\(\s*amendmentInLast24h\s*\)\s*return\s*false/);
  });

  it("exports threadIsReliedUpon and recordThreadAmendment", () => {
    expect(typeof threadIsReliedUpon).toBe("function");
    expect(typeof recordThreadAmendment).toBe("function");
    expect(typeof threadHasAmendment).toBe("function");
    expect(typeof workspaceHasAmendmentInLast24h).toBe("function");
    expect(typeof workspaceHasReliedThreadWithAmendment).toBe("function");
  });

  it("threadIsReliedUpon checks cross-party, dependency, reference, evidence, responsibility", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("crossPartyRelianceEstablished");
    expect(content).toContain("outcome_dependencies");
    expect(content).toContain("thread_reference_memory");
    expect(content).toContain("thread_evidence");
    expect(content).toContain("operational_responsibilities");
  });

  it("thread_amendments table is append-only (no delete in module)", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).not.toMatch(/\.delete\s*\(/);
  });
});
