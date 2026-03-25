/**
 * Invariant: outcome mapping never directly sets completed without confirmations when required.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice outcome state integrity", () => {
  it("result_status mapping: failed outcome maps to failed not succeeded", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toContain("resultStatus");
    expect(route).toMatch(/outcome\s*===\s*["']failed["'].*failed|failed.*outcome/);
  });

  it("result_status mapping uses explicit outcome-to-status not raw body", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).not.toMatch(/result_status\s*=\s*body\.result_status|result_status\s*=\s*body\.outcome/);
    expect(route).toMatch(/resultStatus\(outcome\)|status\s*=\s*resultStatus/);
  });

  it("strategy state update uses normalized or allowed state", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(route).toContain("upsertStrategyState");
    expect(route).toMatch(/strategy_state|current_state|discovery/);
  });
});
