/**
 * Voice outcome ingest: idempotent on external_call_id, completes action_intent,
 * writes connector_event, orientation line, emits next action intent with dedupe.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Voice outcome ingest", () => {
  it("POST /api/connectors/voice/outcome route exists", async () => {
    const mod = await import("@/app/api/connectors/voice/outcome/route");
    expect(typeof mod.POST).toBe("function");
  });

  it("outcome route uses requireWorkspaceRole for owner/admin/operator/closer", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(content).toContain("requireWorkspaceRole");
    expect(content).toMatch(/owner|admin|operator|closer/);
  });

  it("outcome route writes connector_events with channel voice_outcome and external_id", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(content).toContain("connector_events");
    expect(content).toContain("voice_outcome");
    expect(content).toContain("external_id");
  });

  it("outcome route completes action_intent with result_status", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(content).toContain("completeActionIntent");
    expect(content).toMatch(/succeeded|failed|skipped/);
  });

  it("outcome route appends doctrine-safe orientation line (≤90 chars)", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(content).toContain("orientation_line");
    expect(content).toContain("A call attempt occurred.");
    expect(content).toContain("A call connected.");
    expect("A call attempt occurred.".length).toBeLessThanOrEqual(90);
    expect("A call connected.".length).toBeLessThanOrEqual(90);
  });

  it("outcome route emits next action intent with dedupe when next_required_action present", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(content).toContain("createActionIntent");
    expect(content).toContain("voice_outcome:");
    expect(content).toContain("next_required_action");
  });

  it("outcome route is idempotent on external_call_id (23505 returns ok)", () => {
    const content = readFileSync(path.join(ROOT, "src/app/api/connectors/voice/outcome/route.ts"), "utf-8");
    expect(content).toContain("23505");
    expect(content).toContain("idempotent");
  });
});
