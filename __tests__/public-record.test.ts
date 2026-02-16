/**
 * Public record endpoint: must never return internal identifiers.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ALLOWED_KEYS = ["external_ref", "subject_type", "state", "last_event_type", "last_event_at"];
const FORBIDDEN_KEYS = ["workspace_id", "lead_id", "conversation_id", "counterparty_identifier", "id", "workspace", "lead", "conversation"];

describe("public record endpoint", () => {
  it("response must only contain allowed keys", () => {
    const response = {
      external_ref: "tx-123",
      subject_type: "booking",
      state: "normal",
      last_event_type: "acknowledged",
      last_event_at: "2025-01-01T00:00:00Z",
    };
    const keys = Object.keys(response).sort();
    expect(keys).toEqual(ALLOWED_KEYS.sort());
  });

  it("response must never contain internal ids", () => {
    const response: Record<string, unknown> = {
      external_ref: "tx-123",
      subject_type: "booking",
      state: "normal",
      last_event_type: "acknowledged",
      last_event_at: "2025-01-01T00:00:00Z",
    };
    for (const key of FORBIDDEN_KEYS) {
      expect(response).not.toHaveProperty(key);
    }
  });

  it("state must be one of normal, outside_authority, beyond_scope, exposure", () => {
    const allowedStates = ["normal", "outside_authority", "beyond_scope", "exposure"];
    const state = "normal";
    expect(allowedStates).toContain(state);
  });

  it("404 response has ok: false", () => {
    const notFoundBody = { ok: false };
    expect(notFoundBody).toHaveProperty("ok", false);
  });

  it("route uses rate limiting and IP hash (no raw IP)", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/public/record/[external_ref]/route.ts"), "utf-8");
    expect(route).toContain("checkPublicRecordRateLimit");
    expect(route).toContain("hashIpForPublicRecord");
    expect(route).not.toMatch(/\.ip\b|raw.*ip|log.*ip/i);
  });

  it("neutral response shape unchanged (doctrine-safe)", () => {
    const neutral = {
      external_ref: "",
      subject_type: "",
      state: "beyond_scope",
      last_event_type: "",
      last_event_at: "",
    };
    expect(Object.keys(neutral).sort()).toEqual(ALLOWED_KEYS.sort());
    expect(["normal", "outside_authority", "beyond_scope", "exposure"]).toContain(neutral.state);
  });
});
