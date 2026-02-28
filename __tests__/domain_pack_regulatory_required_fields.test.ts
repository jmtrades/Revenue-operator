/**
 * Phase II — Domain pack regulatory matrix: required fields present.
 * Fail build if regulatory_matrix is missing or incomplete for governed execution.
 */

import { describe, it, expect } from "vitest";
import { INDUSTRY_PACKS } from "@/lib/domain-packs/presets/industry-packs";

describe("Domain pack regulatory required fields", () => {
  it("every industry pack has regulatory_matrix", () => {
    for (const [key, pack] of Object.entries(INDUSTRY_PACKS)) {
      expect(pack?.regulatory_matrix, `pack ${key} must have regulatory_matrix`).toBeDefined();
    }
  });

  it("regulatory_matrix has required_disclaimers array (may be empty)", () => {
    for (const pack of Object.values(INDUSTRY_PACKS)) {
      const rm = pack?.regulatory_matrix;
      expect(Array.isArray(rm?.required_disclaimers)).toBe(true);
    }
  });

  it("strategy state definitions have transition_rules array", () => {
    for (const pack of Object.values(INDUSTRY_PACKS)) {
      const states = pack?.strategy_graph?.states ?? {};
      for (const [stateKey, def] of Object.entries(states)) {
        expect(Array.isArray((def as { transition_rules?: unknown }).transition_rules), `state ${stateKey}`).toBe(true);
      }
    }
  });
});
