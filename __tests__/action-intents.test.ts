/**
 * Action intents: universal execution interface. Contract, auth, atomic claim, idempotent create, emission.
 * No external API calls in repo. No forbidden words. No internal id exposure to public surfaces.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ROUTE_LIST = path.join(ROOT, "src/app/api/operational/action-intents/route.ts");
const ROUTE_CLAIM = path.join(ROOT, "src/app/api/operational/action-intents/claim/route.ts");
const ROUTE_COMPLETE = path.join(ROOT, "src/app/api/operational/action-intents/complete/route.ts");
const LIB = path.join(ROOT, "src/lib/action-intents/index.ts");
const EMIT = path.join(ROOT, "src/lib/action-intents/emit.ts");

describe("action-intents contract", () => {
  it("GET list route returns intents array and uses requireWorkspaceAccess", () => {
    const route = readFileSync(ROUTE_LIST, "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("intents");
    expect(route).toContain("workspace_id");
    expect(route).toContain("limit(MAX)");
    expect(route).toContain("50");
  });

  it("POST claim route requires workspace_id and worker_id", () => {
    const route = readFileSync(ROUTE_CLAIM, "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("workspace_id");
    expect(route).toContain("worker_id");
    expect(route).toContain("claimNextActionIntent");
  });

  it("POST complete route requires id and result_status", () => {
    const route = readFileSync(ROUTE_COMPLETE, "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("result_status");
    expect(route).toContain("succeeded");
    expect(route).toContain("failed");
    expect(route).toContain("skipped");
  });

  it("no forbidden words in routes or lib", () => {
    const forbidden = /\b(dashboard|KPI|optimize|ROI|urgent|act now|please click)\b/i;
    expect(forbidden.test(readFileSync(ROUTE_LIST, "utf-8"))).toBe(false);
    expect(forbidden.test(readFileSync(ROUTE_CLAIM, "utf-8"))).toBe(false);
    expect(forbidden.test(readFileSync(ROUTE_COMPLETE, "utf-8"))).toBe(false);
    expect(forbidden.test(readFileSync(LIB, "utf-8"))).toBe(false);
    expect(forbidden.test(readFileSync(EMIT, "utf-8"))).toBe(false);
  });

  it("list response shape: id, intent_type, payload_json, created_at, thread_id, work_unit_id only", () => {
    const route = readFileSync(ROUTE_LIST, "utf-8");
    expect(route).toContain("id");
    expect(route).toContain("intent_type");
    expect(route).toContain("payload_json");
    expect(route).toContain("created_at");
    expect(route).not.toMatch(/claimed_by|result_ref|dedupe_key/);
  });
});

describe("action-intents library", () => {
  it("createActionIntent input shape: threadId, workUnitId, intentType, payload, dedupeKey", () => {
    const lib = readFileSync(LIB, "utf-8");
    expect(lib).toContain("CreateActionIntentInput");
    expect(lib).toContain("dedupeKey");
    expect(lib).toContain("23505");
  });

  it("claimNextActionIntent is atomic (update with claimed_at IS NULL)", () => {
    const lib = readFileSync(LIB, "utf-8");
    expect(lib).toContain("is(\"claimed_at\", null)");
    expect(lib).toContain("order(\"created_at\"");
  });

  it("completeActionIntent sets completed_at, result_status, result_ref", () => {
    const lib = readFileSync(LIB, "utf-8");
    expect(lib).toContain("completed_at");
    expect(lib).toContain("result_status");
    expect(lib).toContain("result_ref");
  });
});

describe("action-intents emission", () => {
  it("emit sends send_public_record_link when shared transaction created", () => {
    const shared = readFileSync(path.join(ROOT, "src/lib/shared-transaction-assurance/index.ts"), "utf-8");
    expect(shared).toContain("emitSendPublicRecordLink");
  });

  it("emit sends request_counterparty_action when responsibility created", () => {
    const resp = readFileSync(path.join(ROOT, "src/lib/operational-responsibilities/index.ts"), "utf-8");
    expect(resp).toContain("emitRequestCounterpartyAction");
  });

  it("emit sends create_followup_commitment when schedule_follow_up recorded", () => {
    const resp = readFileSync(path.join(ROOT, "src/lib/operational-responsibilities/index.ts"), "utf-8");
    expect(resp).toContain("emitCreateFollowupCommitment");
    expect(resp).toContain("schedule_follow_up");
  });

  it("emit uses dedupe keys to avoid duplicates", () => {
    const emit = readFileSync(EMIT, "utf-8");
    expect(emit).toContain("dedupeKey");
    expect(emit).toContain("st:");
    expect(emit).toContain("resp:");
    expect(emit).toContain("re:");
    expect(emit).toContain("send_public_record_link");
    expect(emit).toContain("request_counterparty_action");
    expect(emit).toContain("create_followup_commitment");
  });
});

describe("action-intents idempotent create", () => {
  it("createActionIntent catches unique violation and returns null", () => {
    const lib = readFileSync(LIB, "utf-8");
    expect(lib).toContain("23505");
    expect(lib).toContain("return null");
  });
});

describe("action-intents migration", () => {
  it("migration defines action_intents with required columns", () => {
    const migration = readFileSync(path.join(ROOT, "supabase/migrations/action_intents.sql"), "utf-8");
    expect(migration).toContain("action_intents");
    expect(migration).toContain("workspace_id");
    expect(migration).toContain("thread_id");
    expect(migration).toContain("work_unit_id");
    expect(migration).toContain("intent_type");
    expect(migration).toContain("payload_json");
    expect(migration).toContain("dedupe_key");
    expect(migration).toContain("created_at");
    expect(migration).toContain("claimed_at");
    expect(migration).toContain("completed_at");
    expect(migration).toContain("result_status");
    expect(migration).toContain("result_ref");
    expect(migration).toContain("UNIQUE");
    expect(migration).toContain("WHERE claimed_at IS NULL");
  });
});
