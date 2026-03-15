/**
 * Contract: nav surfaces (Start canonical, Record, Activity, Presence, Approvals); no badge/trial/heartbeat in layout.
 * Icons in nav are allowed per product spec (Activity, Contacts, Agents, etc.).
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const LAYOUT = path.join(ROOT, "src", "app", "dashboard", "layout.tsx");

describe("Surfaces contract", () => {
  it("nav includes Start, Record, Activity, Presence, Approvals", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).toContain("/dashboard/start");
    expect(content).toContain("/dashboard/record");
    expect(content).toContain("/dashboard/activity");
    expect(content).toContain("/dashboard/presence");
    expect(content).toContain("/dashboard/approvals");
    expect(content).toContain("NAV_HREFS");
    expect(content).toContain("buildNav");
    expect(content).toContain('"start"');
    expect(content).toContain('"record"');
    expect(content).toContain('"activity"');
    expect(content).toContain('"presence"');
    expect(content).toContain('"approvals"');
  });

  it("nav has no badge components", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).not.toContain("Badge");
  });

  it("layout does not render TrialBanner, RenewalReminderBanner, HeartbeatBar, or CoverageLimitedBanner", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).not.toContain("TrialBanner");
    expect(content).not.toContain("RenewalReminderBanner");
    expect(content).not.toContain("HeartbeatBar");
    expect(content).not.toContain("CoverageLimitedBanner");
  });
});
