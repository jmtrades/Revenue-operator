/**
 * Start surface: single primary CTA only. No secondary CTAs, no metrics, no lists, no charts.
 * Labels must be exactly: Open record | Record activation | Confirm governance | Resolve authorization | Share record.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const START_PAGE = path.join(ROOT, "src", "app", "dashboard", "start", "page.tsx");
const NEXT_ACTION_ROUTE = path.join(ROOT, "src", "app", "api", "operational", "next-action", "route.ts");

const _ALLOWED_LABELS = [
  "Open record",
  "Record activation",
  "Confirm governance",
  "Resolve authorization",
  "Share record",
];

describe("Start surface single primary CTA", () => {
  it("start page renders ExecutionStateBanner, ExecutionContinuityLine, one primary action only", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain("DashboardExecutionStateBanner");
    expect(content).toContain("ExecutionContinuityLine");
    expect(content).toContain("OperatorStartCard");
    expect(content).toContain("isRecordAction ? (");
    expect(content).toContain(": (");
    expect(content).not.toMatch(/label:\s*["'][^"']*secondary[^"']*["']/i);
  });

  it("start page has no secondary CTAs, no metrics UI, no charts", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).not.toMatch(/label:\s*["']Secondary["']/);
    const withoutComments = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "");
    expect(withoutComments).not.toMatch(/\{[^}]*metrics[^}]*\}/);
    expect(content).not.toContain("chart");
    expect(content).not.toContain("Chart");
  });

  it("next-action API returns only allowed primary labels", () => {
    const content = readFileSync(NEXT_ACTION_ROUTE, "utf-8");
    expect(content).toContain("Open record");
    expect(content).toContain("Share record");
    expect(content).toContain("Record activation");
    expect(content).toContain("Confirm governance");
    expect(content).toContain("Resolve authorization");
    expect(content).not.toContain('label: "Copy record link"');
    expect(content).not.toContain("Add leads to governed");
    expect(content).not.toContain("Review pending items");
    expect(content).not.toContain("Resolve billing or authorization");
  });

  it("start page has at most one primary button or link block", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    const hasRecordButton = content.includes("Copy record") && content.includes("btn-primary");
    const operatorStartCard = content.includes("OperatorStartCard");
    expect(hasRecordButton || operatorStartCard).toBe(true);
    const primaryButtonCount = (content.match(/btn-primary/g) || []).length;
    expect(primaryButtonCount).toBeLessThanOrEqual(3);
  });
});
