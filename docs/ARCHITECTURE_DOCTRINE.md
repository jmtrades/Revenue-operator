# Recall-Touch Architecture Doctrine

**Principle:** The system is a staff member with accountability. Every action is explainable by business logic. No decision depends purely on a single LLM output. All decisions pass through deterministic control layers.

**Failure mode:** Lost money for customers. Therefore **correctness > speed > features**.

---

## Five Strict Layers

Nothing may bypass this pipeline.

```
[ Connectors ] → [ Signal Layer ] → [ State Layer ] → [ Decision Layer ] → [ Action Layer ] → [ Proof Layer ]
                    (truth)           (meaning)          (what should)        (what we do)      (value occurred)
```

---

## 1. Signal Layer — Ground Truth

All business events are normalized into **canonical signals** only. No business logic in connectors; only normalization.

### Canonical signal types

| Signal | Source examples | Payload (minimal) |
|--------|------------------|-------------------|
| `InboundMessageReceived` | Twilio, email, web form, CRM | workspace_id, lead_id, conversation_id, message_id, content, channel, external_id, occurred_at |
| `OutboundMessageSent` | Delivery callback | workspace_id, lead_id, message_id, channel, status, occurred_at |
| `BookingCreated` | Calendar, CRM, booking link | workspace_id, lead_id, booking_id, start_at, end_at, occurred_at |
| `BookingCancelled` | Calendar, CRM | workspace_id, lead_id, booking_id, occurred_at |
| `AppointmentStarted` | Calendar, Zoom | workspace_id, lead_id, booking_id, occurred_at |
| `AppointmentCompleted` | Calendar, Zoom, CRM | workspace_id, lead_id, booking_id, occurred_at |
| `AppointmentMissed` | No-show detection, calendar | workspace_id, lead_id, booking_id, occurred_at |
| `PaymentCaptured` | Stripe, CRM | workspace_id, lead_id, amount_cents, occurred_at |
| `CustomerReplied` | Same as InboundMessageReceived (customer responded) | Same — use for “reply received” semantics |
| `CustomerInactiveTimeout` | Cron / no-reply job | workspace_id, lead_id, last_activity_at, occurred_at |

### Rules

- Every connector (Twilio, webhook, calendar, Zoom, CRM) **produces** one or more of these signals.
- Connectors do **not** update lead state, run decisions, or send messages.
- Each signal has an **idempotency key** (e.g. `external_id` + `workspace_id` + signal type). Duplicate key → skip processing.
- Signals are **append-only**. Stored in `canonical_signals` (or equivalent) with `idempotency_key` UNIQUE.

### Schema (see migration)

- `canonical_signals`: id, workspace_id, lead_id, signal_type, idempotency_key UNIQUE, payload jsonb, occurred_at, created_at.
- Index: (workspace_id, lead_id, occurred_at) for replay.

---

## 2. State Layer — Business Reality

A **single persistent lifecycle** per lead. State transitions **only** from signals. Never infer revenue outcomes from message wording. Calendar and time events override conversation assumptions.

### Lifecycle states (mandate)

| State | Meaning |
|-------|--------|
| `NEW` | First signal received, not yet engaged |
| `ENGAGED` | In conversation, not yet qualified |
| `QUALIFIED` | Ready to book |
| `BOOKED` | Has booking, not yet scheduled slot (optional: merge with SCHEDULED) |
| `SCHEDULED` | Appointment on calendar |
| `ATTENDED` | Showed up |
| `NO_SHOW` | Missed appointment |
| `LOST` | Lost / churned |
| `REACTIVATED` | Returned from LOST or inactivity |
| `REPEAT` | Repeat customer |

**Mapping from current codebase:** CONTACTED → ENGAGED, SHOWED → ATTENDED, WON/RETAIN/CLOSED → keep for revenue semantics; add SCHEDULED, NO_SHOW, REPEAT where missing. State machine stays **deterministic**: (current_state, signal_type) → next_state. No LLM in transition.

### Rules

- State machine is **replayable**: rebuilding state from historical signals must yield the same result.
- State stored in `leads.state` (and optionally `revenue_lifecycles` for richer lifecycle).
- **Calendar and time events override**: e.g. AppointmentMissed → NO_SHOW even if last message was “I’ll be there”.

---

## 3. Decision Layer — Operator Brain

Operators act on **state**, not on raw messages. LLM is used **only** to generate wording **after** a decision is chosen. LLM never decides strategy.

### Operators

| Operator | Responsibility | Trigger (state/signal) |
|----------|----------------|------------------------|
| **CAPTURE_OPERATOR** | Inbound enquiry handling | InboundMessageReceived, state NEW/ENGAGED |
| **CONVERSION_OPERATOR** | Booking commitment | ENGAGED/QUALIFIED, no booking yet, cooldown passed |
| **ATTENDANCE_OPERATOR** | No-show prevention, attendance priming | BOOKED/SCHEDULED, appointment in window |
| **RETENTION_OPERATOR** | Check-ins, no-show recovery, reactivation | ATTENDED/REPEAT (return window), NO_SHOW, LOST/REACTIVATED |

### Operator contract (each operator must define)

- **Trigger conditions**: Which (state, signal, time) cause this operator to run.
- **Cooldown windows**: Min time between actions per lead (e.g. 4h, 24h).
- **Maximum attempts**: Cap per lead per campaign/type (e.g. 3 no-show recoveries).
- **Escalation rules**: When to hand to human (e.g. VIP, high value, anger).
- **Human takeover conditions**: Explicit list (opt-out, escalation, approval required).

Output of decision layer: **chosen action type** (e.g. SendMessage, ScheduleFollowup, RecoverNoShow, ReactivateLead) + **context for wording**. No direct send.

---

## 4. Action Layer — Safe Execution

All outbound actions go through an **execution queue**. No direct sending from business logic.

### Action commands (queued only)

- `SendMessage` — send one message (template-filled).
- `ScheduleFollowup` — schedule a future decision or reminder.
- `SendReminder` — e.g. appointment reminder.
- `RecoverNoShow` — start no-show recovery sequence.
- `ReactivateLead` — start reactivation sequence.

### Requirements

- **Idempotent**: Same dedup key → at most one effect (e.g. one message sent).
- **Retry with backoff**: Exponential backoff, max attempts (e.g. 3).
- **Deduplication keys**: Per (lead_id, action_type, idempotency_key).
- **Rate limiting per lead**: Max N messages per day per lead (from settings).
- **Quiet hours**: No send outside business hours (from settings).
- **Opt-out**: Check before every send; skip if opted out.

Current gap: decision job calls `sendOutbound` directly. Target: decision job **enqueues** an action (e.g. SendMessage with template key + slots); a separate **action worker** applies policy (quiet hours, opt-out, rate limit, dedup) and then calls delivery.

---

## 5. Proof Layer — Value Attribution

Every revenue outcome is **recorded** with causality. Dashboard reads **only** from proof records — no inferred estimates.

### Proof record types

| Proof type | Meaning | Causality fields |
|------------|---------|------------------|
| `RecoveredNoShow` | No-show recovered (reschedule / re-engaged) | operator_id, lead_id, signal_id, state_before, state_after |
| `NewBooking` | Booking created (system influenced) | operator_id, lead_id, booking_id, signal_id |
| `SavedConversation` | Conversation kept from going cold | operator_id, lead_id, signal_id |
| `ReactivatedCustomer` | Lost → reactivated | operator_id, lead_id, signal_id, state_before |
| `RepeatVisit` | Repeat appointment / repeat revenue | operator_id, lead_id, booking_id, signal_id |

### Schema

- `revenue_proof`: id, workspace_id, lead_id, proof_type, operator_id, signal_id (fk to canonical_signals or events), state_before, state_after, payload jsonb, created_at.
- Dashboard aggregates **only** from `revenue_proof` (counts by type, by workspace, by time range).

---

## Reliability Requirements

- **Event idempotency**: Every signal has idempotency key; duplicate → skip.
- **Event replay**: Rebuild state from `canonical_signals` in order; same result.
- **Dead letter queue**: Failed jobs → DLQ; no silent drop.
- **Operator audit log**: Every operator run logs: operator_id, lead_id, trigger, decision (action type), timestamp.
- **Action audit log**: Every action enqueued and executed logs: action_type, lead_id, dedup_key, result (sent / skipped / failed).
- **State reconstruction tool**: Admin can recompute lead state from signals for a given lead (or workspace).

### Survival guarantees

- **Duplicate webhooks**: Idempotency key → single effect.
- **Out-of-order events**: Replay order by `occurred_at` (or created_at) per lead.
- **Provider downtime**: Retry with backoff; DLQ on final failure.
- **LLM failure**: Decision already chosen; fallback to safe template; no double send (dedup).

**No revenue action may be executed twice** (dedup + idempotency).

---

## Onboarding Guarantee

Within **60 seconds** of activation, the business must see a **real or simulated** conversation handled **end-to-end** through the **real** pipeline (not UI mocks). Implement a **demo workspace** that feeds events into the real pipeline (e.g. canonical signals) so the first reply is sent via the same path as production.

---

## UI Rules (Control Room)

The interface is a **control room**, not “software”. Show only **outcomes**:

- Leads handled
- Appointments booked
- No-shows prevented
- Customers returned
- Revenue generated

Never show: AI, automation, confidence scores, workflows (in customer-facing UI).

---

## Enterprise Preparation

- One **workspace** = one business location.
- Support: multi-location accounts, shared customer identity across locations, per-location operators, per-location calendars.

---

## Performance Targets

- Thousands of simultaneous conversations.
- Delayed webhooks, burst traffic, partial outages.

Implement: **queue backpressure**, **worker concurrency control**, **timeout recovery**.

---

## Refactor Plan (Execution Order)

See [REFACTOR_PLAN_FIVE_LAYERS.md](./REFACTOR_PLAN_FIVE_LAYERS.md) for the ordered task list and dependencies.

---

## Success Condition

A business owner must be able to say:

**“The system handled my customers and filled my calendar while I wasn’t there.”**

If any part behaves like a chatbot (decisions from message wording alone, no deterministic control), it is **incorrect**.
