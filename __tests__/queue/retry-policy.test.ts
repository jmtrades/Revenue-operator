/**
 * Phase 78 Task 11.4 — Queue retry cap.
 *
 * The DB-backed job queue previously did this on claim:
 *
 *   await db.from("job_queue").update({ status: "processing", attempts: 1 }).eq("id", r.id);
 *
 * That overwrote `attempts` on EVERY dequeue, so a job that had already been
 * retried five times would come back looking brand-new. No retry cap was
 * actually enforced, so a poison-pill job could loop forever. These tests
 * pin the new policy:
 *
 *  - `nextAttemptNumber(prev)` — monotonic, starts at 1.
 *  - `decideRetryOrDlq(nextAttempt)` — once >= MAX_QUEUE_ATTEMPTS, the job
 *     MUST be routed to the DLQ.
 *  - `MAX_QUEUE_ATTEMPTS` is exported so workers can log the cap without
 *     re-deriving it.
 */
import { describe, it, expect } from "vitest";
import {
  MAX_QUEUE_ATTEMPTS,
  nextAttemptNumber,
  decideRetryOrDlq,
} from "../../src/lib/queue/retry-policy";

describe("queue retry policy", () => {
  it("MAX_QUEUE_ATTEMPTS is a small positive integer", () => {
    expect(MAX_QUEUE_ATTEMPTS).toBeGreaterThanOrEqual(3);
    expect(MAX_QUEUE_ATTEMPTS).toBeLessThanOrEqual(10);
    expect(Number.isInteger(MAX_QUEUE_ATTEMPTS)).toBe(true);
  });

  it("nextAttemptNumber increments monotonically from 1", () => {
    expect(nextAttemptNumber(undefined)).toBe(1);
    expect(nextAttemptNumber(null)).toBe(1);
    expect(nextAttemptNumber(0)).toBe(1);
    expect(nextAttemptNumber(1)).toBe(2);
    expect(nextAttemptNumber(4)).toBe(5);
  });

  it("nextAttemptNumber treats negatives / non-numbers defensively as 0", () => {
    expect(nextAttemptNumber(-5)).toBe(1);
    // Runtime safety for bad DB reads.
    expect(nextAttemptNumber(Number.NaN)).toBe(1);
  });

  it("decideRetryOrDlq routes below-cap attempts to 'retry'", () => {
    for (let i = 1; i < MAX_QUEUE_ATTEMPTS; i++) {
      expect(decideRetryOrDlq(i)).toBe("retry");
    }
  });

  it("decideRetryOrDlq routes at-cap and above attempts to 'dlq'", () => {
    expect(decideRetryOrDlq(MAX_QUEUE_ATTEMPTS)).toBe("dlq");
    expect(decideRetryOrDlq(MAX_QUEUE_ATTEMPTS + 1)).toBe("dlq");
    expect(decideRetryOrDlq(MAX_QUEUE_ATTEMPTS + 100)).toBe("dlq");
  });

  it("regression: a job whose claim incremented to the cap must NOT be 'retry'", () => {
    // Previously, `update({ attempts: 1 })` reset the count on every claim
    // so this case could never happen. The contract here locks the new path:
    // once the incremented attempt count hits the cap, the job is dead.
    const prev = MAX_QUEUE_ATTEMPTS - 1;
    const next = nextAttemptNumber(prev);
    expect(next).toBe(MAX_QUEUE_ATTEMPTS);
    expect(decideRetryOrDlq(next)).toBe("dlq");
  });
});
