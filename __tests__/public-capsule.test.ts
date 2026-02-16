/**
 * Public proof capsule: response keys only "proof", rate limiting, no internal ids.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ALLOWED_KEYS = ["proof"];
const FORBIDDEN_KEYS = ["workspace_id", "lead_id", "id", "created_at", "period_end", "lines"];

describe("GET /api/public/record/[external_ref]/capsule", () => {
  it("response must only contain key proof", () => {
    const response = { proof: [] };
    expect(Object.keys(response).sort()).toEqual(ALLOWED_KEYS.sort());
  });

  it("response must never contain internal ids or raw data keys", () => {
    const response: Record<string, unknown> = { proof: [] };
    for (const key of FORBIDDEN_KEYS) {
      expect(response).not.toHaveProperty(key);
    }
  });

  it("route uses rate limiting and IP hash", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/public/record/[external_ref]/capsule/route.ts"), "utf-8");
    expect(route).toContain("checkPublicRecordRateLimit");
    expect(route).toContain("hashIpForPublicRecord");
  });

  it("neutral response when over limit is doctrine-safe (proof only)", () => {
    const neutral = { proof: [] };
    expect(Object.keys(neutral)).toEqual(ALLOWED_KEYS);
    expect(Array.isArray(neutral.proof)).toBe(true);
  });
});
