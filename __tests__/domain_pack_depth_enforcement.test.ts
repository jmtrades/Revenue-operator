/**
 * Phase II — Domain pack supremacy: each pack has sufficient strategy depth.
 * Fail build if any pack has shallow state graph or missing required structure.
 */

import { describe, it, expect } from "vitest";
import { getIndustryPackPreset } from "@/lib/domain-packs/presets/industry-packs";
import { INDUSTRY_PACKS } from "@/lib/domain-packs/presets/industry-packs";

const MIN_STRATEGY_STATES = 15;
const REQUIRED_OBJECTION_TREE_KEYS = ["price", "timing", "authority", "trust", "spouse", "contract", "risk", "compliance"];

describe("Domain pack depth enforcement", () => {
  it("every industry pack has strategy_graph with at least MIN_STRATEGY_STATES states", () => {
    for (const [key, pack] of Object.entries(INDUSTRY_PACKS)) {
      const states = pack?.strategy_graph?.states;
      expect(states, `pack ${key} must have strategy_graph.states`).toBeDefined();
      const count = states ? Object.keys(states).length : 0;
      expect(count, `pack ${key} must have ≥${MIN_STRATEGY_STATES} strategy states`).toBeGreaterThanOrEqual(MIN_STRATEGY_STATES);
    }
  });

  it("getIndustryPackPreset returns pack with strategy_graph for known types", () => {
    const types = ["real_estate", "insurance", "solar", "legal", "b2b_appointment"];
    for (const t of types) {
      const pack = getIndustryPackPreset(t);
      expect(pack, t).not.toBeNull();
      expect(pack!.strategy_graph?.states).toBeDefined();
    }
  });

  it("every industry pack has objection_tree_library with required voice keys", () => {
    for (const [key, pack] of Object.entries(INDUSTRY_PACKS)) {
      const lib = pack?.objection_tree_library;
      expect(lib, `pack ${key} must have objection_tree_library`).toBeDefined();
      for (const k of REQUIRED_OBJECTION_TREE_KEYS) {
        expect(lib![k], `pack ${key} must have objection_tree_library.${k}`).toBeDefined();
        expect(Array.isArray(lib![k])).toBe(true);
      }
    }
  });
});
