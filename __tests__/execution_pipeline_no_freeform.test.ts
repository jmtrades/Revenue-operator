/**
 * Phase I — No freeform message ever leaves the system. All outbound from templates.
 * Fail build if any path sends AI-generated or hardcoded freeform text as message body.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution pipeline no freeform", () => {
  it("ai/templates fillSlots safe path uses buildMessage (template), not getSafeMessageOnDrift freeform", () => {
    const aiTemplates = readFileSync(path.join(ROOT, "src/lib/ai/templates.ts"), "utf-8");
    expect(aiTemplates).toContain("buildMessage");
    expect(aiTemplates).not.toContain("getSafeMessageOnDrift");
  });

  it("message-drift does not export a freeform fallback used for sending", () => {
    const drift = readFileSync(path.join(ROOT, "src/lib/message-drift.ts"), "utf-8");
    expect(drift).not.toContain("getSafeMessageOnDrift");
  });

  it("delivery provider receives content from caller; does not generate content", () => {
    const provider = readFileSync(path.join(ROOT, "src/lib/delivery/provider.ts"), "utf-8");
    expect(provider).not.toMatch(/choices\[0\]|\.content\s*=|openai\.|completion\./);
  });

  it("execution-plan emit passes payload from compileGovernedMessage; no inline freeform", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).not.toMatch(/content:\s*["'][^"']+["']\s*,|body:\s*["'][^"']{50,}/);
  });
});
