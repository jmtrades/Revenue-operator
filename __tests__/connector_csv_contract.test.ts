/**
 * Structural tests for src/lib/connectors/
 * Verifies: connector interfaces, adapter pattern, registry, and normalize-to-pipeline.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import path from "path";

const ROOT = path.resolve(__dirname, "..");

describe("connectors module index", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/index.ts"), "utf-8");

  it("re-exports SourceAdapter type", () => {
    expect(src).toContain("SourceAdapter");
  });

  it("re-exports DestinationAdapter type", () => {
    expect(src).toContain("DestinationAdapter");
  });

  it("re-exports processNormalizedInbound", () => {
    expect(src).toContain("processNormalizedInbound");
  });

  it("re-exports connector registry functions", () => {
    expect(src).toContain("registerConnector");
    expect(src).toContain("getConnector");
    expect(src).toContain("hasConnector");
  });

  it("re-exports ConnectorKind type", () => {
    expect(src).toContain("ConnectorKind");
  });
});

describe("source-adapter interface", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/source-adapter.ts"), "utf-8");

  it("defines SourceAdapter interface with channel, verify, normalize", () => {
    expect(src).toContain("export interface SourceAdapter");
    expect(src).toContain("channel: string");
    expect(src).toContain("verify: VerifyRequest");
    expect(src).toContain("normalize: NormalizeInbound");
  });

  it("defines VerifyRequest type", () => {
    expect(src).toContain("export type VerifyRequest");
  });

  it("defines NormalizeInbound type", () => {
    expect(src).toContain("export type NormalizeInbound");
  });

  it("defines SourceAdapterResult with success field", () => {
    expect(src).toContain("export interface SourceAdapterResult");
    expect(src).toContain("success: boolean");
  });
});

describe("destination-adapter interface", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/destination-adapter.ts"), "utf-8");

  it("defines DestinationAdapter interface", () => {
    expect(src).toContain("export interface DestinationAdapter");
  });

  it("defines SendMessageInput with required fields", () => {
    expect(src).toContain("export interface SendMessageInput");
    expect(src).toContain("workspace_id: string");
    expect(src).toContain("channel: string");
    expect(src).toContain("to: string");
    expect(src).toContain("body: string");
  });

  it("defines DestinationAdapterResult", () => {
    expect(src).toContain("export interface DestinationAdapterResult");
    expect(src).toContain("success: boolean");
  });
});

describe("install-pack interfaces", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/install-pack/interfaces.ts"), "utf-8");

  it("defines ConnectorKind as union of known kinds", () => {
    expect(src).toContain("export type ConnectorKind");
    expect(src).toContain('"email"');
    expect(src).toContain('"calendar"');
    expect(src).toContain('"messaging"');
    expect(src).toContain('"webhook"');
  });

  it("defines EmailConnector interface", () => {
    expect(src).toContain("export interface EmailConnector");
  });

  it("defines CalendarConnector interface", () => {
    expect(src).toContain("export interface CalendarConnector");
  });

  it("defines MessagingConnector interface", () => {
    expect(src).toContain("export interface MessagingConnector");
  });

  it("defines WebhookConnector interface", () => {
    expect(src).toContain("export interface WebhookConnector");
  });
});

describe("connector registry", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/install-pack/registry.ts"), "utf-8");

  it("implements registerConnector", () => {
    expect(src).toContain("export function registerConnector");
  });

  it("implements getConnector", () => {
    expect(src).toContain("export function getConnector");
  });

  it("implements hasConnector", () => {
    expect(src).toContain("export function hasConnector");
  });

  it("uses a Map-based registry", () => {
    expect(src).toContain("new Map");
  });
});

describe("normalize-to-pipeline", () => {
  const src = readFileSync(path.join(ROOT, "src/lib/connectors/normalize-to-pipeline.ts"), "utf-8");

  it("exports processNormalizedInbound", () => {
    expect(src).toContain("processNormalizedInbound");
  });

  it("maps channel names to database values", () => {
    expect(src).toContain("CHANNEL_TO_DB");
    expect(src).toContain('"sms"');
    expect(src).toContain('"email"');
  });

  it("does not use .delete()", () => {
    expect(src).not.toMatch(/\.delete\s*\(/);
  });
});
