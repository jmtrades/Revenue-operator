/**
 * Structural tests for marketing and surface routes.
 * Verifies: public-facing pages exist with expected structure.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("marketing route: about page", () => {
  const pagePath = path.join(ROOT, "src/app/about/page.tsx");

  it("about page exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });

  const src = readFileSync(pagePath, "utf-8");

  it("exports a default component", () => {
    expect(src).toMatch(/export\s+default\s+function/);
  });
});

describe("marketing route: features page", () => {
  const pagePath = path.join(ROOT, "src/app/features/page.tsx");

  it("features page exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });

  const src = readFileSync(pagePath, "utf-8");

  it("exports a default component", () => {
    expect(src).toMatch(/export\s+default\s+function/);
  });
});

describe("marketing route: industries landing", () => {
  const pagePath = path.join(ROOT, "src/app/industries/page.tsx");

  it("industries page exists", () => {
    expect(existsSync(pagePath)).toBe(true);
  });
});

describe("surfaces layout", () => {
  const layoutPath = path.join(ROOT, "src/app/(surfaces)/layout.tsx");

  it("surfaces layout exists", () => {
    expect(existsSync(layoutPath)).toBe(true);
  });

  if (existsSync(layoutPath)) {
    const src = readFileSync(layoutPath, "utf-8");

    it("exports a default layout component", () => {
      expect(src).toMatch(/export\s+default\s+function|export\s+default\s+async\s+function/);
    });
  }
});

describe("compare pages for competitive positioning", () => {
  const compareDir = path.join(ROOT, "src/app/compare");

  it("compare directory exists", () => {
    expect(existsSync(compareDir)).toBe(true);
  });

  it("dynamic competitor page exists", () => {
    expect(existsSync(path.join(compareDir, "[competitor]/page.tsx"))).toBe(true);
  });
});
