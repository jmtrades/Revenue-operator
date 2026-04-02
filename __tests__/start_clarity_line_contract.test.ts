/**
 * Structural tests for start/activate page clarity.
 * Verifies: activate page renders clearly, has metadata, and onboard flow exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("activate page clarity", () => {
  const pagePath = path.join(ROOT, "src/app/activate/page.tsx");

  it("activate page exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });

  const src = readFileSync(pagePath, "utf-8");

  it("generates SEO metadata", () => {
    expect(src).toContain("generateMetadata");
    expect(src).toContain("Metadata");
  });

  it("has a title in metadata", () => {
    expect(src).toContain("title:");
  });

  it("has a description in metadata", () => {
    expect(src).toContain("description:");
  });

  it("renders the ActivateWizard", () => {
    expect(src).toContain("<ActivateWizard");
  });

  it("wraps in error boundary", () => {
    expect(src).toContain("ErrorBoundary");
  });
});

describe("onboard page clarity", () => {
  const pagePath = path.join(ROOT, "src/app/onboard/page.tsx");

  it("onboard page exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });
});

describe("activate wizard component", () => {
  const wizardPath = path.join(ROOT, "src/app/activate/ActivateWizard.tsx");

  it("ActivateWizard component exists", () => {
    expect(existsSync(wizardPath)).toBe(true);
  });

  const src = readFileSync(wizardPath, "utf-8");

  it("is a client component or uses client hooks", () => {
    // Wizard uses interactive state
    expect(src).toMatch(/"use client"|useState|useEffect/);
  });
});

describe("activate steps directory", () => {
  const stepsPath = path.join(ROOT, "src/app/activate/steps");

  it("steps directory exists for wizard progression", () => {
    expect(existsSync(stepsPath)).toBe(true);
  });
});
