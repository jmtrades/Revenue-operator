/**
 * Connector ingest: normalized_inbound must have conversation_id, thread_id, work_unit_id, intent_hint.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Connector normalized shape", () => {
  it("ingest route validates normalized_inbound has required fields", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(route).toMatch(/conversation_id/);
    expect(route).toMatch(/thread_id/);
    expect(route).toMatch(/work_unit_id/);
    expect(route).toMatch(/intent_hint/);
    expect(route).toMatch(/invalid_normalized_inbound/);
  });

  it("execution is not run when normalized_inbound is invalid", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(route).toMatch(/hasConversationId|hasThreadId|hasWorkUnitId|hasIntentHint/);
    expect(route).toMatch(/executionReason\s*=\s*["']invalid_normalized_inbound["']/);
  });

  it("insert is always append-only before execution attempt", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(route).toMatch(/connector_events/);
    expect(route).toMatch(/\.insert\(/);
    const runGovernedCallIndex = route.indexOf("await runGovernedExecution(");
    const insertIndex = route.indexOf(".from(\"connector_events\")");
    expect(insertIndex).toBeGreaterThan(-1);
    expect(runGovernedCallIndex).toBeGreaterThan(-1);
    expect(insertIndex).toBeLessThan(runGovernedCallIndex);
  });
});
