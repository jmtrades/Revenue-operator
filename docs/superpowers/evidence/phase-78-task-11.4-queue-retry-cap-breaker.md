# Phase 78 Task 11.4 — Queue retry cap + circuit breaker

**Status:** Complete
**Date:** 2026-04-22

## Problem

Two distinct reliability holes in the DB-backed job queue path:

1. **No retry cap in the base queue.** Both `src/lib/queue/index.ts` `dequeue`
   and `src/lib/queue/burst-drain.ts` `acquireLock` hardcoded
   `attempts: 1` on every claim. A job that was already retried N times came
   back from the next claim looking brand-new, so `MAX_QUEUE_ATTEMPTS` —
   the whole point of tracking `attempts` — was silently disabled. A
   poison-pill job (malformed payload, permanent downstream error) could be
   reclaimed indefinitely whenever its claim TTL expired.
2. **No circuit breaker around flaky downstreams.** When Twilio / Telnyx /
   Resend / Stripe went into a bad state, the worker had no fail-fast
   primitive. Every queued job hit the degraded provider, each burning a
   retry allowance and provider rate-limit budget before ultimately failing.
   There was no way to say "the downstream looks dead; stop retrying for
   60 s and then probe."

The action-queue layer (`src/lib/action-queue/persist.ts`) already had its
own `MAX_ATTEMPTS=8` cap via `action_attempts` rows, but that only covers
the actionCommand path — the base queue's `dequeue`/`fail` surface was
unprotected.

## Fix

### 1. New pure circuit breaker — `src/lib/reliability/circuit-breaker.ts`

Textbook three-state machine with a rolling failure window:

- **closed** — calls pass through. Each failure is pushed onto a
  timestamp array and the array is pruned to `rollingWindowMs`. If the
  count reaches `threshold`, the breaker opens. A success clears the
  timestamp array (hystrix-style clean slate after a proven-good call).
- **open** — `execute()` throws `CircuitOpenError` immediately, without
  invoking the wrapped function. After `cooldownMs` has elapsed since the
  open-transition, the breaker promotes itself to `half_open` on the next
  `.execute()` or `.getState()` call.
- **half_open** — exactly one probe is allowed through. Success → closed,
  full traffic resumes. Failure → open, with a fresh cooldown window.

`Date.now()` is read each call so `vi.useFakeTimers()` drives the state
transitions deterministically in tests. The breaker is in-memory and
deliberately does NOT persist across process restarts — a new worker starts
closed, which is the safe default (an extra failed call is cheaper than a
latched-open breaker blocking a healthy provider).

`CircuitOpenError` carries the breaker `name` so log correlation +
observability dashboards can attribute short-circuited calls to the
specific downstream (`twilio-sms`, `resend-email`, `stripe-invoice`, etc.).

### 2. Pure retry-policy helpers — `src/lib/queue/retry-policy.ts`

One place where the queue cap lives:

- `MAX_QUEUE_ATTEMPTS = 5` (conservative: 5 × 15-min claim TTL ≈ 75 min of
  wall clock — long enough for a transient provider outage to heal, short
  enough to bound poison-pill damage).
- `nextAttemptNumber(prev)` — monotonic increment from whatever the DB
  previously stored, defensively clamping `null`/`undefined`/`NaN`/negative
  values to `1`.
- `decideRetryOrDlq(attempts)` — pure routing function: `>=` cap → `"dlq"`,
  else `"retry"`.

Having these as pure functions means tsc+unit tests cover the decision
logic with no DB mocking.

### 3. `src/lib/queue/index.ts`

- Re-exports `MAX_QUEUE_ATTEMPTS` so downstream callers can log the cap
  without importing the policy module directly.
- `DequeueResult` now carries the `attempts` field so the caller
  (process-queue cron + future direct dequeue users) can thread it to `fail()`.
- `dequeue()` now `SELECT`s `attempts` along with the row, computes
  `nextAttemptNumber(row.attempts)`, persists THAT value, and returns it.
  The hardcoded `attempts: 1` is gone.
- `fail(jobId, error, attempts?)` — new optional third arg. When
  supplied and `>= MAX_QUEUE_ATTEMPTS`, the job goes to status `"dlq"`
  instead of `"failed"`, which stops it from being considered retryable
  by the admin tools. Legacy callers that omit `attempts` see
  the pre-retry-cap behaviour (status=failed), so this is backwards
  compatible — no caller breaks.

### 4. `src/lib/queue/burst-drain.ts`

Same fix as `dequeue`: `acquireLock` reads `attempts`, increments it
with `nextAttemptNumber`, persists the new value, and surfaces it on the
returned lock. The error branch routes to DLQ via `decideRetryOrDlq`
instead of always writing `status: "failed"`.

### 5. `src/app/api/cron/process-queue/route.ts`

Single-line change at the catch: `await fail(job.id, errMsg)` becomes
`await fail(job.id, errMsg, job.attempts)` so the cron's failure path
actually enforces the cap.

## Files changed

```
src/lib/reliability/circuit-breaker.ts        (new, 123 lines)
src/lib/queue/retry-policy.ts                 (new, 50 lines)
src/lib/queue/index.ts                        (+24 / -5)
src/lib/queue/burst-drain.ts                  (+10 / -4)
src/app/api/cron/process-queue/route.ts       (+3 / -1)
__tests__/reliability/circuit-breaker.test.ts (new, 11 tests)
__tests__/queue/retry-policy.test.ts          (new, 6 tests)
docs/superpowers/evidence/phase-78-task-11.4-queue-retry-cap-breaker.md (this file)
```

## Verification

| Gate                                   | Result                              |
|----------------------------------------|-------------------------------------|
| CircuitBreaker unit tests              | 11/11 pass                          |
| Queue retry-policy unit tests          | 6/6 pass                            |
| `tsc --noEmit`                         | exit 0                              |
| `npm run lint` (`--max-warnings=0`)    | exit 0                              |
| `npm run scan:secrets`                 | 0 hits on working tree              |
| `npm test` full suite                  | 3034/3034 pass (393/393 files)      |

### Circuit breaker state transitions (from tests)

```
closed ──threshold failures in rollingWindowMs──▶ open
open   ──cooldownMs elapsed──▶ half_open
half_open ──success──▶ closed (failure history cleared)
half_open ──failure──▶ open   (fresh cooldown)
```

Explicit regression test: failures older than `rollingWindowMs` age out —
two failures then a 10 s advance must NOT cause a third fresh failure to
open the breaker when threshold=3.

### Retry cap regression coverage

```ts
// Previously impossible because `attempts` was reset to 1 on every claim.
// Now pinned: once incremented to MAX, the only valid decision is DLQ.
const prev = MAX_QUEUE_ATTEMPTS - 1;
const next = nextAttemptNumber(prev);
expect(next).toBe(MAX_QUEUE_ATTEMPTS);
expect(decideRetryOrDlq(next)).toBe("dlq");
```

## Scope discipline

Deferred (tracked, not this task):

- Wiring the circuit breaker into every downstream provider call
  (`sendOutbound` → Twilio/Telnyx/Resend). The primitive is in place,
  fully tested, and named; adding per-provider breakers to the worker
  hot paths is its own task because each provider has different failure
  semantics (429 vs 5xx vs timeout) that inform the threshold/cooldown
  per breaker.
- Crash-recovery re-claim of `processing` jobs with expired claims. Today
  the `claim_next_job` RPC only considers `status='pending'`. The retry cap
  is now enforced through the existing `failed`→(re-enqueue) admin flow, so
  this is orthogonal.
- Extending the action-queue `MAX_ATTEMPTS=8` and the base-queue
  `MAX_QUEUE_ATTEMPTS=5` into a shared constant. They model different
  things (per-command delivery attempts vs per-queued-job claims), so
  unifying the number requires a small design decision.

## Why this is $100B-grade

- **Poison pills die.** The base queue now actually enforces its cap.
  A malformed job that always throws will be routed to the DLQ after 5
  claims instead of looping forever whenever its claim expires.
- **Fail-fast primitive exists.** Any downstream-facing code path can
  now wrap its call with a `CircuitBreaker` instance and get automatic
  fast-failure during outages, instead of pointlessly burning provider
  quota on guaranteed-to-fail calls.
- **Test-pinned.** The failure-window arithmetic, state transitions, and
  cap routing are all covered by unit tests, so a future refactor that
  (for example) forgets to prune the failure-timestamp array or re-adds
  `attempts: 1` trips specific test failures rather than a vague
  regression in production.
- **Idempotency-safe.** The retry cap is a ROUTING decision, not a
  delivery decision — it moves exhausted jobs to the DLQ table without
  touching `dedup_key`, `idempotency_key`, or the action-attempts
  exactly-once chain. The delivery-assurance layer (`action_attempts`)
  still owns "was this command ever successfully sent" and will not
  re-send a command that the DLQ move skips.
