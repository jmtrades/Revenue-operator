/**
 * Doctrine enforcement tests: Signal idempotency, state reducer deterministic, no direct send from decision.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { idempotencyKey } from "../src/lib/signals/types";
import { reduceLeadState } from "../src/lib/state/reducer";
import type { LifecycleState } from "../src/lib/state/types";

describe("Signal layer — idempotency key", () => {
  it("same inputs produce same idempotency_key", () => {
    const k1 = idempotencyKey("InboundMessageReceived", "ws1", "lead1", "msg-sid-123");
    const k2 = idempotencyKey("InboundMessageReceived", "ws1", "lead1", "msg-sid-123");
    expect(k1).toBe(k2);
  });

  it("different external id produces different key", () => {
    const k1 = idempotencyKey("InboundMessageReceived", "ws1", "lead1", "sid-1");
    const k2 = idempotencyKey("InboundMessageReceived", "ws1", "lead1", "sid-2");
    expect(k1).not.toBe(k2);
  });
});

describe("State reducer — deterministic", () => {
  it("NEW + InboundMessageReceived => ENGAGED", () => {
    const next = reduceLeadState("NEW", {
      signal_type: "InboundMessageReceived",
      payload: {},
      occurred_at: new Date().toISOString(),
    });
    expect(next).toBe("ENGAGED");
  });

  it("same signal and state always yield same next state", () => {
    const signal = {
      signal_type: "BookingCreated" as const,
      payload: { start_at: "2025-01-01T10:00:00Z" },
      occurred_at: "2025-01-01T09:00:00Z",
    };
    const a = reduceLeadState("QUALIFIED", signal);
    const b = reduceLeadState("QUALIFIED", signal);
    expect(a).toBe(b);
    expect(a).toBe("BOOKED");
  });

  it("replay order matters but same order => same result", () => {
    let state: LifecycleState = "NEW";
    const signals = [
      { signal_type: "InboundMessageReceived" as const, payload: {}, occurred_at: "2025-01-01T10:00:00Z" },
      { signal_type: "CustomerReplied" as const, payload: {}, occurred_at: "2025-01-01T11:00:00Z" },
    ];
    for (const s of signals) {
      state = reduceLeadState(state, s);
    }
    expect(state).toBe("ENGAGED");
    state = "NEW";
    for (const s of signals) {
      state = reduceLeadState(state, s);
    }
    expect(state).toBe("ENGAGED");
  });
});

describe("Decision path — no direct send", () => {
  it("decision-job does not import sendOutbound from delivery/provider", () => {
    const decisionJobPath = path.join(process.cwd(), "src/lib/pipeline/decision-job.ts");
    const content = readFileSync(decisionJobPath, "utf8");
    expect(content).not.toMatch(/from ["']@\/lib\/delivery\/provider["']/);
    expect(content).not.toMatch(/sendOutbound/);
  });

  it("decision-with-engines does not import sendOutbound from delivery/provider", () => {
    const path2 = path.join(process.cwd(), "src/lib/pipeline/decision-with-engines.ts");
    const content = readFileSync(path2, "utf8");
    expect(content).not.toMatch(/from ["']@\/lib\/delivery\/provider["']/);
    expect(content).not.toMatch(/sendOutbound/);
  });

  it("action-queue worker is the only pipeline code that imports sendOutbound", () => {
    const workerPath = path.join(process.cwd(), "src/lib/action-queue/worker.ts");
    const content = readFileSync(workerPath, "utf8");
    expect(content).toMatch(/sendOutbound/);
    expect(content).toMatch(/delivery\/provider/);
  });
});

describe("rebuildLeadStateFromSignals — deterministic", () => {
  it("reduceLeadState produces same result across runs for same inputs", () => {
    const signals: Array<{ signal_type: "InboundMessageReceived" | "BookingCreated"; payload: Record<string, unknown>; occurred_at: string }> = [
      { signal_type: "InboundMessageReceived", payload: {}, occurred_at: "2025-01-01T10:00:00Z" },
      { signal_type: "BookingCreated", payload: { start_at: "2025-01-02T10:00:00Z" }, occurred_at: "2025-01-02T09:00:00Z" },
    ];
    let state: LifecycleState = "NEW";
    for (const s of signals) state = reduceLeadState(state, s);
    const first = state;
    state = "NEW";
    for (const s of signals) state = reduceLeadState(state, s);
    const second = state;
    expect(first).toBe(second);
    expect(first).toBe("BOOKED");
  });
});
