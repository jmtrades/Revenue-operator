/**
 * Start surface: ExecutionContinuityLine and reinforcing copy. No CTA or metrics in identity block.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const START_PAGE = path.join(ROOT, "src", "app", "dashboard", "start", "page.tsx");

const CONTINUITY_LINE = path.join(ROOT, "src", "components", "ExecutionContinuityLine.tsx");

describe("Start identity line", () => {
  it("has ExecutionContinuityLine and continuity copy in component", () => {
    const startContent = readFileSync(START_PAGE, "utf-8");
    expect(startContent).toContain("ExecutionContinuityLine");
    const continuityContent = readFileSync(CONTINUITY_LINE, "utf-8");
    expect(continuityContent).toContain("Handling active");
  });

  it("has operational state card with handling status and review structure", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).toContain('ts("operationalState")');
    expect(content).toContain('ts("handlingStatus")');
    expect(content).toContain('ts("reviewStructure")');
  });

  it("has no CTA or metrics in continuity block", () => {
    const content = readFileSync(START_PAGE, "utf-8");
    expect(content).not.toMatch(/ExecutionContinuityLine[\s\S]{0,200}<(button|Link)[^>]*href/);
  });
});
