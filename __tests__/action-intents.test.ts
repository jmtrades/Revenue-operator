/**
 * Structural tests for src/lib/action-intents/index.ts
 * Verifies: exports, append-only invariant, no .delete(), IntentType union.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const src = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");

describe("action-intents module shape", () => {
  it("exports createActionIntent", () => {
    expect(src).toContain("export async function createActionIntent");
  });

  it("exports claimNextActionIntent", () => {
    expect(src).toContain("export async function claimNextActionIntent");
  });

  it("exports completeActionIntent", () => {
    expect(src).toContain("export async function completeActionIntent");
  });

  it("exports IntentType type", () => {
    expect(src).toContain("export type IntentType");
  });

  it("exports ResultStatus type", () => {
    expect(src).toContain("export type ResultStatus");
  });

  it("exports CreateActionIntentInput interface", () => {
    expect(src).toContain("export interface CreateActionIntentInput");
  });

  it("exports ActionIntentRow interface", () => {
    expect(src).toContain("export interface ActionIntentRow");
  });
});

describe("action-intents architectural invariants", () => {
  it("never uses .delete() — append-only", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });

  it("does not call external APIs (Stripe/Twilio/Calendar)", () => {
    expect(src).not.toContain("stripe");
    expect(src).not.toContain("twilio");
    expect(src).not.toContain("calendar");
  });

  it("handles unique violation 23505 for idempotent create", () => {
    expect(src).toContain("23505");
  });

  it("claims intents atomically with claimed_at IS NULL check", () => {
    expect(src).toContain("claimed_at");
    expect(src).toMatch(/is\(\s*"claimed_at"\s*,\s*null\s*\)/);
  });

  it("IntentType includes core action types", () => {
    const expectedTypes = [
      "send_public_record_link",
      "request_counterparty_action",
      "create_followup_commitment",
      "human_review_required",
      "place_outbound_call",
      "send_message",
      "schedule_followup",
      "escalate_to_human",
    ];
    for (const t of expectedTypes) {
      expect(src).toContain(`"${t}"`);
    }
  });

  it("ResultStatus includes succeeded, failed, skipped", () => {
    expect(src).toContain('"succeeded"');
    expect(src).toContain('"failed"');
    expect(src).toContain('"skipped"');
  });

  it("createActionIntent requires dedupeKey for idempotency", () => {
    expect(src).toContain("dedupeKey");
    expect(src).toContain("dedupe_key");
  });
});
