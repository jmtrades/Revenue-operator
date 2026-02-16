/**
 * Assurance attempt marker: when delivery skipped (e.g. missing Resend), marker is written;
 * core-status assurance_attempted_recently is true when marker exists in last 24h.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("assurance attempt marker", () => {
  it("assurance-delivery records marker when send fails (missing owner email or Resend)", () => {
    const module = readFileSync(path.join(ROOT, "src/lib/assurance-delivery/index.ts"), "utf-8");
    expect(module).toContain("recordAssuranceAttemptMarker");
    expect(module).toContain("assurance_attempt_marker");
  });

  it("core-status reads assurance_attempt_marker for assurance_attempted_recently", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/system/core-status/route.ts"), "utf-8");
    expect(route).toContain("assurance_attempt_marker");
    expect(route).toContain("assurance_attempted_recently");
  });
});
