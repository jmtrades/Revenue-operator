/**
 * Outcome taxonomy: no Math.random, no crypto.randomUUID in resolver or insert.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const TAXONOMY_PATH = path.join(ROOT, "src/lib/intelligence/outcome-taxonomy.ts");

describe("Universal outcome no random", () => {
  it("outcome-taxonomy.ts contains no Math.random", () => {
    const content = readFileSync(TAXONOMY_PATH, "utf-8");
    expect(content).not.toContain("Math.random");
  });

  it("outcome-taxonomy.ts contains no crypto.randomUUID", () => {
    const content = readFileSync(TAXONOMY_PATH, "utf-8");
    expect(content).not.toContain("crypto.randomUUID");
  });
});
