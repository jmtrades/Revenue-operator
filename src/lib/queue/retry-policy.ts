/**
 * Phase 78 Task 11.4 — Queue retry-cap policy.
 *
 * Pure helpers that keep the retry cap in ONE place. Callers
 * (queue/index.ts dequeue, queue/burst-drain.ts error path, cron workers)
 * use `nextAttemptNumber` to compute the new `attempts` value and
 * `decideRetryOrDlq` to route exhausted jobs to the DLQ.
 *
 * Why not just DB-side? The claim RPC (claim_next_job) doesn't read or write
 * `attempts` — it only reserves the row. Keeping the cap in TS lets us audit,
 * test, and change it without a migration, and keeps the queue abstraction
 * DB-agnostic at the edges.
 */

/**
 * Maximum number of times a queue job may be attempted before routing to the
 * DLQ. Set to 5 as a conservative default: exponential-backoff workers can
 * burn through 5 attempts across ~15 min (claim TTL) × 5 = ~75 min of wall
 * clock, which is usually long enough for a transient downstream outage to
 * heal while still protecting against poison-pill jobs that loop forever.
 *
 * Keep this in sync with delivery-assurance's MAX_ATTEMPTS conceptually —
 * they operate on different axes (the action-attempts cap is per-command,
 * this one is per-queued-job) but users expect similar ceilings.
 */
export const MAX_QUEUE_ATTEMPTS = 5;

/**
 * Given the previous `attempts` column value (can be undefined/null from a
 * brand-new insert, or a real integer), return the attempt number to persist
 * on THIS claim. Always >= 1.
 */
export function nextAttemptNumber(prev: number | null | undefined): number {
  if (prev === null || prev === undefined) return 1;
  if (!Number.isFinite(prev)) return 1;
  if (prev < 1) return 1;
  return Math.floor(prev) + 1;
}

/**
 * After incrementing and persisting, decide what to do with this job on
 * failure. Returning "retry" means: leave the job in a retryable state so it
 * can be picked up again. Returning "dlq" means: the caller MUST route the
 * job to the DLQ table — we've exhausted attempts.
 */
export function decideRetryOrDlq(attempts: number): "retry" | "dlq" {
  return attempts >= MAX_QUEUE_ATTEMPTS ? "dlq" : "retry";
}
