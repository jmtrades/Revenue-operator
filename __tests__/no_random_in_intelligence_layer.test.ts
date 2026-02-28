/**
 * Intelligence layer: no Math.random, no crypto.randomUUID in strategy/execution paths.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const INTELLIGENCE_DIR = path.join(ROOT, "src/lib/intelligence");

describe("No random in intelligence layer", () => {
  const files = readdirSync(INTELLIGENCE_DIR).filter((f) => f.endsWith(".ts"));
  for (const file of files) {
    it(`${file} has no Math.random or crypto.randomUUID`, () => {
      const content = readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8");
      expect(content).not.toContain("Math.random");
      expect(content).not.toContain("crypto.randomUUID");
    });
  }
});
