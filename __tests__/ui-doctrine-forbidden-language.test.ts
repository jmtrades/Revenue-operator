/**
 * Structural tests for UI language standards.
 * Verifies: marketing pages use standard SaaS terminology, no internal jargon.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("UI uses standard SaaS product terminology", () => {
  const uiFiles = [
    "src/app/about/page.tsx",
    "src/app/features/page.tsx",
    "src/app/activate/page.tsx",
  ];

  for (const filePath of uiFiles) {
    const fullPath = path.join(ROOT, filePath);
    if (existsSync(fullPath)) {
      describe(filePath, () => {
        const src = readFileSync(fullPath, "utf-8");

        it("does not expose raw database table names to users", () => {
          expect(src).not.toContain("shared_transactions");
          expect(src).not.toContain("causal_chains");
          expect(src).not.toContain("continuation_exposures");
          expect(src).not.toContain("operational_responsibilities");
          expect(src).not.toContain("coordination_displacement_events");
        });

        it("does not expose internal type names to users", () => {
          expect(src).not.toContain("IntentType");
          expect(src).not.toContain("AmendmentType");
          expect(src).not.toContain("ResultStatus");
        });
      });
    }
  }
});

describe("doctrine statements use neutral language", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/operational-responsibilities/index.ts"), "utf-8");

  it("statement constants do not contain blame language", () => {
    const matches = src.matchAll(/export const STATEMENT_\w+\s*=\s*"([^"]+)"/g);
    for (const match of matches) {
      const value = match[1];
      expect(value).not.toMatch(/\b(blame|fault|wrong|bad|stupid|failure)\b/i);
    }
  });

  it("statement constants do not reference specific actors", () => {
    const matches = src.matchAll(/export const STATEMENT_\w+\s*=\s*"([^"]+)"/g);
    for (const match of matches) {
      const value = match[1];
      expect(value).not.toMatch(/\b(John|admin|user|you|your)\b/i);
    }
  });
});

describe("institutional-auditability statements use neutral language", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/institutional-auditability/index.ts"), "utf-8");

  it("amendment statements do not assign blame", () => {
    const matches = src.matchAll(/STATEMENT_\w+\s*=\s*\n?\s*"([^"]+)"/g);
    for (const match of matches) {
      const value = match[1];
      expect(value).not.toMatch(/\b(blame|fault|wrong|error|mistake)\b/i);
    }
  });

  it("amendment log line is neutral", () => {
    const match = src.match(/AMENDMENT_LOG_LINE\s*=\s*"([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/\b(blame|fault|actor|who)\b/i);
  });
});

describe("disable-impact language is factual, not marketing", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/operational-perception/disable-impact.ts"), "utf-8");

  it("output strings do not contain promotional language", () => {
    // Check the actual statement strings in the file
    const stringLiterals = src.matchAll(/"([^"]{20,})"/g);
    for (const match of stringLiterals) {
      const value = match[1];
      expect(value).not.toMatch(/\b(amazing|powerful|best|incredible|revolutionary)\b/i);
    }
  });

  it("FORBIDDEN regex blocks marketing terms in output", () => {
    expect(src).toContain("FORBIDDEN");
    expect(src).toContain("optimize");
    expect(src).toContain("ROI");
  });
});
