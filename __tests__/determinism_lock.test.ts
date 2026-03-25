/**
 * Global determinism lock: no Math.random, crypto.randomUUID in strategy-engine, execution-plan, compiler, emit, voice plan builder.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");
const LOCKED_PATHS = [
  "src/lib/domain-packs/strategy-engine.ts",
  "src/lib/execution-plan/build.ts",
  "src/lib/execution-plan/emit.ts",
  "src/lib/execution-plan/run.ts",
  "src/lib/speech-governance/compiler.ts",
  "src/lib/voice/plan/build.ts",
];

describe("Determinism lock", () => {
  it("locked paths do not contain Math.random", () => {
    const violators: string[] = [];
    for (const rel of LOCKED_PATHS) {
      const full = path.join(ROOT, rel);
      try {
        const content = readFileSync(full, "utf-8");
        if (content.includes("Math.random")) violators.push(rel);
      } catch {
        // file missing
      }
    }
    expect(violators).toEqual([]);
  });

  it("locked paths do not contain crypto.randomUUID", () => {
    const violators: string[] = [];
    for (const rel of LOCKED_PATHS) {
      const full = path.join(ROOT, rel);
      try {
        const content = readFileSync(full, "utf-8");
        if (content.includes("crypto.randomUUID")) violators.push(rel);
      } catch {
        // file missing
      }
    }
    expect(violators).toEqual([]);
  });
});
