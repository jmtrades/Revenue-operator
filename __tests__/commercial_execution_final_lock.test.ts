/**
 * Structural tests: execution-ux external execution detection and lock behavior.
 * Verifies the external-execution module detects stalled intents.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("external execution detection", () => {
  const modulePath = path.join(ROOT, "src/lib/execution-ux/external-execution.ts");

  it("module exists", () => {
    expect(existsSync(modulePath)).toBe(true);
  });

  const src = readFileSync(modulePath, "utf-8");

  it("exports ExternalExecutionIssue interface", () => {
    expect(src).toContain("export interface ExternalExecutionIssue");
  });

  it("exports detectExternalExecutionIssue function", () => {
    expect(src).toContain("export async function detectExternalExecutionIssue");
  });

  it("checks for stalled claimed-but-uncompleted intents", () => {
    expect(src).toContain("claimed_at");
    expect(src).toContain("completed_at");
  });

  it("uses a time window for staleness detection", () => {
    // Should check intents claimed more than N minutes ago
    expect(src).toMatch(/Date\.now\(\)\s*-\s*\d+\s*\*\s*60\s*\*\s*1000/);
  });

  it("returns has_issue: false when no workspace provided", () => {
    expect(src).toContain("has_issue: false");
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

describe("execution-ux state reads governance signals", () => {
  const statePath = path.join(ROOT, "src/lib/execution-ux/state.ts");
  const src = readFileSync(statePath, "utf-8");

  it("reads from /api/enterprise/policies", () => {
    expect(src).toContain("/api/enterprise/policies");
  });

  it("reads from /api/enterprise/approvals", () => {
    expect(src).toContain("/api/enterprise/approvals");
  });

  it("reads billing status", () => {
    expect(src).toContain("/api/dashboard/billing");
  });

  it("handles paused billing status", () => {
    expect(src).toContain('"paused"');
  });

  it("handles past_due billing status", () => {
    expect(src).toContain('"past_due"');
  });
});
