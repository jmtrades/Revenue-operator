/**
 * Ring 2 — Deterministic state machine. No Math.random, no state skipping,
 * no silent close without confirmation, no unauthorized transitions.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice state machine integrity", () => {
  it("strategy engine has no Math.random or random state choice", () => {
    const engine = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    expect(engine).not.toMatch(/Math\.random|Math\.random\(\)/);
    expect(engine).not.toMatch(/\brandom\s*\(\s*\)|state\s*=\s*.*random|random\s*.*state\s*=/);
  });

  it("strategy engine validates transitions against allowed states", () => {
    const engine = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    expect(engine).toMatch(/transition_rules|suggested_state_transition|states\[/);
  });

  it("no state skipping in strategy engine", () => {
    const engine = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    expect(engine).not.toMatch(/skip.*state|state.*skip|bypass.*state/);
  });

  it("execution-plan build does not use Math.random", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).not.toMatch(/Math\.random/);
  });

  it("allowed_states or transition_rules define valid transitions", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toContain("transition_rules");
    expect(schema).toContain("allowed_intents");
  });
});
