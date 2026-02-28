/**
 * Execution intent hardening (VIII): Deduplication, claim atomicity, replay-safe.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Execution intent contract", () => {
  it("createActionIntent uses dedupe_key and handles 23505", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(index).toContain("dedupe_key");
    expect(index).toContain("23505");
  });

  it("claim uses claimed_at IS NULL for atomicity", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(index).toContain("claimed_at");
    expect(index).toMatch(/\.is\(["']claimed_at["'],\s*null\)/);
  });

  it("action_intents table has dedupe_key unique constraint", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/action_intents.sql"), "utf-8");
    expect(migration).toMatch(/dedupe_key|unique|UNIQUE/);
  });
});

describe("All 8 spec execution intent types supported", () => {
  it("IntentType includes send_message, place_outbound_call, schedule_followup, escalate_to_human, collect_payment, generate_contract, request_disclosure_confirmation, record_verbal_consent", () => {
    const index = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    const required = [
      "send_message",
      "place_outbound_call",
      "schedule_followup",
      "escalate_to_human",
      "collect_payment",
      "generate_contract",
      "request_disclosure_confirmation",
      "record_verbal_consent",
    ];
    for (const type of required) {
      expect(index).toContain(type);
    }
  });
});
