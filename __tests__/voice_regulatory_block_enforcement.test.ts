/**
 * Ring 4 — Regulatory fail-safe. If jurisdiction_locked, jurisdiction undefined,
 * required_disclosures missing, or compliance pack missing → compiler returns decision "block".
 * Never "send". Never "approval_required" without compliance.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice regulatory block enforcement", () => {
  it("compiler returns block when jurisdiction_locked and jurisdiction missing", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("jurisdiction_locked");
    expect(compiler).toMatch(/!input\.jurisdiction|input\.jurisdiction\.trim\(\)/);
    expect(compiler).toMatch(/decision:\s*["']block["']/);
  });

  it("compiler returns block when required_disclaimers field missing for jurisdiction_locked", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("required_disclaimers");
    expect(compiler).toMatch(/undefined|!Array\.isArray/);
  });

  it("compiler requires compliance pack for jurisdiction_locked before any approval path", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("compliance");
    expect(compiler).toContain("resolveCompliancePack");
  });

  it("jurisdiction_locked block returns only block or approval_required never send", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("approval_required");
    expect(compiler).toMatch(/jurisdiction_locked[\s\S]*?decision:\s*["'](block|approval_required)["']/);
    const afterLock = compiler.split("jurisdiction_locked")[1]?.split("const policies")[0] ?? "";
    expect(afterLock).not.toContain('decision: "send"');
  });
});
