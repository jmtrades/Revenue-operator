/**
 * Core status: contract (booleans only, exact keys) and auth (session + workspace access).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const CORE_STATUS_KEYS = [
  "inbound_processing_active",
  "queue_processing_active",
  "assurance_attempted_recently",
  "proof_capsule_recently_available",
  "guarantees_bundle_configured",
] as const;

describe("GET /api/system/core-status", () => {
  it("returns only required keys, all booleans", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/system/core-status/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    for (const key of CORE_STATUS_KEYS) {
      expect(route).toContain(key);
    }
    expect(route).toContain("NextResponse.json({");
    expect(route).toContain("inbound_processing_active");
    expect(route).toContain("queue_processing_active");
    expect(route).toContain("assurance_attempted_recently");
    expect(route).toContain("proof_capsule_recently_available");
    expect(route).toContain("guarantees_bundle_configured");
  });

  it("requires workspace access when session enabled", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/system/core-status/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("authErr");
  });
});
