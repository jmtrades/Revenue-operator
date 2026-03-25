/**
 * Compliance pack required fields. Enforcement path must use required_disclaimers, forbidden_phrases, quiet_hours.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Compliance pack usage", () => {
  it("speech-governance compiler uses message policy required_disclaimers and forbidden_phrases", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("required_disclaimers");
    expect(compiler).toContain("forbidden_phrases");
  });

  it("governance compliance-pack is resolved in compiler", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("resolveCompliancePack");
  });

  it("message_policies table has required_disclaimers and forbidden_phrases", () => {
    const content = readFileSync(
      path.join(ROOT, "supabase/migrations/message_policies_compliance_approvals.sql"),
      "utf-8"
    );
    expect(content).toContain("required_disclaimers");
    expect(content).toContain("forbidden_phrases");
  });
});
