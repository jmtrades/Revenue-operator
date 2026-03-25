# Reliability Doctrine — Final Implementation

This document summarizes the “last 10%” work for production reliability and doctrine purity: no new features, only correctness, retries, and no bypasses.

---

## 1. Files changed / added

### Changed
- **src/lib/doctrine/enforce.ts** — `isDoctrineEnforced()` now reads `process.env.DOCTRINE_ENFORCED` at call time (testable); `assertNotEnforcedOrConvert` accepts optional `message`.
- **src/lib/proof/record.ts** — Proof idempotency: `proofDedupKey()`, upsert with `onConflict: "proof_dedup_key"`, `ignoreDuplicates: true`; no double count on replay.
- **src/lib/action-queue/persist.ts** — `scheduleActionRetry(actionCommandId, error)`, `getDueActionRetries(limit)`, `claimActionRetry(actionCommandId)`; retry delays 1m, 5m, 30m, 1h, 2h, 4h, 8h, 12h; `shouldDLQ` when `attempt_count >= 8`.
- **src/lib/action-queue/worker.ts** — On send failure: call `scheduleActionRetry`, do not set `processed_at`; only `markActionCommandProcessed` on success; on `shouldDLQ` call `toDLQ("action:" + actionCommandId, errMsg)`.
- **src/app/api/cron/process-queue/route.ts** — Dynamic import of `processWebhookJob` (no static import in production path); due-action retry sweep: `getDueActionRetries(20)` → enqueue action job + `claimActionRetry(row.id)`.
- **src/app/api/ops/actions/redrive-dlq/route.ts** — Comment: when DOCTRINE_ENFORCED=1, redriving process_webhook still enqueues process_webhook; cron converts via `convertLegacyWebhookToSignalAndEnqueue`.
- **src/app/api/admin/dlq/route.ts** — Same comment for process_webhook redrive.

### Added
- **__tests__/doctrine-reliability.test.ts** — Tests: DOCTRINE_ENFORCED blocks legacy (`processWebhookJob` throws); no production route statically imports process-webhook; webhooks do not call `processCanonicalSignal` inline; consumer uses lead lock; action retry semantics (persist/worker); proof uses dedup_key + upsert.

---

## 2. Migrations added

- **supabase/migrations/reliability_doctrine_lock_retry_proof.sql** (already present from prior work):
  - `doctrine_violations` table
  - `leads.signal_processing_lock_until`, `leads.last_signal_occurred_at`
  - `action_commands.attempt_count`, `last_error`, `next_retry_at` + retry index
  - `revenue_proof.proof_dedup_key` + unique index
  - `messages` unique index on `(conversation_id, external_id)` where `external_id IS NOT NULL`

---

## 3. How to run migrations in Supabase

**Option A — Supabase CLI (recommended)**  
From repo root:

```bash
npx supabase db push
```

Or link and push:

```bash
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

**Option B — Supabase Dashboard**  
1. Open project → SQL Editor.  
2. Paste and run the contents of `supabase/migrations/reliability_doctrine_lock_retry_proof.sql`.

**Option C — One-off migration name**  
If your pipeline runs by name:

```bash
npx supabase migration up --name reliability_doctrine_lock_retry_proof
```

---

## 4. Environment variables

| Variable | Value | Purpose |
|----------|--------|---------|
| **DOCTRINE_ENFORCED** | `1` | Production: legacy paths must not mutate state or send; they convert to canonical signals and enqueue `process_signal`, or throw and log to `doctrine_violations`. Omit or set to anything else for local/dev or rollback. |

No other new env vars were added for this work.

---

## 5. Manual verification script

Run these in order (adjust URLs and secrets to your environment).

### 5.1 Twilio inbound → signal → processed_at

1. Set `DOCTRINE_ENFORCED=1` in the environment where the app runs.
2. Send one SMS to the Twilio number that hits your inbound webhook (or call `POST /api/webhooks/inbound` with a normalized body if you use the generic inbound).
3. Verify:
   - A row in `canonical_signals` for that message with `processed_at` set.
   - A corresponding lead/conv/message and, if applicable, a reply (outbound) or decision job enqueued.
   - No row in `raw_webhook_events` when using the ingest-only path (enforced).

### 5.2 Forced failure and retry

1. Temporarily make send fail (e.g. invalid Twilio credentials or mock that returns `status: "failed"`).
2. Trigger an action (e.g. decision that produces SendMessage) so one `action_commands` row is created and the worker runs.
3. Verify:
   - `action_commands`: `processed_at` is NULL, `attempt_count` incremented, `last_error` set, `next_retry_at` set to a future time.
4. Restore send to success; wait until `next_retry_at` is in the past (or trigger cron `/api/cron/process-queue` after advancing time / backdating `next_retry_at` in DB).
5. Run cron again; verify the action is retried and eventually `processed_at` is set.

### 5.3 DLQ after 8 attempts (optional)

1. Keep send failing for the same action_command.
2. Run the cron (or retry sweep) until `attempt_count` reaches 8.
3. Verify:
   - `processed_at` remains NULL; `next_retry_at` can be null; no further retries for that row.
   - A DLQ entry exists (Redis list or `job_queue.status = 'dlq'` for the job identifier used by your stack, e.g. `action:<action_command_id>`).

### One-liner (curl) for cron

```bash
# Replace with your host and CRON_SECRET
curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" "https://YOUR_HOST/api/cron/process-queue"
```

---

## 6. Summary

- **Single truth path in prod:** With `DOCTRINE_ENFORCED=1`, webhooks only ingest and enqueue `process_signal`; cron never runs legacy `processWebhookJob` for that path (it converts or uses the signal path).
- **Webhooks ingest-only:** No inline `processCanonicalSignal`; fast 200 response.
- **Concurrency:** Per-lead lock and `last_signal_occurred_at` (existing migration); message/conversation idempotency by external_id/thread.
- **Action retries:** Exponential backoff, `processed_at` only on success; after 8 attempts, move to DLQ; cron sweeps due retries.
- **Proof idempotency:** `proof_dedup_key` + upsert; replay does not double-count.

All tests: `npm test`. Build: `npm run build`.
