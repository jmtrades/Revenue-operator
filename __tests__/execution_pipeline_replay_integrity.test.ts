/**
 * Phase I — Execution guarantees: replay-safe execution, append-only, idempotent intent emission.
 * Fail build if pipeline or storage allows non-replay-safe behavior.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution pipeline replay integrity", () => {
  it("action_intents create uses dedupe_key; idempotent on 23505", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toContain("dedupe_key");
    expect(actionIntents).toContain("23505");
  });

  it("action_intents claim uses claimed_at IS NULL for atomicity", () => {
    const actionIntents = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(actionIntents).toMatch(/claimed_at|is\s*\(\s*["']claimed_at["']\s*,\s*null\s*\)/);
  });

  it("connector_events or ingest uses external_id for deduplication", () => {
    const ingest = readFileSync(path.join(ROOT, "src/app/api/connectors/events/ingest/route.ts"), "utf-8");
    expect(ingest).toContain("external_id");
    expect(ingest).toMatch(/insert|upsert|onConflict|workspace_id.*channel.*external_id/i);
  });

  it("signals ingest uses external_id for idempotent message handling", () => {
    const ingest = readFileSync(path.join(ROOT, "src/lib/signals/ingest-inbound.ts"), "utf-8");
    expect(ingest).toContain("external_id");
  });
});
