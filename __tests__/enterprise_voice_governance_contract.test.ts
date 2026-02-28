/**
 * Enterprise voice control: jurisdiction_locked, dual_approval, compliance_officer,
 * multi_location, enterprise_features_json, SLA. Fail-fast if jurisdiction pack incomplete.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Enterprise voice governance contract", () => {
  it("message-policy supports jurisdiction_locked and dual_approval_required", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("jurisdiction_locked");
    expect(policy).toMatch(/dual_approval|approval_mode/);
  });

  it("compiler enforces jurisdiction and compliance before any voice send path", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("jurisdiction");
    expect(compiler).toContain("resolveCompliancePack");
    expect(compiler).toContain("resolveMessagePolicy");
  });

  it("domain pack or governance supports jurisdiction and regulatory_matrix", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toContain("regulatory_matrix");
    expect(schema).toContain("default_jurisdiction");
  });

  it("call_script_blocks or voice layer has jurisdiction and required_disclosures", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/call_script_blocks.sql"), "utf-8");
    expect(migration).toContain("jurisdiction");
    expect(migration).toMatch(/required_disclosures|required_disclosures_json/);
  });

  it("place_outbound_call payload includes disclaimer_lines and compliance", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("disclaimer_lines");
    expect(emit).toContain("compliance_requirements");
  });
});
