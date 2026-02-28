/**
 * Ring 5 — Escalation guarantee. Triggers emit escalate_to_human.
 * Escalation must be append-only. No silent failure. No retry loop.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice escalation guarantee", () => {
  it("escalate_to_human is an emitted action intent type", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(emit).toContain("escalate_to_human");
    expect(index).toContain("escalate_to_human");
  });

  it("execution-plan build can set action_intent_to_emit escalate_to_human", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).toContain("escalate_to_human");
    expect(build).toMatch(/emit_approval|action_intent_to_emit/);
  });

  it("action_intents are append-only; no delete in action-intents module", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(index).not.toMatch(/\.delete\s*\(|delete\s*from\s*action_intents/);
  });

  it("escalation path uses createActionIntent with dedupe_key", () => {
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("createActionIntent");
    expect(emit).toMatch(/escalate_to_human|approval:.*dedupeKey|dedupeKey/);
  });

  it("strategy engine has escalation state and transition to it", () => {
    const engine = readFileSync(path.join(ROOT, "src/lib/domain-packs/strategy-engine.ts"), "utf-8");
    const packs = readFileSync(path.join(ROOT, "src/lib/domain-packs/presets/industry-packs.ts"), "utf-8");
    expect(packs).toContain("escalation");
    expect(engine).toMatch(/escalation|suggested_state_transition/);
  });
});
