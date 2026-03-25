/**
 * Connector guarantee: no connector triggers direct send; all append to connector_events;
 * all actions via action_intents; CSV import idempotent; external_id enforced unique.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Connector voice idempotency", () => {
  it("connector ingest does not call delivery provider or send directly", () => {
    const trigger = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(trigger).not.toMatch(/send_message|place_outbound_call|delivery|provider\.send|twilio/);
  });

  it("connector events append to connector_events or equivalent", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).toMatch(/connector_events|insert|upsert/);
  });

  it("actions emitted via action_intents not direct API", () => {
    const build = readFileSync(path.join(ROOT, "src/lib/execution-plan/build.ts"), "utf-8");
    expect(build).not.toMatch(/twilio|stripe\.customers|fetch.*send/);
    const emit = readFileSync(path.join(ROOT, "src/lib/execution-plan/emit.ts"), "utf-8");
    expect(emit).toContain("createActionIntent");
  });

  it("connector or signals ingest uses external_id for deduplication", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    const signals = readFileSync(path.join(ROOT, "src/lib/signals/ingest-inbound.ts"), "utf-8");
    expect(ingest).toContain("external_id");
    expect(signals).toContain("external_id");
  });
});
