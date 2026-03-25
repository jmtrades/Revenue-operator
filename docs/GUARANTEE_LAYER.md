# Guarantee Layer

**Chief Reliability Architect — runtime guarantees that enforce outcome progression.**

The Guarantee Layer sits **above** the pipeline (Signal → State → Decision → Action → Proof). It does not replace it. It **continuously evaluates** conversations for failure risk and **triggers corrective decisions** that flow through the existing pipeline.

Recall-Touch is a Revenue Continuity Operator. The system does **not** automate conversations; it **guarantees progression** toward real business outcomes.

**Business outcome** = booking | attendance | completed purchase | returning customer.

---

## Commitment Stability (Preventative)

The system **prevents** failures before thresholds, not only reacts after.

**Internal state (not exposed in UI):** `commitment_pressure_level`  
0 = stable, 1 = weakening, 2 = unstable, 3 = high_risk.

**Deterministic signals that increase pressure:**  
Reply latency increasing vs previous; vague replies (“maybe”, “I’ll see”, “depends”); repeated question; scheduling delayed multiple times; user stops asking questions; short reply to reminder without confirmation; reschedule attempts; long pause after booking link sent.

**Signals that reset pressure:**  
Concrete logistical questions; confirms time/date; provides availability; user initiates conversation.

**Enforcement (runs before time-based invariants):**  
- Level 2 → stabilization message via decision layer.  
- Level 3 → proactive reassurance or clarification (plan + decision).  
- Persistent level 3 (e.g. 24h) → escalate to human.

No new UI. No scores shown. Receptionist-style only. Goal: sense hesitation and stabilize commitment so the system prevents failures rather than chases them.

---

## Capacity Stability & Revenue Protection

The system **protects time allocation** and **revenue quality** by adapting behaviour to workspace capacity. Internal only. No UI. No scoring. No marketing or fake scarcity.

**Internal state (not exposed in UI):** `capacity_pressure_level` per workspace  
0 = open, 1 = normal, 2 = limited, 3 = critical.

**Deterministic inputs:**  
Available booking slots in next 7 days; days until next free slot; recent booking velocity (last 72h); waitlist count (leads in pipeline). Logic: many open slots → open; filling steadily → normal; few remaining → limited; almost full → critical.

**Behaviour adaptation (decision layer):**  
- **Open:** Conversational, encourage booking.  
- **Normal:** Balanced qualification.  
- **Limited:** Faster qualification, avoid long explanations, push toward commitment.  
- **Critical:** Direct scheduling language, stop unnecessary conversation, prioritise decisive leads; indecisive leads deferred until availability returns.

**Revenue Protection Guarantee:**  
When capacity ≥ limited: system prioritises decisive progress over conversation depth.  
When capacity is critical and lead remains indecisive: reduce followup attempts (defer intervention), delay reactivation until availability returns (skip reactivation enqueue when critical).

No marketing tactics. No fake scarcity or urgency wording. Only conversation efficiency and time allocation.

---

## Economic Priority & Revenue Quality Guarantee

The system **allocates attention the way an experienced business owner would**: it protects revenue value, not only conversations and capacity. Internal only. No UI. No analytics. No configuration.

**Internal state (not exposed in UI):** `economic_priority_level` per lead  
0 = low, 1 = standard, 2 = important, 3 = critical.

**Deterministic inputs (no predictions, no AI scoring):**  
Returning customer (lifecycle repeat/vip); deal value tier (value_cents bands); urgency language in messages; previous purchase value (won deals); referral indicator (metadata); proximity/local (metadata when present).

**Decision layer considers:** conversation_state, commitment_pressure_level, capacity_pressure_level, economic_priority_level, temporal_urgency_level.

**Rules:**  
- Capacity critical AND priority low → defer followup.  
- Capacity critical AND priority high → prioritise booking.  
- Priority critical → increase stabilization attempts (one extra round before escalation in commitment stability).  
- Priority low AND indecisive → reduce intervention depth (defer).

**Revenue Quality Guarantee:**  
High-value opportunities must not be displaced by lower-value conversations. The system defers low-priority leads when capacity is critical and prioritises booking for high-priority leads so that attention follows value.

---

## Temporal Urgency & Time Allocation Guarantee

The system **allocates schedule like an experienced operations manager**: it decides not only whether a booking happens but when it should happen to protect revenue yield. Internal only. No UI. No configuration. No scoring shown to users.

**Internal state (not exposed in UI):** `temporal_urgency_level` per lead  
0 = flexible, 1 = normal, 2 = time_sensitive, 3 = immediate.

**Deterministic inputs:**  
Urgency language in messages; service urgency category (metadata when present); repeat customer booking patterns (past call_sessions); proximity to next available slot (capacity inputs); cancellation openings (recent cancellations); time since enquiry vs typical booking window.

**Decision layer considers:** conversation_state, commitment_pressure_level, capacity_pressure_level, economic_priority_level, temporal_urgency_level.

**Rules:**  
- Immediate urgency + high priority → offer nearest slot (slot_preference=nearest in calendar-optimization).  
- Flexible + low priority → offer distant availability first (slot_preference=distant).  
- Repeat customer → prefer historical booking window (slot_preference=historical).  
- Full calendar + urgent → trigger replacement-slot logic (prioritise booking when capacity critical and temporal urgent).  
- Low urgency + high capacity → delay commitment push (prefer qualification over booking when temporal flexible and capacity open/normal).

**Time Allocation Guarantee:**  
Right customer receives the right time to maximize revenue per hour. Slot recommendation uses temporal urgency and economic priority to set nearest/distant/historical preference; decision layer delays or prioritises booking accordingly.

---

## Trajectory Intelligence

The system **optimises future operational stability** over weeks, not just current conversations. Internal only. No UI. No analytics or forecasting screens. Only behavioural changes inside existing decision logic (when decisions happen, not what is said). No campaigns, marketing, or persuasion copy.

**Internal states (per workspace, not exposed in UI):**  
- **pipeline_balance_state:** high_value_underrepresented, low_value_overload, future_overload, future_empty.  
- **return_cycle_state:** return_cycle_underperforming (returning customers below expected).  
- **demand_temperature_state:** overheated | normal | underheated.

**Pipeline balance (deterministic):**  
High vs low value ratio in pipeline (deals open/booked); new vs repeat; overloaded vs empty days in next 7.  
- **High value underrepresented** → prioritise commitment (don’t delay commitment push for high-priority leads).  
- **Low value overload** → soften followups (defer followup for low-priority when not underheated).  
- **Future overload** → shift bookings later (slot_preference distant for non-immediate leads in calendar-optimization).  
- **Future empty days** → accelerate decisions (don’t delay commitment push).

**Return cycle:**  
If returning customers drop below expected (e.g. current 30d vs previous 30d), trigger reactivation earlier (shorter horizon in reactivation engine).

**Demand temperature:**  
- **Overheated:** reduce followups and protect schedule (defer follow_up/win_back/recovery for low-priority).  
- **Underheated:** accelerate decision loops and reactivations (don’t soften; use shorter reactivation horizon).

**Goal:** System maintains business stability automatically over weeks.

---

## Invariants (Five Time-Based Guarantees)

Each invariant is enforced by **deterministic state monitoring**. No probabilistic scoring visible to users. No marketing logic. No campaigns. Only state transitions tied to revenue events.

| # | Invariant | Meaning | Corrective action |
|---|-----------|---------|-------------------|
| 1 | **Response continuity** | No inbound message remains unacknowledged beyond a human-reasonable delay. | Trigger decision (reply) or escalate. |
| 2 | **Decision momentum** | A conversation may not remain in the same decision state indefinitely. | Re-engage (follow-up) or escalate. |
| 3 | **Attendance stability** | After booking, detect instability (hesitation, uncertainty, silence near appointment). | Trigger stabilizing communication or escalate. |
| 4 | **Recovery persistence** | A lead is not considered lost after initial silence. Recovery attempts across time using context memory. | Schedule/enqueue recovery (re-engage) or escalate after max attempts. |
| 5 | **Lifecycle return** | After service completion, track expected return timing and restart conversation when relevant. | Enqueue return-timed conversation. |

---

## Architecture Requirement

- Each guarantee = **deterministic state monitoring** (timestamps, state, presence of booking/appointment, attempt counts).
- **No user-visible scoring.** No marketing logic. No campaigns.
- Only **state transitions tied to revenue events**.
- Corrective actions are **Decision layer** outputs (e.g. enqueue decision job, set lead plan, or escalate). No direct sending from the guarantee layer.

---

## Escalation Rule

If the system **cannot confidently progress** a conversation after **defined attempts**, it must **escalate to a human** rather than continue automated messaging.

- Track corrective attempt count per lead per guarantee type (or globally per lead).
- When threshold exceeded → log escalation, send holding message, stop automated progression for that lead until human resolves.

---

## Behavior Requirement

Messages triggered by the guarantee layer still go through the normal pipeline and must remain **receptionist-grade human communication**. The system reduces uncertainty; it does not persuade, pressure, or market.

---

## Success Condition

The system should make **silent revenue failure impossible**.

A business owner should experience: **Customers follow through without manual chasing.**

All implementation must reinforce this guarantee model. Reject any change that weakens reliability in favor of flexibility.

---

---

## Implementation

| Component | Path | Purpose |
|-----------|------|---------|
| Invariants & thresholds | `src/lib/guarantee/invariants.ts` | Constants, breach type. |
| **Commitment stability** | `src/lib/guarantee/commitment-stability.ts` | Preventative pressure (0–3) from deterministic signals; level 2/3 → stabilization/reassurance; persistent 3 → escalate. Not exposed in UI. |
| **Capacity stability** | `src/lib/guarantee/capacity-stability.ts` | Workspace capacity pressure (0–3) from slots, velocity, waitlist. Drives decision adaptation and revenue protection. Table: `guarantee_capacity_state`. Not exposed in UI. |
| **Economic priority** | `src/lib/guarantee/economic-priority.ts` | Lead economic priority (0–3) from lifecycle, deal value, urgency, referral, etc. Drives defer/prioritise and stabilization. Table: `guarantee_economic_priority`. Not exposed in UI. |
| **Temporal urgency** | `src/lib/guarantee/temporal-urgency.ts` | Lead temporal urgency (0–3) from urgency language, slot proximity, repeat pattern, time since enquiry, etc. Drives slot preference (nearest/distant/historical) and delay/prioritise booking. Table: `guarantee_temporal_urgency`. Not exposed in UI. |
| **Trajectory** | `src/lib/guarantee/trajectory.ts` | Pipeline balance, return cycle, demand temperature. Drives prioritise/soften, shift later, accelerate, reactivation horizon. Table: `guarantee_trajectory_state`. Not exposed in UI. |
| Evaluate | `src/lib/guarantee/evaluate.ts` | Deterministic breach detection per lead (time-based). |
| Enforce | `src/lib/guarantee/enforce.ts` | Corrective action (enqueue decision/reactivation) or escalate; when capacity critical, recovery_persistence does not enqueue reactivation. |
| Cron | `GET /api/cron/guarantee` | Update capacity and trajectory per workspace; economic priority and temporal urgency per lead in batch; commitment stability first; then time-based invariants. |

Escalation trigger `guarantee_stagnation` added to escalation engine; after `MAX_CORRECTIVE_ATTEMPTS` (3) no_reply_timeout events in 30 days, next breach for that lead triggers human handoff instead of another automated message.
