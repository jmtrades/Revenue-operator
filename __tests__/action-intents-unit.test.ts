/**
 * Unit + structural tests for src/lib/action-intents/index.ts and emit.ts
 * Validates module exports, idempotency via dedupe_key, append-only design,
 * atomic claiming, and intent type coverage.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/* ------------------------------------------------------------------ */
/*  Source text for structural assertions                              */
/* ------------------------------------------------------------------ */
const INDEX_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/action-intents/index.ts"),
  "utf-8"
);

const EMIT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, "../src/lib/action-intents/emit.ts"),
  "utf-8"
);

describe("action-intents/index — module exports", () => {
  it("exports createActionIntent function", async () => {
    // Dynamic import to avoid DB connection at module level
    const mod = await import("@/lib/action-intents/index");
    expect(typeof mod.createActionIntent).toBe("function");
  });

  it("exports claimNextActionIntent function", async () => {
    const mod = await import("@/lib/action-intents/index");
    expect(typeof mod.claimNextActionIntent).toBe("function");
  });

  it("exports completeActionIntent function", async () => {
    const mod = await import("@/lib/action-intents/index");
    expect(typeof mod.completeActionIntent).toBe("function");
  });

  it("exports IntentType type (structurally: source defines union)", () => {
    expect(INDEX_SOURCE).toContain("export type IntentType");
  });

  it("exports ResultStatus type", () => {
    expect(INDEX_SOURCE).toContain("export type ResultStatus");
  });

  it("exports ActionIntentRow interface", () => {
    expect(INDEX_SOURCE).toContain("export interface ActionIntentRow");
  });
});

describe("action-intents/index — idempotency via dedupe_key", () => {
  it("CreateActionIntentInput includes dedupeKey field", () => {
    expect(INDEX_SOURCE).toContain("dedupeKey: string");
  });

  it("insert uses dedupe_key in the row", () => {
    expect(INDEX_SOURCE).toContain("dedupe_key: input.dedupeKey");
  });

  it("handles 23505 unique violation gracefully (returns null, does not throw)", () => {
    // Structural: catch block checks for code 23505 and returns null
    expect(INDEX_SOURCE).toContain('"23505"');
    // Must return null, not re-throw
    const catchBlock = INDEX_SOURCE.slice(INDEX_SOURCE.indexOf("23505"));
    expect(catchBlock).toContain("return null");
  });
});

describe("action-intents/index — append-only (no deletes)", () => {
  it("source contains no .delete() calls", () => {
    expect(INDEX_SOURCE).not.toContain(".delete(");
  });

  it("emit source contains no .delete() calls", () => {
    expect(EMIT_SOURCE).not.toContain(".delete(");
  });
});

describe("action-intents/index — atomic claiming", () => {
  it("claimNextActionIntent checks claimed_at IS NULL on select", () => {
    // The select query filters for unclaimed intents
    expect(INDEX_SOURCE).toContain('.is("claimed_at", null)');
  });

  it("claimNextActionIntent checks claimed_at IS NULL on update (CAS pattern)", () => {
    // The update also checks claimed_at IS NULL for atomicity
    const updateSection = INDEX_SOURCE.slice(INDEX_SOURCE.indexOf(".update("));
    expect(updateSection).toContain('.is("claimed_at", null)');
  });

  it("orders candidates by created_at ascending (oldest first)", () => {
    expect(INDEX_SOURCE).toContain('order("created_at", { ascending: true })');
  });

  it("limits candidate selection to 1 row", () => {
    expect(INDEX_SOURCE).toContain(".limit(1)");
  });
});

describe("action-intents/index — IntentType coverage", () => {
  const EXPECTED_INTENT_TYPES = [
    "send_public_record_link",
    "request_counterparty_action",
    "create_followup_commitment",
    "human_review_required",
    "policy_violation_detected",
    "template_missing",
    "place_outbound_call",
    "send_message",
    "schedule_followup",
    "request_document",
    "collect_payment",
    "escalate_to_human",
    "generate_contract",
    "request_disclosure_confirmation",
    "record_verbal_consent",
    "pause_execution",
  ];

  it("defines exactly 16 intent types (15 + pause_execution)", () => {
    // Count quoted strings in the IntentType union
    const intentSection = INDEX_SOURCE.slice(
      INDEX_SOURCE.indexOf("export type IntentType"),
      INDEX_SOURCE.indexOf("export type ResultStatus")
    );
    const types = intentSection.match(/"[a-z_]+"/g) ?? [];
    expect(types.length).toBe(16);
  });

  for (const intentType of EXPECTED_INTENT_TYPES) {
    it(`includes intent type "${intentType}"`, () => {
      expect(INDEX_SOURCE).toContain(`"${intentType}"`);
    });
  }
});

describe("action-intents/index — ResultStatus coverage", () => {
  it('includes "succeeded"', () => {
    expect(INDEX_SOURCE).toContain('"succeeded"');
  });

  it('includes "failed"', () => {
    expect(INDEX_SOURCE).toContain('"failed"');
  });

  it('includes "skipped"', () => {
    expect(INDEX_SOURCE).toContain('"skipped"');
  });
});

describe("action-intents/emit — structural", () => {
  it("imports createActionIntent from index", () => {
    expect(EMIT_SOURCE).toContain('import { createActionIntent } from "./index"');
  });

  it("exports emitSendPublicRecordLink", () => {
    expect(EMIT_SOURCE).toContain("export async function emitSendPublicRecordLink");
  });

  it("exports emitRequestCounterpartyAction", () => {
    expect(EMIT_SOURCE).toContain("export async function emitRequestCounterpartyAction");
  });

  it("exports emitCreateFollowupCommitment", () => {
    expect(EMIT_SOURCE).toContain("export async function emitCreateFollowupCommitment");
  });

  it("all emit functions use dedupeKey for idempotency", () => {
    // Every call to createActionIntent in emit.ts should include dedupeKey
    const calls = EMIT_SOURCE.match(/await createActionIntent\(/g) ?? [];
    const dedupeKeys = EMIT_SOURCE.match(/dedupeKey/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    expect(dedupeKeys.length).toBeGreaterThanOrEqual(calls.length);
  });
});
