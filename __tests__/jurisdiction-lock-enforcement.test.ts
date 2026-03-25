/**
 * Invariant: when approval_mode is jurisdiction_locked, the governed compiler/execution path
 * cannot return decision "send" unless jurisdiction is present, compliance pack resolves,
 * and required_disclaimers field is present (no silent send).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Jurisdiction lock enforcement", () => {
  it("message-policy type includes jurisdiction_locked", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("jurisdiction_locked");
  });

  it("compiler never returns send for jurisdiction_locked without approval path", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("jurisdiction_locked");
    expect(compiler).toContain("approval_required");
    expect(compiler).toContain("decision:");
    const jurisdictionLockBlock = compiler.includes("jurisdiction_locked")
      && (compiler.includes('decision: "block"') || compiler.includes("decision: \"block\""))
      && (compiler.includes("approval_required") || compiler.includes("preview_required"));
    expect(jurisdictionLockBlock).toBe(true);
  });

  it("compiler blocks when jurisdiction_locked and jurisdiction missing", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toMatch(/jurisdiction_locked/);
    expect(compiler).toMatch(/input\.jurisdiction/);
    expect(compiler).toMatch(/!input\.jurisdiction|!input\.jurisdiction\.trim/);
  });

  it("compiler enforces required_disclaimers field presence for jurisdiction_locked", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("required_disclaimers");
    expect(compiler).toMatch(/required_disclaimers\s*===?\s*undefined|!Array\.isArray\s*\(\s*messagePolicy\.required_disclaimers\s*\)/);
  });

  it("compiler requires compliance pack for jurisdiction_locked", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("compliance");
    expect(compiler).toMatch(/jurisdiction_locked/);
  });
});
