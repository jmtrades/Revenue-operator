/**
 * Retention Intercept: structural tests verifying module shape and integration points.
 * No dedicated retention-intercept directory exists; functionality is integrated
 * into surfaces (org-sections, solo-client-state, state-feed).
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const SURFACES_DIR = resolve(__dirname, "../src/lib/surfaces");

/* -------------------------------------------------------------------------- */
/*  Module existence: retention intercept surfaces                            */
/* -------------------------------------------------------------------------- */

describe("retention intercept - module existence", () => {
  it("surfaces directory exists", () => {
    expect(existsSync(SURFACES_DIR)).toBe(true);
  });

  it("org-sections surface references retention intercept logic", () => {
    const src = readFileSync(resolve(SURFACES_DIR, "org-sections.ts"), "utf-8");
    expect(src).toContain("retention");
  });

  it("solo-client-state surface references retention intercept logic", () => {
    const src = readFileSync(resolve(SURFACES_DIR, "solo-client-state.ts"), "utf-8");
    expect(src).toContain("retention");
  });

  it("state-feed surface references retention intercept logic", () => {
    const src = readFileSync(resolve(SURFACES_DIR, "state-feed.ts"), "utf-8");
    expect(src).toContain("retention");
  });
});

/* -------------------------------------------------------------------------- */
/*  Structural: retention intercept integration in surfaces                   */
/* -------------------------------------------------------------------------- */

describe("retention intercept - structural properties", () => {
  const surfaceFiles = ["org-sections.ts", "solo-client-state.ts", "state-feed.ts"];

  it.each(surfaceFiles)("%s does not use Math.random for retention logic", (file) => {
    const filePath = resolve(SURFACES_DIR, file);
    if (!existsSync(filePath)) return;
    const src = readFileSync(filePath, "utf-8");
    expect(src).not.toContain("Math.random");
  });

  it.each(surfaceFiles)("%s does not delete retention records", (file) => {
    const filePath = resolve(SURFACES_DIR, file);
    if (!existsSync(filePath)) return;
    const src = readFileSync(filePath, "utf-8");
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});
