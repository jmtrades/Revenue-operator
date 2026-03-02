/**
 * Conversation kernel (stage, drift, goodwill, snapshot): no Math.random, no crypto.randomUUID.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const KERNEL_FILES = [
  "conversation-stage.ts",
  "drift-detector.ts",
  "goodwill-engine.ts",
  "conversation-snapshot.ts",
];

describe("No random in conversation kernel", () => {
  for (const file of KERNEL_FILES) {
    it(`${file} has no Math.random or crypto.randomUUID`, () => {
      const content = readFileSync(path.join(ROOT, "src/lib/intelligence", file), "utf-8");
      expect(content).not.toContain("Math.random");
      expect(content).not.toContain("crypto.randomUUID");
    });
  }
});
