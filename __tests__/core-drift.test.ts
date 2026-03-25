/**
 * Core drift cron: cron auth, heartbeat via runSafeCron, incident category and dedupe.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("GET /api/cron/core-drift", () => {
  it("uses assertCronAuthorized and runSafeCron with job name core-drift", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/core-drift/route.ts"), "utf-8");
    expect(route).toContain("assertCronAuthorized");
    expect(route).toContain("runSafeCron");
    expect(route).toContain("core-drift");
  });

  it("records system_drift_detected incident via createIncidentStatement", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/core-drift/route.ts"), "utf-8");
    expect(route).toContain("createIncidentStatement");
    expect(route).toContain("system_drift_detected");
  });

  it("heartbeat is recorded by runSafeCron on success (no duplicate manual record)", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/cron/core-drift/route.ts"), "utf-8");
    expect(route).not.toContain("recordCronHeartbeat(\"core-drift\")");
    expect(route).not.toContain("recordCronHeartbeat('core-drift')");
  });
});
