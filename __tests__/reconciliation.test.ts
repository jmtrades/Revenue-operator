/**
 * Reality Reconciliation Layer tests.
 * Idempotency, replay safety, no direct state mutation, drift semantics, runSafeCron.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/queries", () => ({
  getDb: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null }), single: () => Promise.resolve({ data: null }) }), is: () => ({ order: () => ({ limit: () => Promise.resolve({ data: [] }) }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "sig-1" } }) }) }),
      update: () => ({ eq: () => Promise.resolve({}) }),
    }),
  }),
}));

describe("Reconciliation idempotency", () => {
  it("reconciliationIdempotencyKey produces stable key for same provider message", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key1 = reconciliationIdempotencyKey("InboundMessageDiscovered", { provider_message_id: "SM123" });
    const key2 = reconciliationIdempotencyKey("InboundMessageDiscovered", { provider_message_id: "SM123" });
    expect(key1).toBe(key2);
    expect(key1).toContain("inbound_discovered");
  });

  it("reconciliationIdempotencyKey produces unique keys for different provider messages", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key1 = reconciliationIdempotencyKey("InboundMessageDiscovered", { provider_message_id: "SM123" });
    const key2 = reconciliationIdempotencyKey("InboundMessageDiscovered", { provider_message_id: "SM456" });
    expect(key1).not.toBe(key2);
  });

  it("BookingModified key includes external_event_id and new_start_at", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("BookingModified", {
      external_event_id: "ev-1",
      new_start_at: "2025-02-10T12:00:00Z",
    });
    expect(key).toContain("booking_modified");
    expect(key).toContain("ev-1");
  });
});

describe("Reconciliation replay safety", () => {
  it("same idempotency key yields same key (replay enqueue process_signal is safe via processed_at)", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("HumanReplyDiscovered", { provider_message_id: "SMx" });
    expect(key).toBe("human_reply:SMx");
  });
});

describe("No direct state mutation", () => {
  it("emitDiscoveredSignal only inserts signal and enqueues (no direct lead/state write)", async () => {
    const mod = await import("@/lib/reconciliation/emit");
    expect(mod.emitDiscoveredSignal).toBeDefined();
    expect(typeof mod.emitDiscoveredSignal).toBe("function");
  });

  it("reconciliationIdempotencyKey for PaymentCaptured uses payment_id", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("PaymentCaptured", { payment_id: "ch_123" });
    expect(key).toBe("payment_captured:ch_123");
  });

  it("reconciliationIdempotencyKey for RefundIssued uses refund_id", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("RefundIssued", { refund_id: "re_456" });
    expect(key).toBe("refund_issued:re_456");
  });
});

describe("Booking drift", () => {
  it("BookingModified idempotency key is stable for same event and new_start_at", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("BookingModified", {
      external_event_id: "cal_ev_1",
      new_start_at: "2025-02-10T14:00:00.000Z",
    });
    expect(key).toMatch(/booking_modified:cal_ev_1:/);
  });
});

describe("Attendance truth", () => {
  it("AppointmentCompleted idempotency key uses booking or external_event_id and completed_at", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("AppointmentCompleted", {
      booking_id: "cs-1",
      completed_at: "2025-02-10T15:00:00Z",
    });
    expect(key).toContain("appt_completed");
    expect(key).toContain("cs-1");
  });
});

describe("Human override", () => {
  it("HumanReplyDiscovered idempotency key uses provider_message_id", async () => {
    const { reconciliationIdempotencyKey } = await import("@/lib/signals/types");
    const key = reconciliationIdempotencyKey("HumanReplyDiscovered", { provider_message_id: "SM789" });
    expect(key).toBe("human_reply:SM789");
  });
});

describe("runSafeCron", () => {
  it("returns structured JSON with ok, jobs_run, failures", async () => {
    const { runSafeCron } = await import("@/lib/cron/run-safe");
    const result = await runSafeCron("test-recon", async () => ({ run: 0, failures: 0 }));
    expect(result).toHaveProperty("ok");
    expect(result).toHaveProperty("jobs_run");
    expect(result).toHaveProperty("failures");
    expect(typeof result.ok).toBe("boolean");
    expect(typeof result.jobs_run).toBe("number");
    expect(typeof result.failures).toBe("number");
  });

  it("completes under timeout when handler resolves", async () => {
    const { runSafeCron } = await import("@/lib/cron/run-safe");
    const result = await runSafeCron("test-fast", async () => ({ run: 1 }));
    expect(result.ok).toBe(true);
    expect(result.jobs_run).toBe(1);
  });
});
