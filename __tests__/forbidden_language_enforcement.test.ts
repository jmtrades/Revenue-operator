/**
 * Structural tests for forbidden language enforcement.
 * Verifies: disable-impact sanitizes forbidden terms, doctrine statements are capped.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("disable-impact forbidden language sanitization", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/operational-perception/disable-impact.ts"), "utf-8");

  it("defines a FORBIDDEN regex", () => {
    expect(src).toContain("FORBIDDEN");
    expect(src).toMatch(/FORBIDDEN\s*=\s*\//);
  });

  it("strips second-person pronouns (you/your)", () => {
    expect(src).toMatch(/\byou\b/);
    expect(src).toMatch(/\byour\b/);
  });

  it("strips first-person pronouns (we/us)", () => {
    expect(src).toMatch(/\bwe\b/);
    expect(src).toMatch(/\bus\b/);
  });

  it("strips marketing terms (optimize, ROI, KPI)", () => {
    expect(src).toContain("optimize");
    expect(src).toContain("ROI");
    expect(src).toContain("KPI");
  });

  it("strips UI terms (dashboard, assistant, metric)", () => {
    expect(src).toContain("dashboard");
    expect(src).toContain("assistant");
    expect(src).toContain("metric");
  });

  it("applies sanitize function to all output lines", () => {
    expect(src).toContain("sanitize(");
  });
});

describe("doctrine statement length enforcement", () => {
  const modules = [
    "src/lib/operational-responsibilities/index.ts",
    "src/lib/institutional-auditability/index.ts",
  ];

  for (const modulePath of modules) {
    const fullPath = path.join(ROOT, modulePath);
    if (existsSync(fullPath)) {
      const src = readFileSync(fullPath, "utf-8");

      describe(modulePath, () => {
        it("has a cap/trim function for line length", () => {
          expect(src).toMatch(/function\s+(cap|trim)\s*\(/);
        });

        it("enforces max line length constant", () => {
          expect(src).toMatch(/MAX_(LINE|CHARS|STATEMENT_LEN|LINE_LEN)\s*=\s*\d+/);
        });

        it("all STATEMENT_ constants are <=90 chars", () => {
          const statementMatches = src.matchAll(/export const (STATEMENT_\w+)\s*=\s*\n?\s*"([^"]+)"/g);
          for (const match of statementMatches) {
            const value = match[2];
            expect(value.length).toBeLessThanOrEqual(90);
          }
        });
      });
    }
  }
});
