/**
 * Template variant fallback. No freeform fallback when variant missing.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("Template variant fallback", () => {
  it("path-variant is deterministic (no random, no text generation)", () => {
    const pv = path.join(ROOT, "src/lib/intelligence/path-variant.ts");
    const content = readFileSync(pv, "utf-8");
    expect(content).not.toContain("Math.random");
    expect(content).not.toContain("crypto.randomUUID");
    expect(content).not.toMatch(/openai|anthropic|generateText|createCompletion/);
  });

  it("compiler or template selection does not introduce freeform", () => {
    const compiler = path.join(ROOT, "src/lib/speech-governance/compiler.ts");
    if (!existsSync(compiler)) return;
    const content = readFileSync(compiler, "utf-8");
    expect(content).not.toMatch(/random|randomUUID/);
  });
});
