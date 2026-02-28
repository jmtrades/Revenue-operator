/**
 * A4) Governance enforcement: no bypass. Locked jurisdiction, forbidden phrase blocks, disclaimers appended.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Governance no bypass", () => {
  it("compiler goes through message policy, compliance pack, disclaimer append, forbidden phrase check, approval gate", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("resolveMessagePolicy");
    expect(compiler).toContain("resolveCompliancePack");
    expect(compiler).toMatch(/required_disclaimers|disclaimer_lines/);
    expect(compiler).toMatch(/forbidden_phrases|containsForbiddenLanguage/);
    expect(compiler).toContain("approval_required");
    expect(compiler).toContain("createMessageApproval");
  });

  it("approval_required path creates approval row and never sends", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toMatch(/approval_mode\s*===\s*["']approval_required["']/);
    expect(compiler).toContain("createMessageApproval");
    expect(compiler).toMatch(/decision:\s*["']approval_required["']/);
  });

  it("preview_required returns preview payload and does not send", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("preview_required");
    expect(compiler).toMatch(/decision:\s*["']preview_required["']/);
  });

  it("jurisdiction_locked and compliance pack completeness: compiler blocks when policy requires", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("approval_mode");
    expect(compiler).toContain("block");
    expect(compiler).toContain("resolveCompliancePack");
  });

  it("forbidden phrase in message blocks send", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toMatch(/forbidden_phrases|policyChecks\.push.*forbidden/);
    expect(compiler).toMatch(/decision:\s*["']block["']/);
  });

  it("disclaimers appended for regulated intents", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toMatch(/disclaimerLines|required_disclaimers|disclaimer_lines/);
    expect(compiler).toMatch(/rendered\s*=.*suffix|join.*\\n/);
  });
});
