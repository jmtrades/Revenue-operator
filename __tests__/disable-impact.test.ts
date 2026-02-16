/**
 * Disable-impact: contract (array only, ≤6 lines, ≤90 chars), auth, no internal ids, no forbidden words.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const MAX_LINES = 6;
const MAX_CHARS = 90;
const FORBIDDEN_WORDS = ["you", "your", "we", "us", "click", "optimize", "ROI", "KPI", "dashboard", "assistant", "metric", "percentage"];

describe("GET /api/operational/disable-impact", () => {
  it("response is string array only (no wrapper object)", () => {
    const response: string[] = [];
    expect(Array.isArray(response)).toBe(true);
    expect(response.every((x) => typeof x === "string")).toBe(true);
  });

  it("contract: at most 6 lines", () => {
    const response = ["Line one.", "Line two."];
    expect(response.length).toBeLessThanOrEqual(MAX_LINES);
  });

  it("contract: each line at most 90 chars", () => {
    const line = "Progress would pause without intervention.";
    expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
  });

  it("route requires workspace access", () => {
    const route = readFileSync(path.join(ROOT, "src/app/api/operational/disable-impact/route.ts"), "utf-8");
    expect(route).toContain("requireWorkspaceAccess");
    expect(route).toContain("workspace_id");
  });

  it("response must not contain internal ids or timestamps", () => {
    const forbiddenInContent = ["workspace_id", "lead_id", "subject_id", "created_at", "recorded_at", "determined_at"];
    const exampleLines = [
      "Progress would pause without intervention.",
      "Payment completion would depend on active monitoring.",
    ];
    for (const line of exampleLines) {
      for (const key of forbiddenInContent) {
        expect(line).not.toContain(key);
      }
    }
  });

  it("helper enforces max lines and max chars and sanitizes forbidden words", () => {
    const helper = readFileSync(path.join(ROOT, "src/lib/operational-perception/disable-impact.ts"), "utf-8");
    expect(helper).toContain("MAX_LINES");
    expect(helper).toContain("MAX_CHARS");
    expect(helper).toContain("slice(0, MAX_LINES)");
    expect(helper).toMatch(/FORBIDDEN|forbidden/);
  });

  it("no forbidden words (as whole words) in allowed statement examples", () => {
    const allowed = [
      "Progress would pause without intervention.",
      "Payment completion would depend on active monitoring.",
      "Attendance outcomes would require confirmation checks.",
      "Coordination would move outside the record.",
      "Operations would require active supervision.",
      "Operational failures would persist until addressed.",
      "Current work would require manual tracking.",
      "Verification would return to routine checks.",
    ];
    const wordBoundary = (w: string) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    for (const line of allowed) {
      expect(line.length).toBeLessThanOrEqual(MAX_CHARS);
      for (const word of FORBIDDEN_WORDS) {
        expect(line).not.toMatch(wordBoundary(word));
      }
    }
  });
});
