/**
 * Surface restriction: only Situation, Record, Activity, Presence as primary nav.
 * Legacy paths (leads, conversations, settings, activation, continue-protection) not in nav.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const LAYOUT = path.join(ROOT, "src", "app", "dashboard", "layout.tsx");

describe("Surface restriction", () => {
  it("layout defines four primary surfaces only (Situation, Record, Activity, Presence)", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).toContain("ALLOWED_DASHBOARD_PATHS");
    expect(content).toContain("/dashboard");
    expect(content).toContain("/dashboard/record");
    expect(content).toContain("/dashboard/activity");
    expect(content).toContain("/dashboard/presence");
  });

  it("layout redirects non-allowed paths to /dashboard", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    expect(content).toContain("router.replace(");
    expect(content).toContain("allowed");
    expect(content).toContain("pathname.startsWith(\"/dashboard\")");
  });

  it("legacy paths are not in ALLOWED_DASHBOARD_PATHS", () => {
    const content = readFileSync(LAYOUT, "utf-8");
    const legacy = [
      "/dashboard/conversations",
      "/dashboard/leads",
      "/dashboard/activation",
      "/dashboard/continue-protection",
    ];
    for (const p of legacy) {
      expect(content).not.toMatch(new RegExp(`["']${p.replace(/\/dashboard\//, "/dashboard/")}["']`));
    }
  });
});
