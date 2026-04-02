/**
 * Structural tests: product surfaces exist and marketing pages are present.
 * Verifies: about, features, industries, and compare pages exist.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("marketing and product surface pages exist", () => {
  const requiredPages = [
    "src/app/about/page.tsx",
    "src/app/features/page.tsx",
    "src/app/industries/page.tsx",
    "src/app/activate/page.tsx",
    "src/app/compare/[competitor]/page.tsx",
  ];

  for (const pagePath of requiredPages) {
    it(`${pagePath} exists`, () => {
      expect(existsSync(path.join(ROOT, pagePath))).toBe(true);
    });
  }
});

describe("industry vertical pages exist", () => {
  const industries = [
    "dental",
    "auto-repair",
    "insurance",
    "legal",
    "roofing",
    "recruiting",
    "construction",
    "real-estate",
  ];

  for (const industry of industries) {
    it(`industries/${industry}/page.tsx exists`, () => {
      expect(existsSync(path.join(ROOT, `src/app/industries/${industry}/page.tsx`))).toBe(true);
    });
  }
});

describe("activation flow exists", () => {
  const activateDir = path.join(ROOT, "src/app/activate");

  it("activate page exists", () => {
    expect(existsSync(path.join(activateDir, "page.tsx"))).toBe(true);
  });

  it("ActivateWizard component exists", () => {
    expect(existsSync(path.join(activateDir, "ActivateWizard.tsx"))).toBe(true);
  });

  it("has step components", () => {
    const stepsDir = path.join(activateDir, "steps");
    expect(existsSync(stepsDir)).toBe(true);
  });
});
