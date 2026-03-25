/**
 * Scenario auto-override: compliance_shield when risk/hostile/legal; plan-only, no permanent state update.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const BUILD_PATH = path.join(ROOT, "src/lib/execution-plan/build.ts");

describe("Scenario auto-override invariants", () => {
  it("build.ts sets temporary_mode_override when risk/hostile/legal", () => {
    const content = readFileSync(BUILD_PATH, "utf-8");
    expect(content).toContain("temporary_mode_override");
    expect(content).toContain("compliance_shield");
    expect(content).toContain("riskScore > 80");
    expect(content).toContain("emotionalCategoryForCadence === \"hostile\"");
    expect(content).toContain("triageResult.triage_reason === \"compliance_risk\"");
  });

  it("build does not update workspace_scenario_state for override (override in plan only)", () => {
    const content = readFileSync(BUILD_PATH, "utf-8");
    expect(content).toContain("effectiveModeKey = temporary_mode_override ?? useModeKey");
    expect(content).not.toMatch(/workspace_scenario_state.*update|update.*workspace_scenario_state/);
  });

  it("ledger scenario_auto_override is appended when override is set", () => {
    const content = readFileSync(BUILD_PATH, "utf-8");
    expect(content).toContain("scenario_auto_override");
  });
});
