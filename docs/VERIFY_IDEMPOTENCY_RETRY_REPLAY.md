# Verification & Chaos Validation Runbook

Operational runbook to confirm production-grade reliability: no double sends, no double-counted revenue, no lost followups, correct behavior under retries, crashes, and replays.

**If all sections pass → system is production-grade.**

---

## Section 1 — Inbound Idempotency Test

**Goal:** Same inbound webhook 5× → exactly one handled conversation (one signal, one proof, at most one action command).

### 1.1 BEFORE COUNTS

Run in Supabase SQL Editor (schema `revenue_operator`; use `public` if your tables live there):

```sql
SELECT
  (SELECT COUNT(*) FROM revenue_operator.canonical_signals) AS signals_before,
  (SELECT COUNT(*) FROM revenue_operator.revenue_proof)       AS proof_before,
  (SELECT COUNT(*) FROM revenue_operator.action_commands)    AS action_cmds_before;
```

Record the three numbers.

### 1.2 ACTION

Send the **identical** inbound payload 5 times. Use the same `workspace_id`, `channel`, `external_lead_id`, `thread_id`, `message`, and `external_message_id` so the ingest layer produces the same idempotency_key.

Example (replace with your app URL and payload):

```bash
BODY='{"workspace_id":"YOUR_WS_ID","channel":"sms","external_lead_id":"lead-1","thread_id":"thread-1","message":"Hi","external_message_id":"msg-idempotent-1"}'
for i in 1 2 3 4 5; do
  curl -s -X POST "https://YOUR_APP/api/webhooks/inbound" -H "Content-Type: application/json" -d "$BODY"
done
```

### 1.3 PROCESS

Drain the queue by calling process-queue repeatedly (or wait for cron):

```bash
for i in 1 2 3 4 5 6 7 8; do
  curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR_APP/api/cron/process-queue"
done
```

### 1.4 AFTER COUNTS

```sql
SELECT
  (SELECT COUNT(*) FROM revenue_operator.canonical_signals) AS signals_after,
  (SELECT COUNT(*) FROM revenue_operator.revenue_proof)     AS proof_after,
  (SELECT COUNT(*) FROM revenue_operator.action_commands)  AS action_cmds_after;
```

**Expected:**

- **+1** canonical signal (signals_after = signals_before + 1)
- **+1** proof (proof_after = proof_before + 1)
- **≤1** action command (action_cmds_after = action_cmds_before + 0 or + 1, depending on decision)

### WHY

- **Signal insert is ON CONFLICT idempotent:** Ingest uses an idempotency_key (derived from workspace, lead, channel, external_message_id, etc.). Duplicate payloads do not create a second canonical signal.
- **Consumer claim prevents double execution:** Only one process_signal job runs per signal; the consumer atomically claims via `processed_at`. A second run for the same signal id returns "already_processed".
- **Proof uses dedup key:** `revenue_proof` has a unique constraint on `proof_dedup_key`. `recordProof` uses upsert with ON CONFLICT DO NOTHING, so the same proof is never inserted twice.
- **Action command uses dedup key:** `action_commands` has a unique constraint on `dedup_key`. Persist before enqueue returns existing id on conflict; only one action_command row exists per logical action.

---

## Section 2 — Retry & DLQ Behavior

**Goal:** When send fails, the system retries with backoff then stops safely (no infinite retries, no silent drops).

### Steps

1. **Break Twilio credentials** — Set invalid `TWILIO_AUTH_TOKEN` (or wrong account) so outbound send fails.
2. **Trigger message send** — Send one inbound that causes the decision layer to enqueue a SendMessage (one row in `action_commands`).
3. **Run queue repeatedly** — Call process-queue many times (or wait for cron and retry sweep).

### Assertions

- **attempt_count increments** (1, 2, … 8) for the same `action_commands` row.
- **next_retry_at** schedules exponential backoff (e.g. 1m, 5m, 30m, …).
- **After attempt 8** → no more retries; row is not returned by `getDueActionRetries`.
- **Row moves to DLQ behavior** — Worker calls `toDLQ` when `shouldDLQ` is true; the row remains with `processed_at` NULL and `attempt_count >= 8`.

SQL to inspect:

```sql
SELECT id, attempt_count, last_error, next_retry_at, processed_at
FROM revenue_operator.action_commands
WHERE processed_at IS NULL
ORDER BY created_at DESC
LIMIT 5;
```

### WHY

The system guarantees **no infinite retry loops** (cap at 8 attempts, then DLQ) and **no silent drops** (every failure is recorded in `attempt_count`, `last_error`, and optionally in DLQ for operator visibility).

---

## Section 3 — Replay Safety

**Goal:** Reprocessing an already-processed signal does nothing (no new proof rows, no new action commands, state unchanged).

### Steps

1. **Pick a processed signal** — Choose one with `processed_at` set:

```sql
SELECT id AS signal_id, lead_id, signal_type, processed_at
FROM revenue_operator.canonical_signals
WHERE processed_at IS NOT NULL
LIMIT 5;
```

2. **Record counts:**

```sql
SELECT
  (SELECT COUNT(*) FROM revenue_operator.revenue_proof)   AS proof_before,
  (SELECT COUNT(*) FROM revenue_operator.action_commands) AS action_cmds_before;
```

3. **Re-enqueue process_signal for the same signal ID** — e.g. enqueue a job `{ type: "process_signal", signalId: "<SIGNAL_ID>" }` or call whatever triggers `processCanonicalSignal(signalId)` again.
4. **Run queue** until the replayed job is processed.

### Assertions

- **No new proof rows** — proof_after = proof_before.
- **No new action commands** — action_cmds_after = action_cmds_before.
- **State unchanged** — Lead state and last_signal_occurred_at are the same before/after.

```sql
SELECT
  (SELECT COUNT(*) FROM revenue_operator.revenue_proof)   AS proof_after,
  (SELECT COUNT(*) FROM revenue_operator.action_commands) AS action_cmds_after;
```

### WHY

- **processed_at claim:** The consumer skips work if `canonical_signals.processed_at` is already set; re-enqueue returns "already_processed".
- **Proof dedup:** Even if reducer ran again, `recordProof` uses `proof_dedup_key` with ON CONFLICT DO NOTHING, so no second proof row.
- **Action dedup:** Decision layer produces the same dedup_key for the same logical action; `action_commands` unique on dedup_key prevents a second row; worker does not send twice.

---

## Section 4 — Chaos Test: Server Crash Mid-Conversation

**Outage scenario:** Lead sends a message → webhook returns 200 and enqueues process_signal → **server dies** (worker never runs or dies mid-processing) → restart after 5 minutes → drain queue.

### Steps

1. Note lead state and counts (optional).
2. Send **one** inbound message (unique external_message_id).
3. **Stop the queue worker** immediately (kill server, or disable process-queue for 5 minutes).
4. Wait **5 minutes**.
5. **Restart** (or re-enable cron).
6. **Drain queue** (call process-queue repeatedly).

### Assertions (with SQL)

**A) Signal handled once**

```sql
SELECT id, lead_id, signal_type, processed_at, created_at
FROM revenue_operator.canonical_signals
WHERE lead_id = '<LEAD_ID>'
ORDER BY created_at DESC
LIMIT 5;
```

Expect: exactly one row for this message with `processed_at` set.

**B) State correct**

```sql
SELECT id, state, last_signal_occurred_at
FROM revenue_operator.leads
WHERE id = '<LEAD_ID>';
```

Expect: `state` and `last_signal_occurred_at` consistent with the processed signal (e.g. NEW → ENGAGED for first message).

**C) No duplicate proof**

```sql
SELECT COUNT(*) AS proof_count
FROM revenue_operator.revenue_proof
WHERE signal_id = '<SIGNAL_ID>';
```

Expect: proof_count = 1.

**D) No duplicate actions**

```sql
SELECT COUNT(*) AS action_count
FROM revenue_operator.action_commands
WHERE lead_id = '<LEAD_ID>' AND created_at > '<TIME_BEFORE_TEST>';
```

Expect: 0 or 1 (depending on whether decision produced an action).

**E) Followup continuity preserved**

```sql
SELECT lead_id, status, next_action_at, next_action_type
FROM revenue_operator.lead_plans
WHERE lead_id = '<LEAD_ID>' AND status = 'active';

SELECT id, type, processed_at
FROM revenue_operator.action_commands
WHERE lead_id = '<LEAD_ID>' AND processed_at IS NULL;
```

Expect: active plan and/or pending action_command as the flow requires (no lost followups).

---

## Section 5 — Chaos Variant 1: Crash After Action Persisted, Before Send

**Scenario:** Decision runs → action_command row is created and job enqueued → worker picks up job → **server dies before** calling the provider (e.g. before or during `sendOutbound`). On restart, the same action job runs again.

### Expected

- `action_commands` row exists with `processed_at` NULL until send completes.
- After restart, worker runs again; it either sends once (if no prior send) or, if an outbound was already created for this dedup_key (e.g. insert succeeded then crash), the **provider send guard** detects it and marks the command processed without sending again.

### Verification

- Trigger one SendMessage, kill the process after the outbound_message row is inserted but before (or during) `sendOutbound`.
- Restart and run process-queue.
- **Expect:** Exactly one outbound message and one send attempt (or guard detects existing outbound by dedup_key and skips second send). One row in `action_commands` with `processed_at` set after the run.

---

## Section 6 — Chaos Variant 2: Crash After Send, Before Acknowledgement

**Scenario:** Worker calls provider → send **succeeds** (message delivered to carrier) → **server dies before** `markActionCommandProcessed`. On restart, the same action_command is retried (processed_at still NULL).

### Expected

- **NO second send.** The customer must not receive the same message twice.

### What protects against double send

1. **Provider send guard (action worker):** Before sending, the worker checks whether an outbound message already exists for the same **conversation_id**, **lead_id**, and **dedup_key** (stored in `outbound_messages.metadata`). If such a row exists (e.g. from a previous run that succeeded then crashed), the worker **marks the action_command processed** and returns without calling the provider again.
2. **Recent-send window (existing):** The worker already skips if a recent outbound exists in the same conversation (e.g. last 60 seconds), reducing the window for duplicates.
3. **Provider message id tracking (if present):** If your schema stores `external_id` / provider SID on outbound_messages after send, the guard can also treat "existing row with status sent/delivered" as already sent.

### Verification

- Trigger SendMessage, then simulate crash **after** `sendOutbound` returns success but **before** `markActionCommandProcessed` (e.g. kill process or throw in code between the two).
- Restart and run process-queue again with the same action_command (retry or re-enqueue).
- **Expect:** No second provider call; one outbound row; action_command eventually marked processed (by the guard on retry).

SQL to confirm single outbound per dedup_key:

```sql
SELECT id, conversation_id, metadata->>'dedup_key' AS dedup_key, status, created_at
FROM revenue_operator.outbound_messages
WHERE lead_id = '<LEAD_ID>'
ORDER BY created_at DESC
LIMIT 10;
```

Expect at most one row per distinct dedup_key for that conversation.

---

## Operator Summary

**If all sections above pass, the system guarantees:**

- **Exactly-once conversation handling** — Same inbound payload 5× → one signal, one proof, ≤1 action.
- **Exactly-once revenue attribution** — Proof dedup key prevents double counting on replay or retry.
- **Safe retries** — Failed sends retry with backoff; after 8 attempts, move to DLQ; no infinite loops, no silent drops.
- **Safe restarts** — Crashes mid-conversation or mid-send recover without duplicate handling or duplicate sends when the runbook assertions hold.
- **Safe replays** — Re-enqueueing an already-processed signal does not create new proof or action rows.
- **No duplicate customer messages** — Provider send guard (dedup_key / existing outbound) prevents double send when the worker crashes after send but before marking processed.
- **No lost followups** — Lead plans and pending action_commands are preserved; chaos test (Section 4) asserts followup continuity.

---

## Schema note

All SQL in this runbook uses the `revenue_operator` schema. If your tables live in `public`, replace `revenue_operator` with `public` in every query.
