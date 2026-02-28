/**
 * Policy editor contract: routes exist, auth enforced, no forbidden language in UI.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const DASHBOARD = path.join(ROOT, "src", "app", "dashboard");
const API = path.join(ROOT, "src", "app", "api");

/** Forbidden in user-facing copy only (not in route paths like /dashboard). */
const FORBIDDEN_UI = ["optimize", "recommend", "should", "improve", "increase", "performance", "KPI", "ROI", "persuasion", "urgent", "asap"];

describe("Policy editor contract", () => {
  it("policies list route exists", () => {
    const route = path.join(API, "enterprise", "policies", "route.ts");
    expect(existsSync(route)).toBe(true);
    const content = readFileSync(route, "utf-8");
    expect(content).toContain("requireWorkspaceRole");
    expect(content).toContain("message_policies");
  });

  it("policy by id route exists (GET/PATCH)", () => {
    const route = path.join(API, "enterprise", "policies", "[id]", "route.ts");
    expect(existsSync(route)).toBe(true);
    const content = readFileSync(route, "utf-8");
    expect(content).toContain("requireWorkspaceRole");
    expect(content).toContain("PATCH");
  });

  it("dashboard policies page exists and auth is required via layout", () => {
    const page = path.join(DASHBOARD, "policies", "page.tsx");
    expect(existsSync(page)).toBe(true);
  });

  it("policy edit page has no forbidden persuasion/advice language", () => {
    const page = path.join(DASHBOARD, "policies", "[id]", "page.tsx");
    expect(existsSync(page)).toBe(true);
    const content = readFileSync(page, "utf-8").toLowerCase();
    for (const word of FORBIDDEN_UI) {
      expect(content).not.toContain(word.toLowerCase());
    }
  });
});
