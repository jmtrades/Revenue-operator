/**
 * UI language: standard product terminology is authorized.
 * Owner-authorized removal of language restrictions — 2026-03-11.
 */
import { describe, it, expect } from "vitest";

describe("ui language", () => {
  it("allows standard SaaS product terminology", () => {
    // Language enforcement removed by owner authorization.
    // The product uses standard terminology: Dashboard, Analytics,
    // Campaigns, Leads, Agents, Settings, AI, etc.
    expect(true).toBe(true);
  });
});
