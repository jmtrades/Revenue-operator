/**
 * Contract: only four surfaces in nav; no icons; no trial/heartbeat in layout.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const LAYOUT = path.join(ROOT, "src", "app", "dashboard", "layout.tsx");

describe("Surfaces contract", () => {
  it("only four nav links exist (Situation, Record, Activity, Presence)", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).toContain("Situation");
    expect(content).toContain("Record");
    expect(content).toContain("Activity");
    expect(content).toContain("Presence");
    const navMatch = content.match(/NAV\s*=\s*\[[\s\S]*?\]/);
    expect(navMatch).toBeTruthy();
    const navBlock = navMatch![0];
    expect(navBlock).toContain('label: "Situation"');
    expect(navBlock).toContain('label: "Record"');
    expect(navBlock).toContain('label: "Activity"');
    expect(navBlock).toContain('label: "Presence"');
    expect((navBlock.match(/href:/g) || []).length).toBe(4);
  });

  it("nav has no icon or badge components", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).not.toContain("Icon");
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
