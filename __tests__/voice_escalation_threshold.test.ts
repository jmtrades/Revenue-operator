/**
 * Phase III — Voice escalation thresholds: escalation path exists; no freeform.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice escalation threshold", () => {
  it("domain pack objection tree has escalation_threshold values", () => {
    const packs = readFileSync(path.join(ROOT, "src/lib/domain-packs/presets/industry-packs.ts"), "utf-8");
    expect(packs).toMatch(/escalation_threshold/);
  });

  it("escalate_to_human is a supported intent type", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toContain("escalate_to_human");
  });
});
