/**
 * Phase I — Execution guarantees: deterministic output for identical inputs.
 * Fail build if pipeline allows non-deterministic branching or freeform output.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution pipeline determinism", () => {
  it("speech-governance compiler uses only templates and policy; no random or date-based message content", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).not.toMatch(/Math\.random|Date\.now\(\)|new Date\(\)\.getTime/);
    expect(compiler).toContain("renderTemplate");
    expect(compiler).toContain("getApprovedTemplate");
  });

  it("execution-plan build does not use probabilistic or random logic for message body", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).not.toMatch(/Math\.random|\.choices\[0\]/);
    expect(build).toContain("compileGovernedMessage");
  });

  it("domain pack strategy engine selects state from transition_rules only; no AI-invented state", () => {
    const engine = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    expect(engine).toMatch(/transition_rules|allowed_intents|strategy_graph/);
    expect(engine).not.toMatch(/\.choices|generateText|completion\./);
  });
});
