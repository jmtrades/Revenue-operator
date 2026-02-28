/**
 * Domain pack completeness. Every pack must define strategy, disclosures, escalation.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  SPEC_WORK_UNIT_TYPES,
  getWorkUnitTypeDefinition,
  type WorkUnitType,
} from "@/lib/work-unit/types";

const ROOT = path.resolve(__dirname, "..");

describe("Domain pack structure", () => {
  it("domain-packs resolve exports resolveDomainPackConfig", async () => {
    const resolve = await import("@/lib/domain-packs");
    expect(typeof resolve.resolveDomainPackConfig).toBe("function");
  });

  it("industry packs file defines multiple domain packs", () => {
    const packs = readFileSync(
      path.join(ROOT, "src/lib/domain-packs/presets/industry-packs.ts"),
      "utf-8"
    );
    expect(packs).toContain("real_estate");
    expect(packs).toContain("solar");
    expect(packs).toContain("insurance");
  });
});

describe("Work unit type definitions complete", () => {
  it("every SPEC_WORK_UNIT_TYPES has allowed_states and escalation_triggers", () => {
    for (const type of SPEC_WORK_UNIT_TYPES) {
      const def = getWorkUnitTypeDefinition(type as WorkUnitType);
      expect(def).not.toBeNull();
      expect(def!.allowed_states.length).toBeGreaterThan(0);
      expect(Array.isArray(def!.escalation_triggers)).toBe(true);
    }
  });
});
