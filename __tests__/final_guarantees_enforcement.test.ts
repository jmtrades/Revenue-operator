/**
 * Structural tests for final guarantees: append-only, no deletes across key modules.
 * Verifies core modules enforce append-only and deterministic patterns.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

const APPEND_ONLY_MODULES = [
  "src/lib/action-intents/index.ts",
  "src/lib/operational-responsibilities/index.ts",
  "src/lib/institutional-auditability/index.ts",
  "src/lib/proof-capsule-period/index.ts",
  "src/lib/doctrine/enforce.ts",
  "src/lib/governance/message-policy.ts",
];

describe("append-only guarantee across core modules", () => {
  for (const modulePath of APPEND_ONLY_MODULES) {
    const fullPath = path.join(ROOT, modulePath);
    const moduleExists = existsSync(fullPath);

    describe(modulePath, () => {
      it("module exists", () => {
        expect(moduleExists).toBe(true);
      });

      if (moduleExists) {
        const src = readFileSync(fullPath, "utf-8");

        it("does not use .delete()", () => {
          expect(src).not.toMatch(/\.delete\s*\(/);
        });

        it("does not use DROP TABLE or TRUNCATE", () => {
          expect(src).not.toMatch(/DROP\s+TABLE/i);
          expect(src).not.toMatch(/TRUNCATE/i);
        });
      }
    });
  }
});

describe("deterministic pattern enforcement", () => {
  it("action-intents uses deduplication keys", () => {
    const src = readFileSync(path.join(ROOT, "src/lib/action-intents/index.ts"), "utf-8");
    expect(src).toContain("dedupe_key");
  });

  it("operational-responsibilities uses unique constraints", () => {
    const src = readFileSync(path.join(ROOT, "src/lib/operational-responsibilities/index.ts"), "utf-8");
    // Unique violation handling
    expect(src).toMatch(/catch\s*\{/);
  });

  it("proof-capsule uses upsert with onConflict", () => {
    const src = readFileSync(path.join(ROOT, "src/lib/proof-capsule-period/index.ts"), "utf-8");
    expect(src).toContain("upsert");
    expect(src).toContain("onConflict");
  });

  it("institutional-auditability caps summary length", () => {
    const src = readFileSync(path.join(ROOT, "src/lib/institutional-auditability/index.ts"), "utf-8");
    expect(src).toContain(".slice(0, 200)");
  });
});
