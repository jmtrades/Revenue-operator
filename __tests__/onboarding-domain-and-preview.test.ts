/**
 * Structural tests for onboarding / activation flow.
 * Verifies: activate and onboard pages, wizard steps, domain selection.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("activate page", () => {
  const pagePath = path.join(ROOT, "src/app/activate/page.tsx");

  it("exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });

  const src = readFileSync(pagePath, "utf-8");

  it("renders ActivateWizard component", () => {
    expect(src).toContain("ActivateWizard");
  });

  it("has metadata generation", () => {
    expect(src).toContain("generateMetadata");
  });

  it("includes Navbar", () => {
    expect(src).toContain("Navbar");
  });
});

describe("activate wizard steps", () => {
  const stepsDir = path.join(ROOT, "src/app/activate/steps");

  it("steps directory exists", () => {
    expect(existsSync(stepsDir)).toBe(true);
  });

  const expectedSteps = [
    "GoalStep.tsx",
    "BusinessStep.tsx",
    "ModeStep.tsx",
    "TestStep.tsx",
    "PlanStep.tsx",
  ];

  for (const step of expectedSteps) {
    it(`${step} exists`, () => {
      expect(existsSync(path.join(stepsDir, step))).toBe(true);
    });
  }
});

describe("activate flow step structure", () => {
  const stepsDir = path.join(ROOT, "src/app/activate/steps");

  it("steps directory exists for multi-step activation wizard", () => {
    expect(existsSync(stepsDir)).toBe(true);
  });
});

describe("onboard page", () => {
  const pagePath = path.join(ROOT, "src/app/onboard/page.tsx");

  it("onboard page exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });
});

describe("onboarding components", () => {
  const componentDir = path.join(ROOT, "src/components/onboarding");

  it("onboarding components directory exists", () => {
    expect(existsSync(componentDir)).toBe(true);
  });

  it("ModeSelector component exists", () => {
    expect(existsSync(path.join(componentDir, "ModeSelector.tsx"))).toBe(true);
  });

  it("IndustrySelector component exists", () => {
    expect(existsSync(path.join(componentDir, "IndustrySelector.tsx"))).toBe(true);
  });
});
