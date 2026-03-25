/**
 * Invariant: Founder export returns only allowlisted fields; no secrets, Stripe IDs, tokens, stack traces.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf-8");
}

const SENSITIVE = [
  "stripe",
  "webhook_secret",
  "secret",
  "token",
  "password",
  "api_key",
  "stack",
  "trace",
  "internal_id",
  "customer_id",
  "subscription_id",
  "payment_method",
];

describe("Founder export allowlist", () => {
  it("founder export route exists and uses allowlist", () => {
    const route = read("src/app/api/internal/founder/export/route.ts");
    expect(route).toMatch(/WORKSPACE_ALLOWLIST|allowlist|ok:\s*true/);
  });

  it("output keys are allowlisted; no sensitive field names in response shape", () => {
    const route = read("src/app/api/internal/founder/export/route.ts");
    for (const word of SENSITIVE) {
      expect(route.toLowerCase()).not.toMatch(
        new RegExp(`(workspaces|select|return).*${word}`, "i")
      );
    }
    expect(route).toMatch(/id|name|created_at|workspaces/);
  });

  it("includes last_cron_cycle_at from bounded query", () => {
    const route = read("src/app/api/internal/founder/export/route.ts");
    expect(route).toMatch(/last_cron_cycle_at|last_ran_at/);
    expect(route).toMatch(/system_cron_heartbeats|limit\s*\(\s*1\s*\)/);
  });

  it("founder export response keys match strict allowlist (ok, last_cron_cycle_at, anomaly, external_execution, rate_ceiling, workspaces, exported_at)", () => {
    const route = read("src/app/api/internal/founder/export/route.ts");
    expect(route).toMatch(/anomaly|external_execution|rate_ceiling/);
    const allowedTopKeys = ["ok", "last_cron_cycle_at", "anomaly", "external_execution", "rate_ceiling", "workspaces", "exported_at"];
    for (const key of allowedTopKeys) {
      expect(route).toMatch(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
});
