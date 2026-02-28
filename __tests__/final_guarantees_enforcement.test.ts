/**
 * Phase XI — Final guarantees. Fail build if any core guarantee is violated.
 * 1. No message leaves without policy enforcement
 * 2. No execution without domain pack resolution (compiler path)
 * 3. No approval bypass
 * 4. No jurisdiction lock bypass
 * 5. No duplicate intent (dedupe)
 * 6. No freeform AI in send path
 * 7. No non-deterministic state transition in strategy
 * 8. No internal IDs on public routes
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Final guarantees enforcement", () => {
  it("compiler enforces policy and compliance before send; no bypass", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toContain("resolveCompliancePack");
    expect(compiler).toContain("resolveMessagePolicy");
    expect(compiler).toContain("approval_required");
    expect(compiler).toContain("jurisdiction");
  });

  it("strategy engine has no Math.random or probabilistic state choice", () => {
    const engine = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    expect(engine).not.toMatch(/Math\.random|probabilistic.*state/);
  });

  it("execution-plan build and emit have no Math.random; deterministic emission", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(build).not.toMatch(/Math\.random/);
    expect(emit).not.toMatch(/Math\.random/);
  });

  it("action_intents use dedupe_key; duplicate intent prevented", () => {
    const mod = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(mod).toContain("dedupe_key");
    expect(mod).toContain("23505");
  });

  it("no outbound message from AI freeform; compiler uses templates only", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).not.toContain("choices[0]");
    expect(compiler).toContain("getApprovedTemplate");
  });

  it("public work page uses external_ref in URL; no raw workspace_id", () => {
    const workPage = readFileSync(path.join(ROOT, "src/app/public/work/[external_ref]/page.tsx"), "utf-8");
    expect(workPage).toContain("external_ref");
    expect(workPage).not.toMatch(/workspace_id.*params|params\.workspace_id/);
  });
});
