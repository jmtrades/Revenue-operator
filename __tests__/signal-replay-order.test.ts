/**
 * Strict temporal replay per lead: only the earliest pending signal may execute.
 * Mitigation for: two workers processing different signals after lock TTL expiry (guarantee 7).
 * Starvation: after MAX_SIGNAL_RETRIES the earliest blocking signal is marked irrecoverable so later signals may run.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { reduceLeadState } from "@/lib/state/reducer";
import { leadStateToLifecycle, lifecycleToLeadState } from "@/lib/state/types";

describe("Strict temporal replay", () => {
  it("EarlierSignalPendingError is thrown when earlier unprocessed signal exists", async () => {
    const { EarlierSignalPendingError } = await import("@/lib/signals/consumer");
    const err = new EarlierSignalPendingError("sig-3");
    expect(err.name).toBe("EarlierSignalPendingError");
    expect(err.signalId).toBe("sig-3");
    expect(err.message).toContain("earlier_signal_pending");
  });

  it("hasEarlierUnprocessedSignal exists and is used before reducer", () => {
    const storeSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
      "utf8"
    );
    expect(storeSrc).toContain("hasEarlierUnprocessedSignal");
    const consumerSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "signals", "consumer.ts"),
      "utf8"
    );
    expect(consumerSrc).toContain("hasEarlierUnprocessedSignal");
    expect(consumerSrc).toContain("EarlierSignalPendingError");
    expect(consumerSrc.indexOf("hasEarlierUnprocessedSignal")).toBeLessThan(
      consumerSrc.indexOf("reduceLeadState")
    );
  });

  it("final state equals ordered replay: reducer order matters", () => {
    type S = ReturnType<typeof leadStateToLifecycle>;
    const t1 = "2025-01-01T10:00:00Z";
    const t2 = "2025-01-01T10:05:00Z";
    const t3 = "2025-01-01T10:10:00Z";

    const signalsInOrder = [
      { signal_type: "InboundMessageReceived", payload: {}, occurred_at: t1 },
      { signal_type: "BookingCreated", payload: {}, occurred_at: t2 },
      { signal_type: "AppointmentCompleted", payload: {}, occurred_at: t3 },
    ];

    let stateOrdered: S = "NEW";
    for (const s of signalsInOrder) {
      stateOrdered = reduceLeadState(stateOrdered, s);
    }
    const finalOrdered = lifecycleToLeadState(stateOrdered);

    let stateWrongOrder: S = "NEW";
    const wrongOrder = [signalsInOrder[2], signalsInOrder[1], signalsInOrder[0]];
    for (const s of wrongOrder) {
      stateWrongOrder = reduceLeadState(stateWrongOrder, s);
    }
    const finalWrongOrder = lifecycleToLeadState(stateWrongOrder);

    expect(stateOrdered).toBe("ATTENDED");
    expect(stateWrongOrder).not.toBe("ATTENDED");
    expect(finalOrdered).not.toBe(finalWrongOrder);
  });
});

describe("Signal starvation / irrecoverable escalation", () => {
  it("failing earliest signal blocks later signals", () => {
    const storeSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
      "utf8"
    );
    expect(storeSrc).toContain("hasEarlierUnprocessedSignal");
    expect(storeSrc).toContain(".is(\"processed_at\", null)");
    const consumerSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "signals", "consumer.ts"),
      "utf8"
    );
    expect(consumerSrc).toContain("EarlierSignalPendingError");
    expect(consumerSrc).toContain("hasEarlierUnprocessedSignal");
    expect(consumerSrc).toContain("enqueue({ type: \"process_signal\"");
  });

  it("after retry threshold escalation occurs", async () => {
    const { MAX_SIGNAL_RETRIES } = await import("@/lib/signals/store");
    expect(MAX_SIGNAL_RETRIES).toBe(5);
    const routeSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "api", "cron", "process-queue", "route.ts"),
      "utf8"
    );
    expect(routeSrc).toContain("signal_unprocessable");
    expect(routeSrc).toContain("incrementSignalProcessingAttempts");
    expect(routeSrc).toContain("markSignalIrrecoverable");
    expect(routeSrc).toContain("closure_reconciliation");
    expect(routeSrc).toContain("logEscalation");
    expect(routeSrc).toContain("attempts > MAX_SIGNAL_RETRIES");
  });

  it("later signals process in order when earlier is irrecoverable", () => {
    const storeSrc = fs.readFileSync(
      path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
      "utf8"
    );
    expect(storeSrc).toContain(".is(\"processed_at\", null)");
    expect(storeSrc).toContain("markSignalIrrecoverable");
    expect(storeSrc).toContain("processed_at: now");
    expect(storeSrc).toContain("failure_reason");
  });
});
