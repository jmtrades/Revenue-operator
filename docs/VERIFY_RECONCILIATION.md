# Verify Reality Reconciliation

Step-by-step checks and SQL to confirm the Reality Reconciliation Layer is working. Reconciliation runs every 15 minutes (cron) and emits canonical signals only; it does not update lead/state directly.

---

## 1. Force inbound gap (dev only)

**Goal:** Send SMS, delete message row locally, run reconcile, expect `InboundMessageDiscovered` signal inserted and processed.

1. Send an inbound SMS to the workspace (via Twilio or test harness).
2. Verify one row in `revenue_operator.messages` for that provider message (e.g. `metadata->>'external_id' = MessageSid`).
3. Delete that message row (dev only):
   ```sql
   DELETE FROM revenue_operator.messages
   WHERE metadata->>'external_id' = '<MessageSid>';
   ```
4. Trigger reconciliation:
   ```bash
   curl -s -H "Authorization: Bearer $CRON_SECRET" "$NEXT_PUBLIC_APP_URL/api/cron/reconcile-reality"
   ```
5. Check canonical signals:
   ```sql
   SELECT id, signal_type, idempotency_key, payload->>'provider_message_id', occurred_at, processed_at
   FROM revenue_operator.canonical_signals
   WHERE signal_type = 'InboundMessageDiscovered'
   ORDER BY occurred_at DESC LIMIT 5;
   ```
   Expect one new row with `idempotency_key` like `inbound_discovered:SM...` and `processed_at` set after process-queue runs.
6. Check message re-created:
   ```sql
   SELECT id, role, metadata->>'external_id' FROM revenue_operator.messages
   WHERE metadata->>'external_id' = '<MessageSid>';
   ```
   Expect one row again (consumer inserts message when processing `InboundMessageDiscovered`).

**Before/after counts (example):**
- `canonical_signals`: before N, after N+1 (one `InboundMessageDiscovered`).
- `messages`: before 0 (after delete), after 1 (re-inserted by consumer).

---

## 2. Booking drift

**Goal:** Move a calendar event (or change `start_at` in DB), run reconcile, expect `BookingModified` or `BookingCancelled` if provider/DB shows change.

1. Ensure a `call_sessions` row has `external_event_id` and `started_at` / `call_started_at`.
2. In `calendar_events` (or external calendar), change `start_at` for that `external_event_id` by ≥ 5 minutes, or set `status = 'cancelled'`.
3. Run reconcile (same curl as above).
4. Check signals:
   ```sql
   SELECT id, signal_type, idempotency_key, payload->>'external_event_id', payload->>'new_start_at', payload->>'cancelled_at'
   FROM revenue_operator.canonical_signals
   WHERE signal_type IN ('BookingModified', 'BookingCancelled')
   ORDER BY occurred_at DESC LIMIT 5;
   ```
   Expect one new row when drift was detected.

---

## 3. Attendance drift

**Goal:** Simulate missing attendance event (e.g. call_session with `show_status = 'showed'` but no `AppointmentCompleted` signal), run reconcile, expect `AppointmentCompleted` signal.

1. Ensure a `call_sessions` row in the last 6 hours has `show_status = 'showed'` or `call_ended_at` set and no corresponding `AppointmentCompleted` for that booking in `canonical_signals`.
2. Run reconcile.
3. Check:
   ```sql
   SELECT id, signal_type, idempotency_key, payload->>'booking_id', payload->>'completed_at'
   FROM revenue_operator.canonical_signals
   WHERE signal_type = 'AppointmentCompleted'
   ORDER BY occurred_at DESC LIMIT 5;
   ```
   Expect one new row when evidence (show_status / call_ended_at) was present.

---

## 4. Human override

**Goal:** Insert outbound message with `approved_by_human = false`, run reconcile, expect `HumanReplyDiscovered` and handoff acknowledgement.

1. Insert an outbound message (or use provider history) that is not marked `approved_by_human = true` in `messages`.
2. Ensure reconciliation’s messaging provider can see that message (Twilio list recent).
3. Run reconcile.
4. Check signals:
   ```sql
   SELECT id, signal_type, idempotency_key, payload->>'provider_message_id'
   FROM revenue_operator.canonical_signals
   WHERE signal_type = 'HumanReplyDiscovered'
   ORDER BY occurred_at DESC LIMIT 5;
   ```
   Expect one new row.
5. After process_signal runs, check `messages`: that message should have `approved_by_human = true`.
6. If there was an open escalation for that lead, check `handoff_acknowledgements` for that escalation_id.

---

## 5. Before/after SQL counts (summary)

Run before and after a full reconciliation cycle:

```sql
-- Canonical signals by type (before/after)
SELECT signal_type, COUNT(*) FROM revenue_operator.canonical_signals GROUP BY signal_type;

-- Recent reconciliation-origin signals
SELECT signal_type, idempotency_key, occurred_at, processed_at
FROM revenue_operator.canonical_signals
WHERE payload->>'source' = 'reconciliation'
ORDER BY occurred_at DESC LIMIT 20;

-- action_commands (should not be created by reconciliation; only by decision/action path)
SELECT COUNT(*) FROM revenue_operator.action_commands WHERE created_at > now() - interval '1 hour';
```

Reconciliation must **not** insert into `leads`, `conversations`, or `action_commands` directly; it only inserts into `canonical_signals` and enqueues `process_signal` jobs.

---

## Required env (reconciliation)

- **Cron auth:** `CRON_SECRET` (same as other crons).
- **Twilio (inbound/human drift):** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (or workspace `phone_configs`). If missing, providers return empty; no throw.
- **Stripe (payment drift, optional):** `STRIPE_SECRET_KEY` or `STRIPE_API_KEY`. If missing, payment detectors are skipped.

---

## Run cron locally

```bash
export CRON_SECRET="your-secret"
curl -s -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/reconcile-reality"
```

Response: `{ "ok": true, "jobs_run": N, "failures": 0, "details": { "run", "failures", "details": [ { "workspace_id", "emitted", "errors" } ] } }`.
