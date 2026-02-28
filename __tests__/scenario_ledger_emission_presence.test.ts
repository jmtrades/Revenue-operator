/**
 * Scenario and stop condition ledger emission. String inspection in key routes.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const BUILD = path.join(ROOT, "src/lib/execution-plan/build.ts");
const LEDGER = path.join(ROOT, "src/lib/ops/ledger.ts");

describe("Scenario ledger emission presence", () => {
  it("ledger types include scenario_selected and stop_condition_triggered", () => {
    const content = readFileSync(LEDGER, "utf-8");
    expect(content).toContain("stop_condition_triggered");
    expect(content).toContain("scenario_selected");
    expect(content).toContain("list_purpose_recorded");
  });

  it("build appends stop_condition_triggered when stopReason", () => {
    const content = readFileSync(BUILD, "utf-8");
    expect(content).toContain("stop_condition_triggered");
    expect(content).toContain("appendLedgerEvent");
  });
});
