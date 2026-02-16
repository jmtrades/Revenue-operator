# Revenue Performance Infrastructure

Recall-Touch is an **autonomous revenue staff layer**. The system continuously creates revenue even when no new leads arrive.

---

## RevenueLifecycle (per lead)

**Table:** `revenue_operator.revenue_lifecycles` (one row per lead)

| Field | Purpose |
|-------|--------|
| first_contact_at | First inbound |
| booked_at | First booking |
| showed_at | First show |
| last_visit_at | Most recent visit |
| next_expected_visit_at | Expected return (for check-ins) |
| lifecycle_stage | new_lead → active_prospect → scheduled → showed → client → repeat_client / at_risk / lost / reactivated |
| lifetime_value_stage | new, first_visit, repeat, vip |
| revenue_state | potential, scheduled, secured, realized, repeat, at_risk, lost, recovered |
| dropoff_risk | 0–1 |

Operators and event handlers update lifecycle. Sync from lead state: `syncFromLeadState`, `syncFirstContact`, `syncBooked`, `syncShowed`, `syncNoShow`.

---

## Four operators

| Operator | Role | Runs |
|----------|------|------|
| **CaptureOperator** | Inbound enquiries | Event-driven (existing pipeline) |
| **ConversionOperator** | Drives booking commitment | Cron: enqueue decision for active_prospect/potential |
| **AttendanceOperator** | Prevents no-shows, primes attendance | Cron: enqueue for scheduled with upcoming visit |
| **RetentionOperator** | Reactivates, repeat revenue | Cron: check-ins (past expected return), reactivation (at_risk/lost) |

**Cron:** `GET /api/cron/operators` (Bearer CRON_SECRET). Runs conversion, attendance, retention for all active workspaces.

---

## Retention logic (without conversation activity)

- **Expected return window passed** → RetentionOperator schedules check-in (enqueue decision).
- **No-show** → `recordNoShow` + RetentionOperator recovery path; `runRetentionNoShowRecovery` enqueues decision.
- **Long-term silence** → RetentionOperator reactivation (at_risk/lost, last_activity &gt; 14d), sets lead_plan + enqueue.
- **Cancellation** → (Hook from calendar/call events: offer replacement — can call ConversionOperator or enqueue.)

---

## Dashboard

**Revenue performance** page shows lifecycle metrics only (no technical data):

- New opportunities
- Appointments scheduled
- Shows protected
- Clients recovered
- Repeat revenue generated

**API:** `GET /api/lifecycle-metrics?workspace_id=...`

---

## Goal

The business owner should feel: **“This system keeps my calendar full and brings customers back.”**

All decisions move a lead toward revenue realization or retention. The product is an autonomous revenue staff layer, not a messaging tool.
