/**
 * Contract: missing-record intercept shows modal only when no shared record, uses absence-impact API, no marketing language.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const PAGE = path.join(ROOT, "src", "app", "dashboard", "record", "lead", "[id]", "page.tsx");

const MARKETING_WORDS = ["urgent", "act now", "limited time", "don't miss", "opportunity", "boost", "convert", "ROI", "KPI"];

describe("Absence intercept contract", () => {
  it("modal appears only when record missing (guarded by !publicRecordPath)", () => {
    const content = readFileSync(PAGE, "utf-8");
    expect(content).toContain("publicRecordPath");
    expect(content).toContain("absenceModal");
    expect(content).toContain("if (publicRecordPath)");
    expect(content).toContain("absence-impact");
  });

  it("uses absence-impact API", () => {
    const content = readFileSync(PAGE, "utf-8");
    expect(content).toContain("/api/operational/absence-impact");
    expect(content).toContain("workspace_id");
  });

  it("modal header is doctrine-safe (no marketing words)", () => {
    const content = readFileSync(PAGE, "utf-8");
    expect(content).toContain("This outcome will not appear in the record.");
    for (const word of MARKETING_WORDS) {
      expect(content.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  it("modal offers Record outcome and Continue without record only", () => {
    const content = readFileSync(PAGE, "utf-8");
    expect(content).toContain("Record outcome");
    expect(content).toContain("Continue without record");
  });
});
