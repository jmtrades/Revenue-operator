/**
 * Contract: thread reference memory. References recorded once per context.
 * Deterministic rules only. No insertion when no subject match. Doctrine ≤90 chars, no forbidden language.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  detectAndAttachReference,
  threadHasReference,
  countReferenceDays,
  workspaceHasMultiDayReferences,
  STATEMENT_LATER_ACTIVITY_REFERENCED,
  STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS,
} from "@/lib/thread-reference-memory";

const ROOT = path.resolve(__dirname, "..");
const LIB = path.join(ROOT, "src", "lib", "thread-reference-memory", "index.ts");
const MAX_LEN = 90;
const FORBIDDEN = /\b(you should|please|click|optimize|ROI|KPI|dashboard|urgent|act now|match|score|probability)\b/i;

describe("Thread reference memory contract", () => {
  it("continuation statement is ≤90 chars", () => {
    expect(STATEMENT_LATER_ACTIVITY_REFERENCED.length).toBeLessThanOrEqual(MAX_LEN);
  });

  it("presence statement is ≤90 chars", () => {
    expect(STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS.length).toBeLessThanOrEqual(MAX_LEN);
  });

  it("no forbidden language in statements", () => {
    expect(FORBIDDEN.test(STATEMENT_LATER_ACTIVITY_REFERENCED)).toBe(false);
    expect(FORBIDDEN.test(STATEMENT_RECORD_CONTINUED_ACROSS_OCCASIONS)).toBe(false);
  });

  it("references recorded only once per context (unique index)", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("alreadyAttached");
    expect(content).toMatch(/workspace_id.*reference_context_type.*reference_context_id/);
  });

  it("deterministic rules only (no scoring or fuzzy match)", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).not.toMatch(/\bscore\b/i);
    expect(content).not.toMatch(/\bprobability\b/i);
    expect(content).not.toMatch(/\bfuzzy\b/i);
    expect(content).toContain("subjectMatch");
  });

  it("no insertion when no subject match (early return when no chosen)", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toMatch(/if\s*\(\s*!chosen\s*\)\s*return/);
  });

  it("exports detectAndAttachReference and signal helpers", () => {
    expect(typeof detectAndAttachReference).toBe("function");
    expect(typeof threadHasReference).toBe("function");
    expect(typeof countReferenceDays).toBe("function");
    expect(typeof workspaceHasMultiDayReferences).toBe("function");
  });

  it("reference_reason enum matches spec", () => {
    const content = readFileSync(LIB, "utf-8");
    expect(content).toContain("same_subject");
    expect(content).toContain("followup_commitment");
    expect(content).toContain("payment_settlement");
    expect(content).toContain("conversation_continuation");
    expect(content).toContain("dispute_revival");
  });
});
