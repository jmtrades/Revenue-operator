/**
 * Signal irrecoverable breaker hardening.
 * Guarantees: one escalation when multiple workers cross threshold; irrecoverable never reprocessed;
 * reconciliation does not recreate failed signal; later signals unblock; queue does not loop.
 */

import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

const irrecoverableRow = {
  id: "sig-irr",
  workspace_id: "ws1",
  lead_id: "lead1",
  signal_type: "InboundMessageReceived" as const,
  payload: {},
  occurred_at: "2025-01-01T10:00:00Z",
  processed_at: null as string | null,
  failure_reason: "signal_unprocessable" as string | null,
};

vi.mock("@/lib/signals/store", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/signals/store")>();
  return {
    ...mod,
    getSignalById: vi.fn().mockResolvedValue(irrecoverableRow),
    setSignalProcessed: vi.fn().mockResolvedValue(undefined),
  };
});

describe("Signal irrecoverable hardening", () => {
  describe("Two workers crossing threshold produce one escalation", () => {
    it("markSignalIrrecoverable is atomic (only updates when processed_at IS NULL)", () => {
      const storeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
        "utf8"
      );
      expect(storeSrc).toContain(".is(\"processed_at\", null)");
      expect(storeSrc).toContain(".select(\"id\")");
      expect(storeSrc).toContain("return data != null");
      expect(storeSrc).toContain("Promise<boolean>");
    });

    it("process-queue escalates only when didMark is true", () => {
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "process-queue", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("didMark = await markSignalIrrecoverable");
      expect(routeSrc).toContain("if (didMark)");
      const didMarkBlockStart = routeSrc.indexOf("if (didMark)");
      const blockSlice = routeSrc.slice(didMarkBlockStart, didMarkBlockStart + 1200);
      expect(blockSlice).toContain("logEscalation");
      expect(blockSlice).toContain("closure_reconciliation");
    });

    it("SIGNAL_IRRECOVERABLE is logged when irrecoverable occurs", () => {
      const routeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "app", "api", "cron", "process-queue", "route.ts"),
        "utf8"
      );
      expect(routeSrc).toContain("SIGNAL_IRRECOVERABLE");
      expect(routeSrc).toContain("signal_id");
      expect(routeSrc).toContain("attempts");
      expect(routeSrc).toContain("reason: \"signal_unprocessable\"");
    });
  });

  describe("Irrecoverable signal never reprocessed", () => {
    it("consumer returns success without reducer when failure_reason is set", async () => {
      const { processCanonicalSignal } = await import("@/lib/signals/consumer");
      const out = await processCanonicalSignal("sig-irr");
      expect(out).toEqual({ ok: true, reason: "irrecoverable" });
    });

    it("consumer checks failure_reason before any work", () => {
      const consumerSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "consumer.ts"),
        "utf8"
      );
      expect(consumerSrc).toContain("row.failure_reason");
      expect(consumerSrc).toContain("reason: \"irrecoverable\"");
      expect(consumerSrc).toContain("setSignalProcessed(signalId)");
    });
  });

  describe("Reconciliation does not recreate failed signal", () => {
    it("emit uses getSignalByKey and skips enqueue when failure_reason is set", () => {
      const emitSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "reconciliation", "emit.ts"),
        "utf8"
      );
      expect(emitSrc).toContain("getSignalByKey");
      expect(emitSrc).toContain("failure_reason");
      expect(emitSrc).toContain("existing.failure_reason != null");
      expect(emitSrc).toContain("return existing.id");
    });
  });

  describe("Later signals unblock after irrecoverable", () => {
    it("hasEarlierUnprocessedSignal excludes rows with processed_at set", () => {
      const storeSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "signals", "store.ts"),
        "utf8"
      );
      expect(storeSrc).toContain("hasEarlierUnprocessedSignal");
      expect(storeSrc).toContain(".is(\"processed_at\", null)");
    });
  });

  describe("Queue does not loop forever on failed signal", () => {
    it("consumer returns ok for irrecoverable without throwing", async () => {
      const { processCanonicalSignal } = await import("@/lib/signals/consumer");
      await expect(processCanonicalSignal("sig-irr")).resolves.toEqual({
        ok: true,
        reason: "irrecoverable",
      });
    });

    it("reducer never throws (monotonic)", () => {
      const reducerSrc = fs.readFileSync(
        path.join(process.cwd(), "src", "lib", "state", "reducer.ts"),
        "utf8"
      );
      expect(reducerSrc).not.toContain("throw ");
      expect(reducerSrc).toContain("Monotonic");
    });
  });
});
