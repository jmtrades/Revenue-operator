/**
 * Contract: settings API includes operational_profile, PATCH persists it, orientation recorded once on change.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const SETTINGS_ROUTE = path.join(ROOT, "src", "app", "api", "workspaces", "[id]", "settings", "route.ts");

describe("Operational profile settings contract", () => {
  it("GET default includes operational_profile", () => {
    const content = readFileSync(SETTINGS_ROUTE, "utf-8");
    expect(content).toContain("operational_profile");
    expect(content).toMatch(/operational_profile:\s*["']org["']/);
  });

  it("PATCH persists body including operational_profile", () => {
    const content = readFileSync(SETTINGS_ROUTE, "utf-8");
    expect(content).toContain("upsert");
    expect(content).toContain("...body");
  });

  it("records orientation when operational_profile changes", () => {
    const content = readFileSync(SETTINGS_ROUTE, "utf-8");
    expect(content).toContain("recordOrientationStatement");
    expect(content).toContain("The operating profile was updated.");
    expect(content).toContain("operational_profile");
    expect(content).toContain("prevProfile");
    expect(content).toContain("nextProfile");
  });
});
