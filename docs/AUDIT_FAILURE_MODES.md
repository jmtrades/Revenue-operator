# Audit: Failure Modes vs System Guarantees

**Source:** `docs/SYSTEM_DOCTRINE.md` (binding contract).  
**Guarantees:** (1) No lead without responsibility state (2) No action silently fails (3) No escalation goes unseen (4) No booking unresolved (5) No reality drift beyond reconciliation interval (6) No responsibility indefinitely (7) System can demonstrate correctness historically.

This document enumerates **concrete failure scenarios** where a guarantee could **silently** fail in production. No feature suggestions; failure modes only.

---

## Race conditions

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Signal claimed then lead lock fails:** `claimSignalForProcessing(signalId)` sets `processed_at`; then `acquireLeadLock(lead_id)` returns false; consumer returns `lead_locked` and job is failed. Signal remains marked processed but reducer and operators never ran. State and responsibility for that lead never updated from this signal. | 1, 5, 7 |
| **Two workers process different signals for same lead concurrently:** Lead lock TTL is 2 min. Worker A holds lock and processes signal 1 (long-running). Lock expires. Worker B acquires lock and processes signal 2. Reducer/state updates can interleave; final state may not equal strict replay order by `occurred_at`. **Mitigated:** strict temporal replay — only the earliest unprocessed signal per lead may run; see Mitigations below. | 1, 7 |
| **Due action retries:** `getDueActionRetries` has no row-level lock (no `FOR UPDATE SKIP LOCKED`). Two process-queue runs can select the same due commands and both enqueue. Two jobs for same action_command run; both can pass `isActionCommandProcessed` before either marks processed; both execute send. Duplicate outbound message. | 2 (duplicate is not “silent” but violates single execution) |
| **Claim expiry vs clock:** `claim_next_job` uses `now()` and `expires_at > now()`. If server clock is behind, claim expires late; job may sit unrun longer. If server clock is ahead, claim expires early; job can be reclaimed while first worker still running → double execution. | 2, 7 |

---

## Provider partial outages

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Twilio (or provider) returns 5xx or times out** after send; worker does not get `provider_message_id`. Attempt stays `pending` or `sending`; no delivery callback. Retries create new attempts; if provider never confirms, attempt eventually goes to DLQ. If DLQ/escalation path is not run or fails, human is never notified and action appears “in progress” forever. | 2, 3 |
| **Twilio delivery webhook never delivered** (provider outage, our endpoint down, or webhook URL wrong). Message was sent and delivered to handset but we never receive status callback. Attempt remains `sending` until stale detection (24h); then retry or DLQ. Reality (delivered) and our model (unconfirmed) diverge until reconciliation or DLQ. | 2, 5 |
| **Calendar provider (e.g. Google) rate limit or timeout** during reconciliation. `detectBookingDrift` / `detectAttendanceTruth` skip or partial-scan. Booking cancellations or time changes in that window are not discovered; no signals emitted. Drift persists until next successful run. | 4, 5 |
| **Messaging provider list API fails or returns partial results** during inbound-gaps or human-override detection. Messages in the gap window are never discovered; no InboundMessageDiscovered / HumanReplyDiscovered. | 5 |

---

## Clock skew

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Worker clock ahead of DB:** `claim_next_job` uses DB `now()`. Worker uses local `new Date()` for timeouts and retries. If worker clock is ahead, it may consider claim expired and abandon job while DB still considers it claimed; another worker can claim same job → double run. | 2, 7 |
| **Worker clock behind:** Closure/integrity use `new Date()` for “now”. If clock is behind, “awaiting_customer 48h” or “awaiting_business 24h” or “commitment past event time” are detected late. Escalation or reconciliation enqueue delayed; responsibility or booking appears resolved later than real time. | 4, 6, 7 |
| **Event times in payloads:** Booking `start_at` / `new_start_at` from provider may be in different timezone or clock. Closure uses these for “commitment past event time”. If provider clock is wrong or timezone-unaware, we may trigger reconciliation too early or too late. | 4, 6 |

---

## Webhook duplication

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Same inbound webhook delivered twice** (provider retry, load balancer, at-least-once). Idempotency key causes second insert to return duplicate; first run may have already processed. If first run is still in progress and second gets “duplicate”, no double process. If idempotency key is not unique per (workspace, lead, message) (e.g. key collision or missing external_id), two distinct messages could be treated as one or one message processed twice. | 1, 5 |
| **Twilio status callback delivered multiple times** for same message. `markAttemptDelivered(provider_message_id)` updates one attempt; second call is idempotent (same attempt). No double state change; safe. | — |
| **Same webhook processed in two regions or two workers** before idempotency write commits. Two inserts; one wins unique constraint, one gets 23505. Caller must treat 23505 as “already present” and not re-enqueue process_signal for a different signal id; otherwise duplicate process_signal job for same logical event. | 1, 7 |

---

## Reconciliation gaps

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Inbound lookback 2h only.** `detectInboundGaps` uses `LOOKBACK_HOURS = 2`. Messages older than 2h are never considered. If reconciliation cron is delayed or a run fails, messages in the 2–15 min (or longer) gap are only discovered if they fall within the next 2h window. Message at T+2h01m is never discovered by inbound-gaps. | 5 |
| **Human override lookback 2h only.** `detectHumanOverride` uses `LOOKBACK_HOURS = 2`. Human replies older than 2h are never emitted as HumanReplyDiscovered. Responsibility and state can stay “awaiting business” or wrong. | 1, 5 |
| **Reconciliation cron not run** (scheduler down, endpoint not called, or all runs error). No `workspace_reconciliation_last_run` update; no signals from drift. Integrity “reconciliation freshness” fails; drift persists. | 5, 6, 7 |
| **Reconciliation runs but only a subset of workspaces** (e.g. `getWorkspacesForReconciliation(25)`). Workspaces not in the batch have no run until next cycle; their drift window can exceed one cycle. | 5 |
| **Provider list pagination or limit:** Inbound/human-override use `limit: 50` or `limit: 100`. High volume can leave messages outside the listed window never discovered. | 5 |

---

## Escalation delivery gaps

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Handoff email send fails** (Resend 5xx, network error). `notifyHandoff` / `runHandoffNotifications` do not persist “notification attempted” or retry; escalation remains “not notified” or “due for repeat”. If RESEND_API_KEY missing or invalid, all handoff emails fail silently (sendEmail returns false). Escalation is logged but human never notified. | 3 |
| **Handoff “repeat until ack” depends on cron.** If no cron runs `getEscalationsDueForRepeatHandoff` and sends repeats, unacknowledged escalations are never re-sent. Single point of failure. | 3 |
| **Escalation created but holding_message_sent false or notified_at null:** Handoff notification logic filters by `holding_message_sent = true` and (for repeat) `notified_at` set. If escalation is logged but holding/notify flow never runs or fails before setting these, escalation never enters “due for notify” or “due for repeat”. | 3 |
| **Cross-workspace escalation query:** `getEscalationsDueForRepeatHandoff` selects escalation_logs without workspace filter; it loads all unacked. Notifications are then sent per workspace. If any code path used escalation data without workspace_id, one workspace could receive another’s escalation. (Current code uses row.workspace_id for notify; no leak found in handoff-notifications.) | 3 (isolation) |

---

## Human reply edge cases

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Human reply not in provider list** (e.g. sent from different channel, or provider list only shows SMS). HumanReplyDiscovered never emitted; state stays “we sent, awaiting customer”. | 1, 5 |
| **Human reply matched to wrong lead** (e.g. `resolveLeadFromConversationKey` by phone/email matches another lead in same workspace). HumanReplyDiscovered attributed to wrong lead; correct lead never gets state update. | 1, 5 |
| **approved_by_human flag never set** by UI or integration. Human sent the message but reconciliation treats it as “not approved”; HumanReplyDiscovered emitted and may trigger duplicate or conflicting state. | 1, 5 |
| **Idempotency key for human reply** uses provider_message_id. If provider reuses message id (theoretical), second human reply could be skipped. | 5 |

---

## Booking edge timelines

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Booking drift detection only considers call_sessions** with `external_event_id`. Bookings that never became call_sessions (e.g. no Zoom link yet) are not in the drift scan; cancellation or time change for those is not discovered. | 4, 5 |
| **Event time in the past but no AppointmentCompleted/Missed yet.** Closure “commitment past event time” enqueues reconciliation. If attendance-truth or calendar provider is slow or fails, resolution signal is delayed; booking appears “unresolved” until next successful reconciliation. | 4 |
| **Timezone / all-day events:** Commitment start from payload `start_at` may be UTC or local. Comparison with “now” (server time) can be wrong; we may mark “past event” too early or too late. | 4, 6 |
| **BookingModified emitted but start_at in payload wrong or missing.** `getCommitmentStartAt` falls back to call_sessions; if that’s also missing, COMMITMENT_SCHEDULED has no commitmentStartAt; “commitment past event time” never fires. | 4, 6 |

---

## Queue recovery after crash

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Redis used for queue:** `dequeue` is `rpop`. Job is removed from list. If worker crashes after rpop and before `complete(job.id)`, job is lost (no re-claim). No DLQ, no retry. Associated action/signal/decision never completes. | 2, 6, 7 |
| **DB queue: worker crashes after claim, before processPayload.** Claim has TTL (e.g. 15 min). After expiry another worker can claim same job; first worker may have partially applied state. Double execution or inconsistent state. | 1, 2, 7 |
| **DB queue: worker crashes after processPayload, before complete(job.id).** Job remains “processing” with active claim. After claim expiry, job can be reclaimed and run again. Double execution (e.g. double send, double state update). | 2, 7 |
| **process_signal job failed** (e.g. lead_locked); job is marked failed. Signal is already claimed (processed_at set). No automatic re-enqueue of same signal. That signal’s effect on state is never applied. | 1, 5, 7 |

---

## Cross-workspace isolation leaks

| Scenario | Guarantee threatened |
|----------|----------------------|
| **Query omits workspace_id:** Any path that loads leads, signals, actions, or escalations by id only (e.g. by lead_id from webhook) must validate workspace. If a webhook or job payload is forged or misrouted with another workspace’s lead_id, and code does not filter by workspace_id, data from one workspace can be read or written in another’s context. | 1, 2, 3, 7 |
| **job_queue (DB) has no workspace_id column.** Jobs are global. Dequeue does not filter by workspace. Isolation is by payload (workspaceId inside payload). If a bug constructs a payload with wrong workspaceId, work is applied to wrong workspace. | 1, 2, 7 |
| **Integrity audit snapshot** is per workspace; closure getActiveLeadIds is global (all workspaces). Both correctly pass workspace_id into downstream steps. No leak identified in current closure/integrity code. | — |

---

## Summary by guarantee

- **1 (No lead without responsibility state):** Signal claimed but processing aborted (lead_locked); concurrent signal processing for same lead; duplicate or missing idempotency; human reply wrong lead or not discovered; workspace isolation bug.
- **2 (No action silently fails):** Redis job loss after rpop; claim expiry double run; due retry double enqueue/execute; provider never confirms and DLQ path not run; worker crash after process before complete.
- **3 (No escalation goes unseen):** Handoff email send failure; repeat-notification cron not run; escalation never marked holding_message_sent/notified_at.
- **4 (No booking unresolved):** Drift detection only via call_sessions; commitment start missing or wrong; reconciliation/attendance delayed or failed.
- **5 (No reality drift beyond interval):** Reconciliation lookback (2h) and cron interval; reconciliation run skipped or partial; provider list limits; signal marked processed but not applied (lead_locked).
- **6 (No responsibility indefinitely):** Clock skew delaying timeout detection; commitment start missing; closure cron not run or workspace not in batch.
- **7 (Demonstrate correctness historically):** Race and clock skew causing wrong or duplicate execution; job lost in Redis; signal processed_at set without applying state; integrity checks depend on same clocks and run cadence.

---

## Mitigations implemented

| Item | Guarantee(s) | File paths |
|------|--------------|------------|
| **P0-1 Queue job loss on crash** | No silent action failure, no indefinite responsibility, demonstrable correctness | `src/lib/queue/index.ts`: enqueue always writes to DB; dequeue always uses DB (claim_next_job). Redis removed from queue path. |
| **P0-2 Signal processed_at only after reducer** | No lead without state, bounded reality drift, demonstrable correctness | `src/lib/signals/store.ts`: `claimSignalForProcessing` replaced by `setSignalProcessed` (called at end of processing). `src/lib/signals/consumer.ts`: acquire lead lock first; on lock failure enqueue process_signal and throw `LeadLockedRetryError` so signal stays unprocessed and job is retried. |
| **P0-3 Escalation delivery gaps** | No unseen escalation, no silent action failure | `src/lib/queue/index.ts`: added payload types `handoff_notify`, `handoff_notify_batch`. `src/lib/operational-transfer/handoff-notifications.ts`: first-time and repeat handoffs enqueued as jobs; `runHandoffBatchSend` for batch. `src/app/api/cron/process-queue/route.ts`: handles `handoff_notify` and `handoff_notify_batch` by calling notifyHandoff / runHandoffBatchSend. |
| **P1-4 Retry selection race** | No duplicate execution | `supabase/migrations/hardening_claim_due_action_retries.sql`: RPC `claim_due_action_retries(p_limit)` with `FOR UPDATE SKIP LOCKED`. `src/lib/action-queue/persist.ts`: `getDueActionRetries` uses RPC; `claimActionRetry` no-op (claim done in RPC). |
| **P1-5 Claim TTL from DB** | No double run from worker clock | `claim_next_job` (existing) uses `now()` and `now() + interval` in SQL; worker does not use local clock for TTL. Comment in `src/lib/queue/index.ts`. |
| **P2-7 Integrity reconciliation freshness self-heal** | Bounded reality drift | `src/lib/integrity/run-integrity-audit.ts`: when violations include `reconciliation_freshness`, enqueue `closure_reconciliation` for that workspace. |
| **Strict temporal replay per lead** (race: two workers, different signals, same lead) | Demonstrable correctness (7) | Before reducer runs, check for any earlier unprocessed signal for same lead (`occurred_at` < current). If yes: do not process, re-enqueue `process_signal`, throw `EarlierSignalPendingError`. Only the earliest pending signal may execute. `src/lib/signals/store.ts`: `hasEarlierUnprocessedSignal(workspaceId, leadId, currentOccurredAt)`. `src/lib/signals/consumer.ts`: check after lead lock, re-enqueue + throw. `supabase/migrations/signal_replay_order_index.sql`: index on `(workspace_id, lead_id, occurred_at)` WHERE `processed_at IS NULL`. Tests: `__tests__/signal-replay-order.test.ts`. |

Tests: `__tests__/hardening-audit.test.ts` (queue durability, signal processed_at, handoff export, retry shape, CLAIM_TTL). `__tests__/signal-replay-order.test.ts` (earlier-signal check, ordered replay).
