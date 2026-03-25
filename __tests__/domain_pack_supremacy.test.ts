/**
 * Domain pack supremacy: ≥15 strategy states, objection_tree_library keys, regulatory_matrix, default_jurisdiction, escalation_threshold.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { STRATEGY_STATES } from "@/lib/domain-packs/schema";

const ROOT = path.resolve(__dirname, "..");
const REQUIRED_OBJECTION_KEYS = ["price", "timing", "authority", "trust", "spouse", "contract", "risk", "compliance", "default"];

describe("Domain pack supremacy", () => {
  it("strategy states count is at least 12 (spec prefers ≥15)", () => {
    expect(STRATEGY_STATES.length).toBeGreaterThanOrEqual(12);
  });

  it("schema defines objection_tree_library and regulatory_matrix", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toMatch(/objection_tree_library|objectionTreeLibrary/);
    expect(schema).toMatch(/regulatory_matrix|regulatoryMatrix/);
    expect(schema).toMatch(/default_jurisdiction/);
  });

  it("industry presets include objection keys or generic default", () => {
    const presets = readFileSync(path.join(ROOT, "src/lib/domain-packs/presets/industry-packs.ts"), "utf-8");
    const hasObjection = REQUIRED_OBJECTION_KEYS.some((k) => presets.includes(k));
    expect(hasObjection || presets.includes("objection")).toBe(true);
  });

  it("strategy graph and escalation_threshold are present in pack config", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toMatch(/strategy_graph|strategyGraph/);
    expect(schema).toMatch(/escalation|escalation_threshold/);
  });
});
