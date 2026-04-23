/**
 * Phase 13a — Tests for email suppression + Resend webhook normalization.
 *
 * Pure. No DB, no network. We inject a fake SuppressionWriter.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyResendEvent,
  isEmailSuppressed,
  mapResendEventType,
  normalizeEmail,
  normalizeResendWebhook,
  suppressEmail,
  suppressionReasonForEvent,
  type DeliveryEventRow,
  type SuppressionRow,
  type SuppressionWriter,
} from "../src/lib/integrations/email-suppression";

function makeFakeWriter(): SuppressionWriter & {
  suppressions: SuppressionRow[];
  events: DeliveryEventRow[];
} {
  const suppressions: SuppressionRow[] = [];
  const events: DeliveryEventRow[] = [];
  return {
    suppressions,
    events,
    async findSuppression(workspaceId, emailLower) {
      return (
        suppressions.find(
          (s) => s.workspace_id === workspaceId && s.email_lower === emailLower,
        ) ?? null
      );
    },
    async upsertSuppression(row) {
      const idx = suppressions.findIndex(
        (s) => s.workspace_id === row.workspace_id && s.email_lower === row.email_lower,
      );
      if (idx >= 0) suppressions[idx] = { ...suppressions[idx], ...row };
      else suppressions.push({ ...row });
    },
    async insertDeliveryEvent(row) {
      if (row.provider_event_id) {
        const exists = events.some(
          (e) =>
            e.workspace_id === row.workspace_id &&
            e.provider === row.provider &&
            e.provider_event_id === row.provider_event_id,
        );
        if (exists) return { inserted: false };
      }
      events.push({ ...row });
      return { inserted: true };
    },
  };
}

describe("email-suppression.normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Taylor@Acme.CO  ")).toBe("taylor@acme.co");
  });
});

describe("email-suppression.isEmailSuppressed", () => {
  it("returns suppressed:false for an unknown address", async () => {
    const w = makeFakeWriter();
    const r = await isEmailSuppressed("ws-1", "taylor@acme.co", w);
    expect(r.suppressed).toBe(false);
  });

  it("flags invalid addresses as suppressed (invalid_address)", async () => {
    const w = makeFakeWriter();
    const r = await isEmailSuppressed("ws-1", "not-an-email", w);
    expect(r.suppressed).toBe(true);
    expect(r.reason).toBe("invalid_address");
  });

  it("returns suppressed:true once an address is added", async () => {
    const w = makeFakeWriter();
    await suppressEmail("ws-1", "Taylor@Acme.co", "hard_bounce", "resend", w);
    const r = await isEmailSuppressed("ws-1", "taylor@acme.co", w);
    expect(r.suppressed).toBe(true);
    expect(r.reason).toBe("hard_bounce");
  });

  it("honors expiry: an expired suppression no longer blocks", async () => {
    const w = makeFakeWriter();
    const expired = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    w.suppressions.push({
      workspace_id: "ws-1",
      email_lower: "taylor@acme.co",
      reason: "manual",
      source: "manual",
      expires_at: expired,
    });
    const r = await isEmailSuppressed("ws-1", "taylor@acme.co", w);
    expect(r.suppressed).toBe(false);
  });

  it("scopes suppression to the workspace", async () => {
    const w = makeFakeWriter();
    await suppressEmail("ws-A", "taylor@acme.co", "complaint", "resend", w);
    const inA = await isEmailSuppressed("ws-A", "taylor@acme.co", w);
    const inB = await isEmailSuppressed("ws-B", "taylor@acme.co", w);
    expect(inA.suppressed).toBe(true);
    expect(inB.suppressed).toBe(false);
  });
});

describe("email-suppression.suppressEmail", () => {
  it("is idempotent on repeated calls", async () => {
    const w = makeFakeWriter();
    await suppressEmail("ws-1", "x@y.com", "hard_bounce", "resend", w);
    await suppressEmail("ws-1", "X@Y.COM", "hard_bounce", "resend", w);
    await suppressEmail("ws-1", "x@y.com", "hard_bounce", "resend", w);
    expect(w.suppressions.length).toBe(1);
  });

  it("ignores invalid addresses", async () => {
    const w = makeFakeWriter();
    await suppressEmail("ws-1", "not-an-email", "manual", "manual", w);
    await suppressEmail("ws-1", "", "manual", "manual", w);
    expect(w.suppressions.length).toBe(0);
  });
});

describe("email-suppression.mapResendEventType", () => {
  it("maps known event types", () => {
    expect(mapResendEventType("email.sent")).toBe("sent");
    expect(mapResendEventType("email.delivered")).toBe("delivered");
    expect(mapResendEventType("email.bounced")).toBe("bounced");
    expect(mapResendEventType("email.complained")).toBe("complained");
    expect(mapResendEventType("email.unsubscribed")).toBe("unsubscribed");
    expect(mapResendEventType("EMAIL.OPENED")).toBe("opened");
  });

  it("returns null for unknown types", () => {
    expect(mapResendEventType("email.pigeon_carrier_failure")).toBeNull();
    expect(mapResendEventType(undefined)).toBeNull();
    expect(mapResendEventType("")).toBeNull();
  });
});

describe("email-suppression.normalizeResendWebhook", () => {
  it("normalizes a hard bounce", () => {
    const n = normalizeResendWebhook({
      type: "email.bounced",
      created_at: "2026-04-22T12:00:00.000Z",
      data: {
        email_id: "evt-abc123",
        to: ["Taylor@Acme.co"],
        bounce: { type: "Hard", message: "Mailbox does not exist" },
      },
    });
    expect(n).not.toBeNull();
    expect(n?.eventType).toBe("bounced");
    expect(n?.toEmail).toBe("taylor@acme.co");
    expect(n?.recipientDomain).toBe("acme.co");
    expect(n?.bounceType).toBe("hard");
    expect(n?.providerEventId).toBe("evt-abc123");
    expect(n?.occurredAt).toBe("2026-04-22T12:00:00.000Z");
  });

  it("returns null for unmapped event types", () => {
    const n = normalizeResendWebhook({ type: "email.teleported", data: {} });
    expect(n).toBeNull();
  });

  it("falls back to now() for missing created_at", () => {
    const n = normalizeResendWebhook({ type: "email.delivered", data: { email_id: "e1", to: "a@b.co" } });
    expect(n?.occurredAt).toMatch(/^\d{4}-/);
  });
});

describe("email-suppression.suppressionReasonForEvent", () => {
  it("hard bounce → hard_bounce", () => {
    expect(suppressionReasonForEvent({ eventType: "bounced", bounceType: "hard" })).toBe("hard_bounce");
  });

  it("soft bounce → null (handled by threshold logic, not auto-suppress)", () => {
    expect(suppressionReasonForEvent({ eventType: "bounced", bounceType: "soft" })).toBeNull();
  });

  it("complaint → complaint", () => {
    expect(suppressionReasonForEvent({ eventType: "complained", bounceType: null })).toBe("complaint");
  });

  it("unsubscribe → unsubscribe", () => {
    expect(suppressionReasonForEvent({ eventType: "unsubscribed", bounceType: null })).toBe("unsubscribe");
  });

  it("delivered → null (no suppression)", () => {
    expect(suppressionReasonForEvent({ eventType: "delivered", bounceType: null })).toBeNull();
  });

  it("failed → null (transient)", () => {
    expect(suppressionReasonForEvent({ eventType: "failed", bounceType: null })).toBeNull();
  });
});

describe("email-suppression.applyResendEvent", () => {
  let w: ReturnType<typeof makeFakeWriter>;
  beforeEach(() => {
    w = makeFakeWriter();
  });

  it("logs a delivered event without suppressing", async () => {
    const n = normalizeResendWebhook({
      type: "email.delivered",
      created_at: "2026-04-22T12:00:00.000Z",
      data: { email_id: "e1", to: "a@b.co" },
    });
    expect(n).not.toBeNull();
    const r = await applyResendEvent("ws-1", n!, w);
    expect(r.eventInserted).toBe(true);
    expect(r.suppressed).toBe(false);
    expect(w.events.length).toBe(1);
    expect(w.suppressions.length).toBe(0);
  });

  it("adds to suppression on hard bounce", async () => {
    const n = normalizeResendWebhook({
      type: "email.bounced",
      created_at: "2026-04-22T12:00:00.000Z",
      data: { email_id: "e2", to: "dead@nowhere.co", bounce: { type: "hard" } },
    });
    const r = await applyResendEvent("ws-1", n!, w);
    expect(r.suppressed).toBe(true);
    expect(r.suppressionReason).toBe("hard_bounce");
    expect(w.suppressions.length).toBe(1);
    expect(w.suppressions[0]!.email_lower).toBe("dead@nowhere.co");
  });

  it("adds to suppression on complaint", async () => {
    const n = normalizeResendWebhook({
      type: "email.complained",
      created_at: "2026-04-22T12:00:00.000Z",
      data: { email_id: "e3", to: "angry@user.co" },
    });
    const r = await applyResendEvent("ws-1", n!, w);
    expect(r.suppressed).toBe(true);
    expect(r.suppressionReason).toBe("complaint");
    expect(w.suppressions[0]!.source).toBe("resend");
  });

  it("dedupes repeat delivery events on provider_event_id", async () => {
    const n = normalizeResendWebhook({
      type: "email.delivered",
      created_at: "2026-04-22T12:00:00.000Z",
      data: { email_id: "dupe-1", to: "a@b.co" },
    });
    const r1 = await applyResendEvent("ws-1", n!, w);
    const r2 = await applyResendEvent("ws-1", n!, w);
    expect(r1.eventInserted).toBe(true);
    expect(r2.eventInserted).toBe(false);
    expect(w.events.length).toBe(1);
  });

  it("does not suppress on soft bounce", async () => {
    const n = normalizeResendWebhook({
      type: "email.bounced",
      created_at: "2026-04-22T12:00:00.000Z",
      data: { email_id: "e4", to: "busy@mailbox.co", bounce: { type: "soft" } },
    });
    const r = await applyResendEvent("ws-1", n!, w);
    expect(r.suppressed).toBe(false);
    expect(w.suppressions.length).toBe(0);
    // but the event must still be logged
    expect(w.events.length).toBe(1);
  });
});
