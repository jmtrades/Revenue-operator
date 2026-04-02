/**
 * Structural tests for src/lib/doctrine/
 * Verifies: enforcement functions, legacy-to-signal conversion, no deletes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("doctrine/enforce module", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/doctrine/enforce.ts"), "utf-8");

  it("exports isDoctrineEnforced", () => {
    expect(src).toContain("export function isDoctrineEnforced");
  });

  it("exports assertNotEnforcedOrConvert", () => {
    expect(src).toContain("export function assertNotEnforcedOrConvert");
  });

  it("exports logDoctrineViolation", () => {
    expect(src).toContain("export async function logDoctrineViolation");
  });

  it("checks DOCTRINE_ENFORCED env var", () => {
    expect(src).toContain("DOCTRINE_ENFORCED");
  });

  it("logs violations to doctrine_violations table", () => {
    expect(src).toContain("doctrine_violations");
  });

  it("throws on doctrine violation when enforced", () => {
    expect(src).toContain("throw new Error");
    expect(src).toContain("Doctrine violation");
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});

describe("doctrine/legacy-to-signal module", () => {
  const modulePath = path.join(ROOT, "src/lib/doctrine/legacy-to-signal.ts");

  it("module exists", () => {
    expect(existsSync(modulePath)).toBe(true);
  });

  const src = readFileSync(modulePath, "utf-8");

  it("exports convertLegacyWebhookToSignalAndEnqueue", () => {
    expect(src).toContain("export async function convertLegacyWebhookToSignalAndEnqueue");
  });

  it("uses ingestInboundAsSignal for conversion", () => {
    expect(src).toContain("ingestInboundAsSignal");
  });

  it("marks raw webhook as processed", () => {
    expect(src).toContain("processed: true");
  });

  it("enqueues process_signal after conversion", () => {
    expect(src).toContain("process_signal");
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});
