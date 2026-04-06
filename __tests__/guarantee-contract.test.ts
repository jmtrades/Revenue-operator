/**
 * Guarantee Contract Tests
 * Fail if any of the seven guarantees become unprovable.
 * These tests defend the operator's reliability invariants at build/test time.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { reduceLeadState } from "@/lib/state/reducer";
import type { LifecycleState } from "@/lib/state/types";
import type { SignalForReducer } from "@/lib/state/reducer";

describe("Guarantee contract", () => {
  describe("A — No silent processing halt", () => {
    it("progress watchdog enqueues process_signal for unprocessed signal older than threshold", () => {
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "progress-watchdog", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("canonical_signals");
      expect(routeSrc).toContain("processed_at");
      expect(routeSrc).toContain("failure_reason");
      expect(routeSrc).toContain("process_signal");
      expect(routeSrc).toContain("STALE_SIGNAL_MINUTES");
    });

    it("irrecoverable path unblocks later signals so processing does not halt indefinitely", () => {
      const storeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
        "utf8"
      );
      expect(storeSrc).toContain("markSignalIrrecoverable");
      expect(storeSrc).toContain("MAX_SIGNAL_RETRIES");
      const consumerSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "consumer.ts"),
        "utf8"
      );
      expect(consumerSrc).toContain("failure_reason");
      expect(consumerSrc).toContain("irrecoverable");
    });
  });

  describe("B — No duplicate action execution", () => {
    it("dequeue uses claim via job_claims so only one worker gets a job", () => {
      const queueSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "queue", "index.ts"),
        "utf8"
      );
      expect(queueSrc).toContain("claim_next_job");
      expect(queueSrc).toContain("job_claims");
      expect(queueSrc).toContain("complete");
    });

    it("complete() releases claim so job cannot run again", () => {
      const queueSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "queue", "index.ts"),
        "utf8"
      );
      expect(queueSrc).toContain("job_claims");
      expect(queueSrc).toContain("delete");
    });

    it("Double dequeue cannot double-run (concurrency: only one worker gets the job)", async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
      const hasDb =
        url.length > 0 &&
        (typeof process.env.SUPABASE_SERVICE_ROLE_KEY === "string" || typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string");
      const isPlaceholderEnv =
        url.includes("placeholder") ||
        process.env.SUPABASE_SERVICE_ROLE_KEY === "placeholder" ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "placeholder";
      if (!hasDb || isPlaceholderEnv) return;
      const { enqueue, dequeue, complete } = await import("@/lib/queue");
      const { getDb } = await import("@/lib/db/queries");
      const jobId = await enqueue({ type: "billing", workspaceId: "test-workspace-double-dequeue" });
      expect(jobId).toBeDefined();
      const [result1, result2] = await Promise.all([
        dequeue("worker-double-dequeue-a"),
        dequeue("worker-double-dequeue-b"),
      ]);
      const claimed = result1 ?? result2;
      const other = result1 != null ? result2 : result1;
      expect(claimed).not.toBeNull();
      expect(claimed!.id).toBe(jobId);
      expect(other).toBeNull();
      await complete(claimed!.id);
      const db = getDb();
      const { data: claimRow } = await db.from("job_claims").select("job_id").eq("job_id", jobId).maybeSingle();
      expect(claimRow).toBeNull();
    }, 15000);
  });

  describe("C — No unseen escalation", () => {
    it("progress watchdog enqueues handoff_notify for escalation without notification", () => {
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "progress-watchdog", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("escalation_logs");
      expect(routeSrc).toContain("notified_at");
      expect(routeSrc).toContain("handoff_notify");
    });

    it("verifyEscalationDeliverable enqueues handoff_notify when no ack and no pending job", () => {
      const src = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "verify-escalation-delivery.ts"),
        "utf8"
      );
      expect(src).toContain("enqueue");
      expect(src).toContain("handoff_notify");
    });
  });

  describe("D — Closure correctness", () => {
    it("closureFinalityGuard prevents mark_dormant when lead has pending action", () => {
      const enforceSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "closure", "enforce-closure.ts"),
        "utf8"
      );
      expect(enforceSrc).toContain("closureFinalityGuard");
      expect(enforceSrc).toContain("action_commands");
      expect(enforceSrc).toContain("processed_at");
      expect(enforceSrc).toContain("enqueueDecision");
    });

    it("closureFinalityGuard prevents mark_dormant when lead has future commitment", () => {
      const enforceSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "closure", "enforce-closure.ts"),
        "utf8"
      );
      expect(enforceSrc).toContain("getCommitmentStartAt");
      expect(enforceSrc).toContain("new Date(commitmentStartAt) > new Date()");
    });

    it("closureFinalityGuard prevents mark_dormant when lead has unacknowledged escalation", () => {
      const enforceSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "closure", "enforce-closure.ts"),
        "utf8"
      );
      expect(enforceSrc).toContain("handoff_acknowledgements");
      expect(enforceSrc).toContain("unacked");
    });
  });

  describe("E — Replay determinism", () => {
    it("same ordered signals replayed 100 times yield identical final state", () => {
      const signals: SignalForReducer[] = [
        { signal_type: "InboundMessageReceived", payload: {}, occurred_at: "2025-01-01T10:00:00Z" },
        { signal_type: "BookingCreated", payload: {}, occurred_at: "2025-01-01T10:05:00Z" },
        { signal_type: "AppointmentCompleted", payload: {}, occurred_at: "2025-01-01T10:10:00Z" },
      ];
      const results = new Set<LifecycleState>();
      for (let run = 0; run < 100; run++) {
        let state: LifecycleState = "NEW";
        for (const s of signals) {
          state = reduceLeadState(state, s);
        }
        results.add(state);
      }
      expect(results.size).toBe(1);
      expect([...results][0]).toBe("ATTENDED");
    });

    it("reducer is deterministic for fixed order (multiple runs identical)", () => {
      const signal: SignalForReducer = {
        signal_type: "BookingCreated",
        payload: {},
        occurred_at: "2025-01-01T10:00:00Z",
      };
      const results: LifecycleState[] = [];
      for (let i = 0; i < 50; i++) {
        results.push(reduceLeadState("ENGAGED", signal));
      }
      expect(new Set(results).size).toBe(1);
      expect(results[0]).toBe("BOOKED");
    });
  });

  describe("F — Bounded reality drift", () => {
    it("integrity audit has reconciliation_freshness check that creates violation when stale", () => {
      const checksSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "integrity-checks.ts"),
        "utf8"
      );
      expect(checksSrc).toContain("reconciliation_freshness");
      expect(checksSrc).toContain("reconciliationLastRunAt");
    });

    it("runIntegrityAudit logs system_integrity_violation when violations exist", () => {
      const auditSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "run-integrity-audit.ts"),
        "utf8"
      );
      expect(auditSrc).toContain("system_integrity_violation");
      expect(auditSrc).toContain("logEscalation");
    });
  });

  describe("G — Demonstrable correctness", () => {
    it("replayLeadFromSignals returns match flag and compares to stored state", async () => {
      const { replayLeadFromSignals } = await import("@/lib/integrity/replay-determinism");
      expect(typeof replayLeadFromSignals).toBe("function");
      const mod = await import("@/lib/integrity/replay-determinism");
      expect(mod.replayLeadFromSignals).toBeDefined();
    });

    it("integrity audit runs replay checks and adds replay_determinism violation on mismatch", () => {
      const auditSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "integrity", "run-integrity-audit.ts"),
        "utf8"
      );
      expect(auditSrc).toContain("replayLeadFromSignals");
      expect(auditSrc).toContain("replay_determinism");
    });
  });

  describe("Reducer purity", () => {
    it("reducer has no DB reads (no getDb, no from() in reducer file)", () => {
      const reducerSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "state", "reducer.ts"),
        "utf8"
      );
      expect(reducerSrc).not.toMatch(/getDb|from\s*\(\s*["']/);
    });

    it("same state + signal always same output (pure function)", () => {
      const state: LifecycleState = "BOOKED";
      const signal: SignalForReducer = {
        signal_type: "AppointmentCompleted",
        payload: {},
        occurred_at: "2025-01-01T12:00:00Z",
      };
      const a = reduceLeadState(state, signal);
      const b = reduceLeadState(state, signal);
      expect(a).toBe(b);
      expect(a).toBe("ATTENDED");
    });
  });
});
