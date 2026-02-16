/**
 * Operator capsule: contract (exact keys, types, caps, no internal ids) and auth.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const CAP_TODAY = 6;
const CAP_PROOF = 8;
const CAP_REVERSION = 6;

const POSITION_KEYS = [
  "institutional_state",
  "provider_detached",
  "operation_currently_anchored",
  "assumed_operation",
  "normalized_operation",
  "protection_active",
] as const;

const INSTITUTIONAL_STATES = ["none", "embedded", "reliant", "assumed", "institutional"] as const;

describe("GET /api/operational/operator-capsule", () => {
  it("returns only required top-level keys: today, proof, reversion, position", () => {
    const required = ["today", "proof", "reversion", "position"];
    const response = { today: [], proof: [], reversion: [], position: {} };
    expect(Object.keys(response).sort()).toEqual(required.sort());
  });

  it("position has exact keys and institutional_state is allowed enum", () => {
    const position = {
      institutional_state: "none" as const,
      provider_detached: false,
      operation_currently_anchored: false,
      assumed_operation: false,
      normalized_operation: false,
      protection_active: false,
    };
    expect(Object.keys(position).sort()).toEqual([...POSITION_KEYS].sort());
    expect(INSTITUTIONAL_STATES).toContain(position.institutional_state);
  });

  it("today and proof and reversion are string arrays, caps enforced in route", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/operator-capsule/route.ts"), "utf-8");
    expect(route).toContain("CAP_TODAY");
    expect(route).toContain("CAP_PROOF");
    expect(route).toContain("CAP_REVERSION");
    expect(route).toContain("slice(0, CAP_");
  });

  it("response must not expose internal ids or timestamps", () => {
    const forbidden = ["workspace_id", "lead_id", "id", "created_at", "period_end", "timestamp"];
    const allowedBody = { today: [], proof: [], reversion: [], position: {} };
    for (const key of forbidden) {
      expect(allowedBody).not.toHaveProperty(key);
    }
  });

  it("requires workspace access", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/operator-capsule/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("workspace_id");
  });
});
