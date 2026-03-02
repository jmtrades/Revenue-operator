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
    expect(content).toContain("Start");
    expect(content).toContain("Record");
    expect(content).toContain("Activity");
    expect(content).toContain("Presence");
    expect(content).toContain("Approvals");
    const navMatch = content.match(/NAV[\s\S]*?=\s*\[[\s\S]*?\]\s*;/);
    expect(navMatch).toBeTruthy();
    const navBlock = navMatch![0];
    expect(navBlock).toContain('label: "Start"');
    expect(navBlock).toContain('label: "Record"');
    expect(navBlock).toContain('label: "Activity"');
    expect(navBlock).toContain('label: "Presence"');
    expect(navBlock).toContain('label: "Approvals"');
    expect((navBlock.match(/href:/g) || []).length).toBeGreaterThanOrEqual(5);
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
