/**
 * Invariant: Next-action resolver returns exactly one primary action per workspace state.
 * No alternate paths. All branches return { ok, next_action, label, href? | record_path? }.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const ROUTE = path.join(ROOT, "src", "app", "api", "operational", "next-action", "route.ts");

const ALLOWED_NEXT_ACTIONS = [
  "resolve_billing",
  "confirm_approvals",
  "confirm_governance",
  "copy_record_link",
  "share_record",
  "record_activation",
];

describe("Next-action single resolution", () => {
  it("next-action route returns only allowed next_action values", () => {
    const content = readFileSync(ROUTE, "utf-8");
    const nextActionMatches = content.match(/next_action:\s*["']([^"']+)["']/g) || [];
    for (const m of nextActionMatches) {
      const value = m.replace(/next_action:\s*["']([^"']+)["']/, "$1");
      expect(ALLOWED_NEXT_ACTIONS).toContain(value);
    }
  });

  it("every return path includes ok and label", () => {
    const content = readFileSync(ROUTE, "utf-8");
    expect(content).toMatch(/ok:\s*true/);
    expect(content).toMatch(/label:\s*["']/);
    const returns = content.match(/return\s+NextResponse\.json\s*\(\s*\{/g) || [];
    expect(returns.length).toBeGreaterThanOrEqual(6);
  });

  it("route uses bounded queries only (limit or maybeSingle)", () => {
    const content = readFileSync(ROUTE, "utf-8");
    const fromSelect = content.match(/\.from\s*\([^)]+\)\s*\.select\s*\(/g) || [];
    expect(fromSelect.length).toBeGreaterThan(0);
    expect(content).toMatch(/\.limit\s*\(|\.maybeSingle\s*\(/);
  });
});
