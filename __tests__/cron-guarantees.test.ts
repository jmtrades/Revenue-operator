/**
 * Cron guarantees bundle: auth and heartbeat.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("GET /api/cron/guarantees", () => {
  it("uses assertCronAuthorized and records heartbeat", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/guarantees/route.ts"), "utf-8");
    expect(route).toContain("assertCronAuthorized");
    expect(route).toContain("runSafeCron");
    expect(route).toContain("recordCronHeartbeat");
    expect(route).toContain("guarantees");
  });

  it("runs progress-watchdog, integrity-audit, closure, handoff-notifications, no-reply", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/guarantees/route.ts"), "utf-8");
    expect(route).toContain("progress-watchdog");
    expect(route).toContain("integrity-audit");
    expect(route).toContain("closure");
    expect(route).toContain("handoff-notifications");
    expect(route).toContain("no-reply");
  });
});
