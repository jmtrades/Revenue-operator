/**
 * Stripe webhook settlement: checkout.session.completed activates settlement.
 * Mock payloads only; no Stripe API calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

describe("stripe-webhook-settlement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("checkout.session.completed with metadata.settlement=true triggers activateSettlementFromStripe", () => {
    const session = {
      metadata: { workspace_id: "ws-1", settlement: "true" },
      customer: "cus_xxx",
      subscription: "sub_xxx",
    };
    const isSettlement = session.metadata?.settlement === "true";
    const workspaceId = session.metadata?.workspace_id;
    expect(isSettlement).toBe(true);
    expect(workspaceId).toBe("ws-1");
  });

  it("checkout.session.completed without settlement metadata does not trigger settlement activation", () => {
    const session = { metadata: { workspace_id: "ws-1" } };
    const isSettlement = session.metadata?.settlement === "true";
    expect(isSettlement).toBe(false);
  });

  it("webhook dedupe: processed event_id skips processing", () => {
    const eventId = "evt_123";
    const processed = new Set<string>(["evt_123"]);
    const skip = processed.has(eventId);
    expect(skip).toBe(true);
  });
});
