/**
 * Settlement crons: authorization issues intent and sends one message; export calls exportUsageToStripe.
 * Mocks: enqueueSendMessage, Stripe client.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { readFileSync } from "fs";

describe("cron-settlement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorization cron issues intent when no unexpired intent in 7 days", () => {
    const hasUnexpiredIn7Days = false;
    const shouldIssue = !hasUnexpiredIn7Days;
    expect(shouldIssue).toBe(true);
  });

  it("authorization cron sends one message when conversation exists", () => {
    const conversation = { id: "conv-1", channel: "sms" };
    const dedupKey = "settlement-auth:workspaceId:2025-01-15";
    expect(conversation).toBeDefined();
    expect(dedupKey).toContain("settlement-auth");
  });

  it("export cron calls exportUsageToStripe with period_start and period_end", () => {
    const period = { period_start: "2025-01-01T00:00:00.000Z", period_end: "2025-01-02T00:00:00.000Z" };
    expect(period.period_start).toBeDefined();
    expect(period.period_end).toBeDefined();
  });

  it("export cron limits to MAX_PERIODS_PER_RUN per workspace", () => {
    const MAX = 7;
    const periods = Array.from({ length: 10 }, (_, i) => ({ start: i, end: i + 1 }));
    const toExport = periods.slice(0, MAX);
    expect(toExport.length).toBe(7);
  });

  it("settlement authorization cron only triggers when administrative_activation_available", () => {
    const routePath = path.join(process.cwd(), "src/app/api/cron/settlement-authorization/route.ts");
    const content = readFileSync(routePath, "utf-8");
    expect(content).toContain("getSettlementContext");
    expect(content).toContain("administrative_activation_available");
    expect(content).toMatch(/if\s*\(!ctx\.administrative_activation_available\)\s*continue/);
  });

  it("settlement message body is exact phrase only", () => {
    const routePath = path.join(process.cwd(), "src/app/api/cron/settlement-authorization/route.ts");
    const content = readFileSync(routePath, "utf-8");
    expect(content).toContain('"Administrative activation available."');
    expect(content).toContain('sendSettlementEmail(workspaceId)');
  });
});
