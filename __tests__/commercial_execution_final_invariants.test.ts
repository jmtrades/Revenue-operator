/**
 * Structural tests for commercial execution modules.
 * Verifies execution-plan and execution-ux follow architectural invariants.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("execution-plan module invariants", () => {
  const planDir = path.join(ROOT, "src/lib/execution-plan");

  it("execution-plan directory exists", () => {
    expect(existsSync(planDir)).toBe(true);
  });

  const indexPath = path.join(planDir, "index.ts");
  it("has an index.ts entry point", () => {
    expect(existsSync(indexPath)).toBe(true);
  });

  const src = readFileSync(indexPath, "utf-8");

  it("does not contain .delete() calls", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });

  it("does not contain raw LLM calls", () => {
    expect(src).not.toContain("openai.chat");
    expect(src).not.toMatch(/ChatCompletion/i);
  });
});

describe("execution-plan types", () => {
  const typesPath = path.join(ROOT, "src/lib/execution-plan/types.ts");

  it("types file exists", () => {
    expect(existsSync(typesPath)).toBe(true);
  });

  const src = readFileSync(typesPath, "utf-8");

  it("defines typed interfaces (not any)", () => {
    // Should have export type/interface declarations
    expect(src).toMatch(/export (type|interface)/);
  });
});

describe("execution-plan rate-limits", () => {
  const rateLimitsPath = path.join(ROOT, "src/lib/execution-plan/rate-limits.ts");

  it("rate-limits file exists", () => {
    expect(existsSync(rateLimitsPath)).toBe(true);
  });

  const src = readFileSync(rateLimitsPath, "utf-8");

  it("does not contain .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

describe("execution-ux state module", () => {
  const statePath = path.join(ROOT, "src/lib/execution-ux/state.ts");

  it("state module exists", () => {
    expect(existsSync(statePath)).toBe(true);
  });

  const src = readFileSync(statePath, "utf-8");

  it("exports ExecutionUxState type", () => {
    expect(src).toContain("export type ExecutionUxState");
  });

  it("defines under_review, active, and paused states", () => {
    expect(src).toContain('"under_review"');
    expect(src).toContain('"active"');
    expect(src).toContain('"paused"');
  });

  it("exports useExecutionUxState hook", () => {
    expect(src).toContain("export function useExecutionUxState");
  });

  it("is a client component (use client)", () => {
    expect(src).toContain('"use client"');
  });
});
