/**
 * Resolution kernel: no Math.random, no crypto.randomUUID.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const FILES = [
  "question-taxonomy.ts",
  "unresolved-questions.ts",
  "objection-lifecycle.ts",
  "attempt-envelope.ts",
  "outcome-closure.ts",
];

describe("No random in resolution kernel", () => {
  for (const file of FILES) {
    it(`${file} has no Math.random or crypto.randomUUID`, () => {
      const content = readFileSync(path.join(ROOT, "src/lib/intelligence", file), "utf-8");
      expect(content).not.toContain("Math.random");
      expect(content).not.toContain("crypto.randomUUID");
    });
  }
});
