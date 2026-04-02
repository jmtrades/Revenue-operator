/**
 * Structural tests for import purpose / connector normalization.
 * Verifies: connectors normalize to pipeline through a single entry point.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("normalize-to-pipeline single entry point", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/normalize-to-pipeline.ts"), "utf-8");

  it("exports processNormalizedInbound as the single pipeline entry", () => {
    expect(src).toContain("processNormalizedInbound");
  });

  it("maps all known channels to DB values", () => {
    const expectedChannels = ["sms", "email", "web", "whatsapp", "webhook"];
    for (const ch of expectedChannels) {
      expect(src).toContain(`"${ch}"`);
    }
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

describe("connectors index re-exports single control path", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/index.ts"), "utf-8");

  it("re-exports processNormalizedInbound (single pipeline entry)", () => {
    expect(src).toContain("processNormalizedInbound");
  });

  it("only re-exports types for adapters (not implementations)", () => {
    // SourceAdapter and DestinationAdapter are type-only exports
    expect(src).toMatch(/export type.*SourceAdapter/);
    expect(src).toMatch(/export type.*DestinationAdapter/);
  });
});

describe("source-adapter verify-then-normalize pattern", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/source-adapter.ts"), "utf-8");

  it("SourceAdapter has verify step before normalize", () => {
    expect(src).toContain("verify: VerifyRequest");
    expect(src).toContain("normalize: NormalizeInbound");
  });

  it("uses NormalizedInboundEvent from universal-model", () => {
    expect(src).toContain("NormalizedInboundEvent");
    expect(src).toContain("universal-model");
  });
});
