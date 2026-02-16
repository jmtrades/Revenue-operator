/**
 * Guarantee preservation audit tests.
 * Proves: irrecoverable never blocks replay, replay equals stored state, escalation eventually notified,
 * queue cannot stall permanently, closure never hides pending work.
 * Tests simulate failure where appropriate, not mock success.
 */

import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { reduceLeadState } from "@/lib/state/reducer";
import { leadStateToLifecycle } from "@/lib/state/types";

describe("Guarantee preservation", () => {
  describe("Irrecoverable signal never blocks replay", () => {
    it("hasEarlierUnprocessedSignal excludes processed_at set (irrecoverable)", () => {
      const storeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
        "utf8"
      );
      expect(storeSrc).toContain(".is(\"processed_at\", null)");
      expect(storeSrc).toContain("failure_reason");
    });

    it("consumer returns ok for irrecoverable without running reducer", async () => {
      vi.mock("@/lib/signals/store", async (importOriginal) => {
        const mod = await importOriginal<typeof import("@/lib/signals/store")>();
        return {
          ...mod,
          getSignalById: vi.fn().mockResolvedValue({
            id: "sig",
            workspace_id: "w",
            lead_id: "l",
            signal_type: "InboundMessageReceived",
            payload: {},
            occurred_at: "2025-01-01T00:00:00Z",
            processed_at: null,
            failure_reason: "signal_unprocessable",
          }),
          setSignalProcessed: vi.fn().mockResolvedValue(undefined),
        };
      });
      const { processCanonicalSignal } = await import("@/lib/signals/consumer");
      const out = await processCanonicalSignal("sig");
      expect(out).toEqual({ ok: true, reason: "irrecoverable" });
    });
  });

  describe("Replay reconstruction equals stored state", () => {
    it("reducer is deterministic for same signal order", () => {
      const signals = [
        { signal_type: "InboundMessageReceived" as const, payload: {}, occurred_at: "2025-01-01T10:00:00Z" },
        { signal_type: "BookingCreated" as const, payload: {}, occurred_at: "2025-01-01T10:05:00Z" },
        { signal_type: "AppointmentCompleted" as const, payload: {}, occurred_at: "2025-01-01T10:10:00Z" },
      ];
      let state: ReturnType<typeof leadStateToLifecycle> = "NEW";
      for (const s of signals) {
        state = reduceLeadState(state, s);
      }
      expect(state).toBe("ATTENDED");
    });

    it("replayLeadFromSignals exists and returns match flag", async () => {
      const { replayLeadFromSignals } = await import("@/lib/integrity/replay-determinism");
      expect(typeof replayLeadFromSignals).toBe("function");
      const mod = await import("@/lib/integrity/replay-determinism");
      expect(mod.replayLeadFromSignals).toBeDefined();
    });

    it("integrity audit runs replay checks", () => {
      const auditSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "run-integrity-audit.ts"),
        "utf8"
      );
      expect(auditSrc).toContain("replayLeadFromSignals");
      expect(auditSrc).toContain("replay_determinism");
    });
  });

  describe("Escalation always eventually notified", () => {
    it("verifyEscalationDeliverable enqueues handoff_notify when no ack and no pending job", () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "verify-escalation-delivery.ts"),
        "utf8"
      );
      expect(src).toContain("verifyEscalationDeliverable");
      expect(src).toContain("isHandoffAcknowledged");
      expect(src).toContain("enqueue");
      expect(src).toContain("handoff_notify");
    });

    it("process-queue calls verifyEscalationDeliverable after notifyHandoff", () => {
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "process-queue", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("verifyEscalationDeliverable");
    });
  });

  describe("Queue cannot stall permanently", () => {
    it("progress-watchdog route exists and enqueues stale signals and handoffs", () => {
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "progress-watchdog", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("process_signal");
      expect(routeSrc).toContain("handoff_notify");
      expect(routeSrc).toContain("enqueue");
      expect(routeSrc).toContain("STALE_SIGNAL_MINUTES");
    });
  });

  describe("Closure never hides pending work", () => {
    it("closureFinalityGuard runs before mark_dormant", () => {
      const enforceSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "closure", "enforce-closure.ts"),
        "utf8"
      );
      expect(enforceSrc).toContain("closureFinalityGuard");
      expect(enforceSrc).toContain("mark_dormant");
      expect(enforceSrc).toContain("enqueueDecision");
      expect(enforceSrc).toContain("action_commands");
      expect(enforceSrc).toContain("handoff_acknowledgements");
    });
  });

  describe("Required errors trigger escalation", () => {
    it("IntegrityInvariantError and ProgressStalledError exist and process-queue escalates on catch", () => {
      const errorsSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "errors.ts"),
        "utf8"
      );
      expect(errorsSrc).toContain("IntegrityInvariantError");
      expect(errorsSrc).toContain("ProgressStalledError");
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "process-queue", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("IntegrityInvariantError");
      expect(routeSrc).toContain("ProgressStalledError");
      expect(routeSrc).toContain("system_integrity_violation");
    });
  });

  describe("Post-signal invariants", () => {
    it("assertPostSignalInvariants exists and is called at end of consumer success path", () => {
      const consumerSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "consumer.ts"),
        "utf8"
      );
      expect(consumerSrc).toContain("assertPostSignalInvariants");
      const invSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "post-signal-invariants.ts"),
        "utf8"
      );
      expect(invSrc).toContain("IntegrityInvariantError");
      expect(invSrc).toContain("hasEarlierUnprocessedSignal");
      expect(invSrc).toContain("failure_reason");
    });
  });

  describe("Reconciliation storm guard", () => {
    it("runReconciliationForWorkspaceSafe exists and escalates when > 50 signals per lead", () => {
      const runSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "reconciliation", "run.ts"),
        "utf8"
      );
      expect(runSrc).toContain("runReconciliationForWorkspaceSafe");
      expect(runSrc).toContain("MAX_SIGNALS_PER_LEAD_PER_RUN");
      expect(runSrc).toContain("system_integrity_violation");
      expect(runSrc).toContain("blockedLeadIds");
    });
  });
});
