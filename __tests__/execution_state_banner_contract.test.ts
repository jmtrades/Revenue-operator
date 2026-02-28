/**
 * Contract: execution state banner phrases and copy.
 * Ensures only the three allowed phrases are present, with no internal IDs or SaaS language.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const BANNER = path.join(ROOT, "src", "components", "ExecutionStateBanner.tsx");

describe("Execution state banner contract", () => {
  const content = readFileSync(BANNER, "utf-8");

  it("includes the three canonical state phrases", () => {
    expect(content).toContain("Call handling under review.");
    expect(content).toContain("Call handling active.");
    expect(content).toContain("Call handling paused.");
  });

  it("contains no forbidden SaaS or tooling language", () => {
    const lower = content.toLowerCase();
    const forbidden = [
      "automation",
      "workflow",
      "campaign",
      "sequence",
      "crm",
      "bot",
      "dialer",
      "ai tool",
      "saas",
      "optimize",
      "boost",
      "growth hack",
      "funnel",
    ];
    for (const word of forbidden) {
      expect(lower.includes(word)).toBe(false);
    }
  });

  it("does not embed internal identifiers in user-facing copy", () => {
    // Defensive: ensure no obvious ID field names are present in this UI component.
    expect(content).not.toMatch(/\bworkspace_id\b/);
    expect(content).not.toMatch(/\blead_id\b/);
    expect(content).not.toMatch(/\buuid\b/);
  });
});

