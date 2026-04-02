/**
 * Structural tests for execution state banner / UX state.
 * Verifies: state derivation reads governance signals, no mutation.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("execution-ux state module", () => {
  const statePath = path.join(ROOT, "src/lib/execution-ux/state.ts");

  it("module exists", () => {
    expect(existsSync(statePath)).toBe(true);
  });

  const src = readFileSync(statePath, "utf-8");

  it("exports ExecutionUxState type with three states", () => {
    expect(src).toContain("export type ExecutionUxState");
    expect(src).toContain('"under_review"');
    expect(src).toContain('"active"');
    expect(src).toContain('"paused"');
  });

  it("exports useExecutionUxState hook", () => {
    expect(src).toContain("export function useExecutionUxState");
  });

  it("is a client component", () => {
    expect(src.trimStart()).toMatch(/^"use client"/);
  });

  it("derives state from billing status", () => {
    expect(src).toContain("BillingSnapshot");
    expect(src).toContain("billingStatus");
  });

  it("derives state from pending approvals", () => {
    expect(src).toContain("ApprovalsSnapshot");
    expect(src).toContain("pending");
  });

  it("derives state from policy snapshot", () => {
    expect(src).toContain("PolicySnapshot");
    expect(src).toContain("jurisdiction");
    expect(src).toContain("approval_mode");
  });

  it("defaults to under_review on error", () => {
    // In the catch block, state is set to under_review
    expect(src).toContain('setState("under_review")');
  });

  it("does not write or mutate any data", () => {
    expect(src).not.toMatch(/\.insert\s*\(/);
    expect(src).not.toMatch(/\.update\s*\(/);
    expect(src).not.toMatch(/\.delete\s*\(/);
    expect(src).not.toMatch(/\.upsert\s*\(/);
  });

  it("cancels stale fetches on cleanup", () => {
    expect(src).toContain("cancelled = true");
  });
});
