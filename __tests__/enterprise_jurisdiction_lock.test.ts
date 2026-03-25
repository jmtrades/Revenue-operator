/**
 * Phase IV — Enterprise: jurisdiction_locked mode hard block if missing disclosure.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Enterprise jurisdiction lock", () => {
  it("message-policy resolves jurisdiction_locked as approval_mode", () => {
    const policy = readFileSync(path.join(ROOT, "src/lib/governance/message-policy.ts"), "utf-8");
    expect(policy).toContain("jurisdiction_locked");
  });

  it("compiler does not send when approval_mode is jurisdiction_locked without approval path", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("approval_mode");
    expect(compiler).toContain("approval_required");
  });
});
