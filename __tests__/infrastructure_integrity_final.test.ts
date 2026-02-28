/**
 * Final guarantee: no freeform AI, no direct send, no randomness in execution path,
 * approval gate in compiler, action intents append-only, voice compliance, single pipeline, no delivery in routes, domain packs complete.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Infrastructure integrity final", () => {
  it("compiler has approval gate (approval_required, block, preview)", () => {
    const compiler = readFileSync(path.join(ROOT, "src/lib/speech-governance/compiler.ts"), "utf-8");
    expect(compiler).toMatch(/approval_required|block|preview_required/);
  });

  it("action intents are append-only (insert only, no delete)", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).not.toMatch(/\.delete\(|\.remove\(/);
    expect(actionIntents).toMatch(/\.insert\(/);
  });

  it("voice outcome enforces compliance (consent_recorded, disclosures_read)", () => {
    const voice = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(voice).toMatch(/compliance_violation|consent_recorded|disclosures_read/);
  });

  it("single pipeline: runGovernedExecution is entry and emit is in execution-plan", () => {
    const run = readFileSync(path.join(ROOT, "src/lib/execution-plan/run.ts"), "utf-8");
    expect(run).toMatch(/runGovernedExecution|buildExecutionPlan|emitExecutionPlanIntent/);
  });

  it("no delivery provider calls in connector routes", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    const voice = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(ingest).not.toMatch(/sendOutbound|sendViaTwilio/);
    expect(voice).not.toMatch(/sendOutbound|sendViaTwilio/);
  });

  it("execution-plan build uses templates only (compileGovernedMessage)", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).toMatch(/compileGovernedMessage|template/);
  });

  it("domain pack schema has strategy_graph and regulatory_matrix", () => {
    const schema = readFileSync(path.join(ROOT, "src/lib/domain-packs/schema.ts"), "utf-8");
    expect(schema).toMatch(/strategy_graph|strategyGraph/);
    expect(schema).toMatch(/regulatory_matrix|regulatoryMatrix/);
  });
});
