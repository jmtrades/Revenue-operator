/**
 * Strategic layer: no Math.random, no crypto.randomUUID in new files.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  "src/lib/intelligence/strategic-pattern.ts",
  "src/lib/intelligence/workspace-pattern-guard.ts",
  "src/lib/intelligence/deterministic-variant.ts",
];

describe("No random in strategic layer", () => {
  for (const file of FILES) {
    it(`${file} has no Math.random() call`, () => {
      const content = readFileSync(path.join(ROOT, file), "utf-8");
      expect(content).not.toMatch(/Math\.random\s*\(/);
    });
    it(`${file} has no crypto.randomUUID() call`, () => {
      const content = readFileSync(path.join(ROOT, file), "utf-8");
      expect(content).not.toMatch(/crypto\.randomUUID\s*\(|randomUUID\s*\(/);
    });
  }
});
