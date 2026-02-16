# Five-Layer Doctrine — Enforcement Summary

## Files changed / added

### Added
- `src/lib/signals/consumer.ts` — Single canonical signal consumer (processCanonicalSignal)
- `src/lib/signals/ingest-inbound.ts` — Connector path: upsert lead/conv/msg + insert signal only
- `src/lib/signals/store.ts` — Added getSignalById, claimSignalForProcessing (and processed_at usage)
- `src/lib/state/types.ts` — Lifecycle states + lifecycleToLeadState / leadStateToLifecycle
- `src/lib/state/reducer.ts` — Deterministic reduceLeadState(prevState, signal)
- `src/lib/state/rebuild.ts` — rebuildLeadStateFromSignals, rebuildAndPersistLeadState
- `src/lib/state/index.ts`
- `src/lib/action-queue/send-message.ts` — enqueueSendMessage (decision path must use this only)
- `src/lib/action-queue/persist.ts` — action_commands persist + mark processed
- `src/lib/proof/aggregate.ts` — aggregateProofForWorkspace (dashboard source of truth)
- `src/app/api/ops/actions/rebuild-lead-state/route.ts` — Ops-only state rebuild
- `__tests__/doctrine-five-layers.test.ts` — Idempotency, reducer deterministic, no direct send

### Modified
- `src/lib/signals/store.ts` — getSignalById, claimSignalForProcessing
- `src/lib/queue/index.ts` — JobPayload: process_signal, action with action_command_id
- `src/app/api/cron/process-queue/route.ts` — Handle process_signal, action with action_command_id
- `src/lib/action-queue/enqueue.ts` — Persist to action_commands then enqueue
- `src/lib/action-queue/worker.ts` — runActionJob(_, actionCommandId), mark processed_at
- `src/lib/pipeline/decision-job.ts` — No sendOutbound; enqueueSendMessage only
- `src/lib/pipeline/decision-with-engines.ts` — No sendOutbound; enqueueSendMessage only
- `src/app/api/webhooks/twilio/inbound/route.ts` — Ingest signal + enqueue process_signal only
- `src/app/api/webhooks/inbound-generic/route.ts` — Ingest signal + enqueue process_signal only
- `src/app/api/lifecycle-metrics/route.ts` — Reads from proof aggregate only
- `src/lib/proof/types.ts` — Added LeadReceived

## Migrations added

- `supabase/migrations/doctrine_processed_at_and_action_commands.sql`
  - `canonical_signals.processed_at` (nullable timestamptz)
  - `revenue_operator.action_commands` (id, dedup_key UNIQUE, workspace_id, lead_id, type, payload, created_at, processed_at)
  - `revenue_proof.proof_type` constraint extended to include `LeadReceived`

Apply in order after `canonical_signals_and_proof.sql`:

```bash
# Apply doctrine migration (Supabase CLI or Dashboard SQL Editor)
supabase db push
# or run the SQL in doctrine_processed_at_and_action_commands.sql
```

## How to run

```bash
# Tests (doctrine + existing)
npm test

# Build
npm run build
```

## Env vars required

No new env vars. Existing:

- `CRON_SECRET` — for `/api/cron/process-queue` and `/api/cron/operators`
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `TWILIO_*` — for Twilio inbound (optional if using generic webhook)
- `INBOUND_WEBHOOK_SECRET` — for generic inbound (optional)

## Manual verification — Twilio inbound

1. **Apply migrations** so `canonical_signals` has `processed_at` and `action_commands` exists.
2. **Configure** a workspace with a Twilio number (phone_configs) so the inbound webhook hits your app.
3. **Send an SMS** to that number from a test phone.
4. **Check**:
   - `revenue_operator.canonical_signals`: one row with `signal_type = 'InboundMessageReceived'`, same `idempotency_key` for duplicate (no second row).
   - After cron runs: `processed_at` set on that row; `leads.state` updated; `job_queue` had a `process_signal` job and then a `decision` job; `action_commands` has a row for the outbound send; reply is sent via action worker.
5. **Duplicate**: Send the same message again (or replay same MessageSid). Signal insert should be skipped (idempotency_key duplicate); no second process_signal enqueued.

## Flow summary

- **Twilio / inbound-generic** → `ingestInboundAsSignal()` → `insertSignal(InboundMessageReceived)` → `enqueue({ type: "process_signal", signalId })`.
- **Cron process-queue** → `processCanonicalSignal(signalId)` → claim by `processed_at`, state reducer, update lead, enqueue decision → decision job runs → `enqueueSendMessage()` → `enqueueAction(SendMessage)` → persist to `action_commands`, enqueue action job → **action worker** → only place that calls `sendOutbound`.
- **Dashboard** → `GET /api/lifecycle-metrics?workspace_id=...` → `aggregateProofForWorkspace()` → counts from `revenue_proof` only.
