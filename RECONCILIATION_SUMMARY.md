# Phase 3: Reality Reconciliation Layer — Summary

## Files added

- `src/lib/signals/types.ts` — Extended with reconciliation signal types and `reconciliationIdempotencyKey()`.
- `src/lib/state/reducer.ts` — Cases for `InboundMessageDiscovered`, `BookingModified`, `HumanReplyDiscovered`, `RefundIssued`.
- `src/lib/signals/store.ts` — `getSignalIdByKey(idempotencyKey)` for duplicate path.
- `src/lib/reconciliation/providers/messaging.ts` — `MessagingReadProvider`, Twilio impl (safe empty when creds missing).
- `src/lib/reconciliation/providers/calendar.ts` — `CalendarReadProvider`, stub reading `calendar_events`.
- `src/lib/reconciliation/providers/payments.ts` — `PaymentsReadProvider`, Stripe impl (gated by env).
- `src/lib/reconciliation/detect/inbound-gaps.ts` — `detectInboundGaps(workspaceId)`.
- `src/lib/reconciliation/detect/booking-drift.ts` — `detectBookingDrift(workspaceId)`.
- `src/lib/reconciliation/detect/attendance-truth.ts` — `detectAttendanceTruth(workspaceId)`.
- `src/lib/reconciliation/detect/human-override.ts` — `detectHumanOverride(workspaceId)`.
- `src/lib/reconciliation/detect/payment-drift.ts` — `detectPaymentDrift(workspaceId)` (gated).
- `src/lib/reconciliation/emit.ts` — `emitDiscoveredSignal(workspaceId, leadId, type, payload)` (insert + enqueue).
- `src/lib/reconciliation/run.ts` — `runReconciliationForWorkspace`, `getWorkspacesForReconciliation`.
- `src/app/api/cron/reconcile-reality/route.ts` — GET cron, `runSafeCron`, 25 workspaces per run.
- `src/lib/signals/consumer.ts` — Handlers for `InboundMessageDiscovered`, `HumanReplyDiscovered`; DLQ on lead_not_found.
- `docs/VERIFY_RECONCILIATION.md` — Step-by-step verification and SQL.
- `docs/RECALL_TOUCH_DOCTRINE.md` — Reality Reconciliation paragraph added.
- `__tests__/reconciliation.test.ts` — Idempotency keys, replay safety, runSafeCron, no direct state.

## Files changed

- `src/lib/signals/types.ts` — New signal types: `InboundMessageDiscovered`, `BookingModified`, `HumanReplyDiscovered`, `RefundIssued`. New payload interfaces and `reconciliationIdempotencyKey()`.
- `src/lib/state/reducer.ts` — New signal cases (recon types).
- `src/lib/signals/store.ts` — `getSignalIdByKey()`.
- `src/lib/signals/consumer.ts` — InboundMessageDiscovered (ensure message row), HumanReplyDiscovered (message + handoff ack), mapSignalToEventType, lead_not_found → DLQ.

## How to run the cron locally

```bash
export CRON_SECRET="your-cron-secret"
curl -s -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/reconcile-reality"
```

Schedule: every 15 minutes (e.g. `*/15 * * * *`).

## Required env vars

- **CRON_SECRET** — Auth for cron (same as other crons).
- **Twilio (optional):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`. If missing, messaging provider returns empty.
- **Stripe (optional):** `STRIPE_SECRET_KEY` or `STRIPE_API_KEY`. If missing, payment detectors are skipped.

No new UI routes or settings.

## Guarantees

- **Reality drift bounded by interval:** The system’s model of reality cannot diverge from reality for more than the reconciliation interval (default 15 minutes) without generating a canonical signal to correct it.
- **No direct state mutation:** Reconciliation only inserts canonical signals and enqueues `process_signal`; detectors and emit do not write to leads/state.
- **Idempotent:** Same discovered fact yields the same idempotency key; duplicate insert is skipped; consumer uses `processed_at` for replay safety.
- **Safe failure:** Provider/API errors return empty or skip; no state corruption. Timeouts on external calls (e.g. 15s).
- **Deterministic, replay-safe:** Re-enqueueing the same signal is safe; at most one processing per signal (claim on `processed_at`).
