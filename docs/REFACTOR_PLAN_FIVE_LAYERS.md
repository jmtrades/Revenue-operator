# Refactor Plan: Five Layers (Execution Order)

This plan refactors the codebase to the [Architecture Doctrine](./ARCHITECTURE_DOCTRINE.md). Order is chosen so each step has minimal dependency on unfinished work and can be validated incrementally.

---

## Phase 1: Signal Layer (Ground Truth)

**Goal:** All business events become canonical signals. Connectors only normalize.

### 1.1 Schema and types

- [ ] Add migration: `canonical_signals` table (id, workspace_id, lead_id, signal_type, idempotency_key UNIQUE, payload jsonb, occurred_at, created_at). Index (workspace_id, lead_id, occurred_at).
- [ ] Add `src/lib/signals/types.ts`: enum/union of signal types; `CanonicalSignal` interface; `idempotencyKey(signal)` helper.
- [ ] Add `src/lib/signals/store.ts`: `insertSignal(signal)` — insert with ON CONFLICT (idempotency_key) DO NOTHING; return inserted vs skipped.

### 1.2 Connectors produce signals only

- [ ] Refactor webhook path: raw webhook → **normalize to** `InboundMessageReceived` (or `CustomerReplied`) → `insertSignal` → **single consumer** that reads signals and runs state + decision + action. No business logic in Twilio/webhook handler (only parse body, resolve workspace/lead, build signal).
- [ ] Same for `normalize-to-pipeline.ts`: output canonical signal, then pipeline consumes signal.
- [ ] Add signal producers for: BookingCreated, BookingCancelled, AppointmentStarted, AppointmentCompleted, AppointmentMissed (from Zoom/calendar when implemented). PaymentCaptured from Stripe.

### 1.3 Single pipeline consumer

- [ ] One function: `processCanonicalSignal(signalId)` (or process by idempotency_key). It: load signal → state transition → optionally enqueue decision → record proof when applicable. Current `processWebhookJob` and `processNormalizedInbound` logic moves behind this (state + enqueue decision).

---

## Phase 2: State Layer (Deterministic)

**Goal:** State transitions only from signals. Replayable.

### 2.1 State machine alignment

- [ ] Extend `src/lib/types` and DB enum: add SCHEDULED, ATTENDED, NO_SHOW, REPEAT if missing. Map existing SHOWED → ATTENDED, etc.
- [ ] In `state-machine/index.ts`: define transitions from **canonical signal types** (e.g. InboundMessageReceived → NEW→ENGAGED; BookingCreated → BOOKED/SCHEDULED; AppointmentCompleted → ATTENDED; AppointmentMissed → NO_SHOW). Keep transition table (from_state, signal_type) → to_state.
- [ ] State updates only in one place: inside `processCanonicalSignal` after evaluating transition from signal.

### 2.2 No state from message wording

- [ ] Remove any transition that depends on message content (e.g. “confirmed” / “yes” → BOOKED). Booking state comes only from BookingCreated / calendar. Optionally keep “commitment” as a tag for analytics, but not for state.
- [ ] Remove or isolate commitment/disinterest logic from state path; use only for analytics or escalation flags, not for lead.state.

### 2.3 Replay and reconstruction

- [ ] Add `replaySignalsForLead(workspaceId, leadId)`: load signals for lead by occurred_at, apply state machine in order, return final state. Optional: `reconstructLeadState(leadId)` that writes back to leads.state (admin only).

---

## Phase 3: Decision Layer (Operator Contracts)

**Goal:** Operators define trigger, cooldown, max attempts, escalation. LLM only for wording.

### 3.1 Operator contracts (code)

- [ ] Add `src/lib/operators/contracts.ts`: for each operator (CAPTURE, CONVERSION, ATTENDANCE, RETENTION) define: triggerConditions(state, lastSignal, time), cooldownMinutes, maxAttemptsPerLead, escalationRules, humanTakeoverConditions. Export type `OperatorContract`.
- [ ] Decision path: load state + last signals → **which operator(s)** can run → **contract checks** (cooldown, max attempts, escalation) → choose **one** action type (e.g. SendMessage with action_type). No LLM in this step.

### 3.2 Decision job uses contracts only

- [ ] Refactor `decision-job` / `decision-with-engines`: (1) Compute state + contract checks. (2) If intervention chosen, select **action type** and template key. (3) **Enqueue action** (Phase 4), do not call sendOutbound. (4) LLM/template only for **message body** passed to action payload (or action worker fetches template).

### 3.3 Audit

- [ ] Operator audit log: every time an operator runs, log operator_id, lead_id, trigger, decision (action_type), timestamp to `operator_audit_log` (new table or existing action_logs with entity_type=operator).

---

## Phase 4: Action Layer (Safe Execution)

**Goal:** All sends and follow-ups go through execution queue. Idempotent, dedup, rate limit, quiet hours.

### 4.1 Action commands and queue

- [ ] Add `src/lib/action-queue/types.ts`: union type ActionCommand = SendMessage | ScheduleFollowup | SendReminder | RecoverNoShow | ReactivateLead (with payloads). Each has dedup_key (or derive from lead_id + action_type + idempotency_key).
- [ ] Add `src/lib/action-queue/enqueue.ts`: enqueueAction(command). Writes to job_queue with job_type `action` and payload = command. Dedup: if same dedup_key already pending, skip (or merge).
- [ ] Add `src/lib/action-queue/worker.ts`: dequeue action job → check opt-out, quiet hours, rate limit per lead → if pass, execute (e.g. SendMessage → call sendOutbound). Log to action_audit_log. Retry with backoff on failure; on final failure → DLQ.

### 4.2 Decision job enqueues actions only

- [ ] Replace direct `sendOutbound` in decision job with `enqueueAction({ type: 'SendMessage', ... })`. Message body (template-filled) in payload. Action worker does policy checks and send.

### 4.3 Safety

- [ ] Idempotency: SendMessage stores dedup_key; before send, check if this dedup_key already sent (e.g. outbound_messages.metadata.dedup_key). Skip if yes.
- [ ] Rate limit: in action worker, count sends today for lead; if >= max per day, skip and log.
- [ ] Quiet hours: in action worker, check workspace settings; skip if outside window.

---

## Phase 5: Proof Layer (Value Attribution)

**Goal:** Every revenue outcome recorded. Dashboard from proof only.

### 5.1 Proof schema and write path

- [ ] Migration: `revenue_proof` table (id, workspace_id, lead_id, proof_type, operator_id, signal_id, state_before, state_after, payload jsonb, created_at). proof_type enum: RecoveredNoShow, NewBooking, SavedConversation, ReactivatedCustomer, RepeatVisit.
- [ ] Add `src/lib/proof/record.ts`: `recordProof(record)`. Called when: no-show recovery sent, booking created (by system), conversation saved (e.g. reply sent after timeout risk), reactivation sent, repeat visit recorded.

### 5.2 Wire proof recording

- [ ] When state transitions to ATTENDED (AppointmentCompleted): if previous state was BOOKED/SCHEDULED, record NewBooking or similar if operator drove it; or record RepeatVisit if state was REPEAT.
- [ ] When RecoverNoShow action executes: record RecoveredNoShow with operator_id, signal_id (AppointmentMissed), state_before/after.
- [ ] When reactivation action executes: record ReactivatedCustomer.
- [ ] When retention check-in sends: optionally SavedConversation (or define precisely when to count).

### 5.3 Dashboard reads proof only

- [ ] Lifecycle metrics API (or new proof API): aggregate from `revenue_proof` only. Count by proof_type, workspace_id, time range. Dashboard shows: leads handled, appointments booked, no-shows prevented, customers returned, revenue generated — from proof counts, not from heuristics or inferred metrics.

---

## Phase 6: Reliability and Safety

### 6.1 Event replay and DLQ

- [ ] Ensure all failed jobs (decision, action) go to DLQ with error message. No silent drop.
- [ ] State reconstruction: admin endpoint or script that calls `replaySignalsForLead` and optionally updates lead.state.

### 6.2 Onboarding (60-second guarantee)

- [ ] Demo workspace: on activation, enqueue one or more canonical signals (e.g. InboundMessageReceived with simulated message) into real pipeline. Pipeline processes → state → decision → action → send. User sees real reply within 60s. No UI mock.

### 6.3 Performance

- [ ] Queue backpressure: if queue depth above threshold, reject or defer new decision jobs (or signal processing) with 503/retry-after.
- [ ] Worker concurrency: limit concurrent action workers per workspace or globally.
- [ ] Timeout recovery: decision job and action job have timeouts; on timeout, mark failed and move to DLQ (no partial send).

---

## Phase 7: Cleanup and UI

### 7.1 Remove or isolate

- [ ] Remove logic that infers state from message wording (e.g. “confirmed” → state change). Keep only signal-driven state.
- [ ] Remove direct send from any path other than action worker (search for sendOutbound / delivery calls).
- [ ] Replace heuristic “value” metrics with proof-based counts everywhere in dashboard.

### 7.2 UI rules

- [ ] Audit dashboard and customer-facing UI: remove any display of “AI”, “automation”, “confidence scores”, “workflows”. Show only outcome metrics (leads handled, appointments booked, no-shows prevented, customers returned, revenue generated).

---

## Dependencies Summary

- **Phase 1** must be done first (signals are input to state and proof).
- **Phase 2** can overlap with 1.2–1.3 (state machine consumes signals).
- **Phase 3** depends on state being signal-driven (2).
- **Phase 4** depends on decision layer producing action commands (3).
- **Phase 5** can be implemented as soon as proof schema exists; wiring depends on 3 and 4.
- **Phase 6–7** can run in parallel after 4 and 5.

Recommended order: **1.1 → 1.2 → 2.1 → 1.3 → 2.2 → 3.1 → 4.1 → 3.2 → 4.2 → 5.1 → 5.2 → 4.3 → 5.3 → 6.x → 7.x**.
