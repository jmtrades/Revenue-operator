# Phase 79 Task 13.1 — Wire CircuitBreaker into sendOutbound

**Status:** Complete
**Date:** 2026-04-22

## Problem

Task 11.4 introduced `CircuitBreaker` as a tested primitive but explicitly
deferred call-site wiring. That left the actual outbound delivery path —
Twilio SMS, Telnyx SMS, Resend email — with no fail-fast protection.
Consequence: a provider outage (e.g. Twilio-wide 5xx spike) meant every
queued job hit the degraded provider, each burning a retry allowance and
provider rate-limit budget before ultimately failing.

The queue-side retry cap (Task 11.4) stops poison-pill loops, but the
delivery-side circuit breaker stops wasted provider calls during the
outage window itself.

## Fix

### 1. Per-provider singletons — `src/lib/reliability/provider-breakers.ts`

Three module-level `CircuitBreaker` instances — one per downstream —
plus `runThroughBreaker()` adapter and observability helpers.

- `twilioBreaker` (name `twilio-sms`)
- `telnyxBreaker` (name `telnyx-sms`)
- `resendBreaker` (name `resend-email`)

Tuning (per-breaker identical default, overridable if a provider shows
different failure semantics): **threshold 5 failures within a 60-second
rolling window, 30-second cooldown before a half-open probe.** Not
aggressive enough to flap on a handful of transient 429s; aggressive
enough to short-circuit a real outage within ~1 minute.

`getProviderBreakerStates()` returns the live state of each breaker for
a future `/health` or `/admin/reliability` panel. `resetAllProviderBreakers()`
is the test-only (and future operator-action) reset hook.

### 2. `runThroughBreaker()` — result-shape ↔ throw adapter

The underlying `CircuitBreaker` detects failures via **throws**. The
telephony and email adapters, by convention in this codebase, return
`{error: string}` on recoverable failure instead of throwing. The
adapter bridges the two:

1. Calls the wrapped function inside `breaker.execute()`.
2. If the result contains an `error` key, throws internally so the
   breaker registers a failure (contributing to its threshold).
3. Catches the throw and returns the original `{error}` shape to the
   caller — same contract as before.
4. Catches `CircuitOpenError` specifically and returns
   `{error: "circuit_open:<breaker-name>"}` so `sendOutbound`'s channel
   fallback loop can treat a short-circuited send the same as any other
   recoverable failure and try the next fallback channel.

### 3. `src/lib/delivery/provider.ts` — SMS call-site wiring

Both provider functions now route their outbound call through
`runThroughBreaker`:

- `sendViaTelnyx` → wraps `sendSmsTelnyx(...)` with `telnyxBreaker`.
- `sendViaTwilio` → wraps `telephony.sendSms(...)` with `twilioBreaker`.

Return shapes are unchanged. When the respective breaker is open, the
function returns `{error: "circuit_open:twilio-sms"}` (or `telnyx-sms`),
and the caller's existing channel-fallback logic falls through to the
next channel in `fallbackOrder` (`sms` → `whatsapp` → `email` → `web`).

### 4. `src/lib/integrations/email.ts` — Resend call-site wiring

`sendEmail` now wraps the Resend `fetch(https://api.resend.com/emails)`
call with `resendBreaker`. The inner lambda returns `{id}` on success
or `{error: string}` on HTTP failure — exactly the shape
`runThroughBreaker` expects. The `email_send_queue` row persistence
(status=sent with external_id on success, status=failed with
error_message otherwise) happens outside the breaker, so a
short-circuit still produces a queue record with
`error_message: "circuit_open:resend-email"` — fully auditable.

The pre-existing try/catch around `fetch` became redundant with
`runThroughBreaker`'s own error handling and was collapsed into a
single post-breaker conditional — shorter, and exactly equivalent
semantically for the existing test cases.

### 5. Isolation guarantee

Each breaker is independent: a Twilio outage does NOT open the Telnyx
or Resend breakers. Test `breakers are isolated: Twilio failures do not
open Telnyx or Resend` pins this behaviour — a future refactor that
accidentally shares state (e.g. a single global failure array) would
fail the test.

## Files changed

```
src/lib/reliability/provider-breakers.ts                 (new, ~95 lines)
src/lib/delivery/provider.ts                             (+18 / -6)
src/lib/integrations/email.ts                            (+30 / -22)
__tests__/reliability/provider-breakers.test.ts          (new, 9 tests)
docs/superpowers/evidence/phase-79-task-13.1-provider-circuit-breakers.md (this file)
```

## Verification

| Gate                                   | Result                              |
|----------------------------------------|-------------------------------------|
| provider-breakers unit tests           | 9/9 pass                            |
| `tsc --noEmit`                         | exit 0 (~13.5s)                     |
| `npm run lint -- --max-warnings=0`     | exit 0 (~39.5s)                     |
| `npm run scan:secrets`                 | 0 hits on working tree              |
| Full vitest suite (4 shards)           | 3043/3043 pass, 394/394 files       |

Per-shard breakdown after wiring:

| Shard | Files | Tests | Notes                                            |
|-------|-------|-------|--------------------------------------------------|
| 1 / 4 | 99    | 665   | Unchanged                                        |
| 2 / 4 | 99    | 726   | +1 file +9 tests (`provider-breakers.test.ts`)   |
| 3 / 4 | 98    | 994   | Unchanged                                        |
| 4 / 4 | 98    | 658   | Unchanged                                        |
| **Total** | **394** | **3043** | +1 file / +9 tests vs. 3034-baseline |

## Why this is $100B-grade

- **Fail-fast on real outages.** A 1-minute Twilio-wide 5xx spike no
  longer drains every queued SMS retry into a provider that will
  reject them all. After 5 failures, the breaker opens and subsequent
  calls return `circuit_open:twilio-sms` in ~1 µs.
- **Automatic recovery.** The breaker's cooldown is 30 s; after that
  exactly ONE probe is allowed through. Success → full traffic
  resumes; failure → another 30 s cooldown. No human needs to reset
  anything for the common transient-outage case.
- **Channel fallback stays intact.** Because the circuit-open marker
  flows as a structured `{error: "circuit_open:..."}`, `sendOutbound`'s
  fallback loop treats it as "this channel failed, try the next one."
  A message doesn't just die because Twilio was down — it falls through
  to the next channel in the workspace's configured order.
- **Isolated by provider.** Twilio being down does NOT block Telnyx or
  Resend. The test suite pins this.
- **Idempotency-safe.** Circuit-open is a ROUTING decision — it does
  not touch `dedup_key`, `idempotency_key`, or the
  `action_attempts` exactly-once chain. A short-circuited send behaves
  exactly the same as a send that got an error response: the queue
  record is marked failed with an auditable reason, and existing
  retry-cap + DLQ logic (Task 11.4) still applies.
- **Observability hook ready.** `getProviderBreakerStates()` returns
  the live state of each breaker — a future Phase 13.2 can plug this
  into `/health` or an `/admin/reliability` panel without touching the
  breaker logic.

## Scope discipline

Deferred (tracked, not this task):

- Per-provider threshold tuning based on observed failure semantics
  (Twilio 429 vs 5xx vs timeout — each may warrant different cooldown).
  The plumbing is in place; tuning is a data-driven follow-up.
- `/health` endpoint wiring for `getProviderBreakerStates()`.
- Circuit breaker around Stripe API calls (getStripe factory path).
  Different failure semantics from messaging providers — idempotency
  keys cover retries, but a breaker would still stop quota burn during
  Stripe-wide outages. Separate task because of the retry-key design.
- Crash-recovery re-claim of `processing` jobs with expired claims
  (orthogonal — queue state, not delivery).
