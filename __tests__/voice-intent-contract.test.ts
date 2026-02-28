/**
 * Voice intent contract: place_outbound_call payload includes plan.script_blocks, plan.disclaimer_lines, compliance_requirements, trace.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice intent contract", () => {
  it("place_outbound_call intent payload shape includes plan with script_blocks and disclaimer_lines", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("place_outbound_call");
    expect(emit).toContain("plan:");
    expect(emit).toContain("script_blocks");
    expect(emit).toContain("disclaimer_lines");
    expect(emit).toContain("compliance_requirements");
    expect(emit).toContain("trace");
    expect(emit).toMatch(/plan:\s*\{/);
    expect(emit).toMatch(/compliance_requirements:\s*\{/);
    expect(emit).toMatch(/consent_required|quiet_hours_respected|jurisdiction_locked/);
  });

  it("place_outbound_call payload includes phone, domain_type, jurisdiction, plan.script_blocks, plan.disclaimer_lines", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("phone:");
    expect(emit).toContain("domain_type:");
    expect(emit).toContain("jurisdiction:");
    expect(emit).toContain("voicePlan.script_blocks");
    expect(emit).toContain("voicePlan.disclaimer_lines");
  });
});
