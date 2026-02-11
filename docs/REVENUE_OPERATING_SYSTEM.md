# Revenue Operating System — Architecture

The product is a **decision layer** between leads and sales teams — not automation software.

## Product Evolution

```
EXECUTION → UNDERSTANDING → PREDICTION → CONTROL → STANDARD
```

Every system supports long-term ownership of revenue workflow decisions. No isolated features.

## Core Objective

**Primary job:** Determine which conversations matter, protect them, and direct human attention toward revenue-producing actions.

The platform must become **the place a company checks before starting its workday.**

---

## Part 1 — Customer-Facing System

### A. Conversation Readiness Engine (Understanding)

Single score per lead/deal: `conversation_readiness_score` (0–100)

**Signals combined:**
- Engagement timing decay
- Response latency
- Objection patterns
- Follow-up history
- Attendance likelihood
- Behavioural similarity to historical conversions
- Network priors (industry-based patterns from `network_patterns`)

**Exposed:** readiness explanation, risk factors, recommended timing window. Replaces simple lead status.

**Explainable + Auditable:**
- `readiness_drivers`: `[{factor, contribution, evidence_ids}]` — top contributors
- `counterfactuals`: `[{if, then_score, why}]` — what would change the score
- `evidence_chain`: action_log ids, message ids used
- UI: "Why this score" proof drawer with drivers, counterfactuals, evidence

### B. Daily Attention List (Prediction)

Generated list: **"Who requires attention today"**

Ranks leads by impact on revenue outcome. Visible immediately on dashboard load. System prioritizes; user does not decide what to do.

For each lead: readiness score, consequence if ignored, best action timing, confidence level.

### C. Calendar Risk Forecast

48h attendance probability across booked calls.

Shows: likely no-shows, confirmation needed, high-confidence attendees.
Automatically schedules confirmation or recovery actions.

### D. Deal Death Detection

Detects opportunities silently dying. Behavioural patterns match lost deals.

Trigger: "Opportunity slipping — intervention required"
Automatically generates protective actions.

### E. Control Layer

System **executes**, not just recommends:
- Re-prioritize leads
- Escalate to human
- Schedule follow-ups
- Adjust outreach cadence
- Allocate calendar protection

Default: autonomous execution. Users can override.

**Progressive Autonomy (per-workspace):**
- `autonomy_mode`: observe | assist | act
  - observe: no sends, only simulated action logs
  - assist: drafts, approval required for sensitive/high-value
  - act: autonomous within policy and guardrails
- `feature_flags`: followups, confirmations, winback, booking, triage
- `autonomy_ramp_day`: 0..14 — restrict until day N post-creation

---

## Part 2 — Network Intelligence

Aggregate anonymized behavioural patterns across workspaces.

**Stored:** response timing curves, attendance predictors, recovery effectiveness, industry patterns. Used to refine readiness scoring.

**Nightly aggregation jobs** (`/api/cron/network-intelligence`) update `network_patterns` by industry bucket:
- `reply_decay_curves`
- `show_rate` predictors
- `optimal_followup_intervals`
- `recovery_success` rates

Privacy-safe aggregates only. Fed as priors into readiness engine.

**Never expose** raw cross-company data — only insights. System improves as more companies use it.

---

## Part 3 — Ops Backend (`/ops`)

Internal control center. **Never accessible to customers.**

**Auth + RBAC (mandatory):**
- `staff_users` table is source of truth; no OPS_SECRET fallback
- Passwordless login (magic link) or secure credentials
- ADMIN and STAFF roles enforced via middleware
- All ops routes require staff session; no ops endpoint callable without staff auth
- All staff views and actions create `staff_action_logs` entries
- Impersonation: read-only by default
- "Request write access" / "Enable actions" gated by ADMIN

**Ops Dashboard:** Active workspaces, at-risk customers, churn signals, low/high value, failing automations, missed protections.

**Customer Health Workflow (operating console):**
- `workspace_health`: reason_codes, last_seen_at, integration_status
- `ops_alerts`: actionable queue with severity
- One-click staff actions (require write access):
  - Run recovery sweep
  - Pause workspace
  - Re-drive DLQ
  - Send customer check-in email (template)

**Customer Intervention:** View workspace, read-only impersonation, trigger actions, pause automation, recover pipelines.

**Intelligence:** Industry conversion curves, best follow-up intervals, no-show patterns.

**Health Scoring:** Per-workspace health_score from usage, coverage, reliance.

**Alerting:** Inactivity, broken integrations, declining pipeline.

---

## Part 4 — Stability, Plans & Sequences

### A. Intervention Cooldowns (Anti-Thrash)

**Table:** `lead_intervention_limits`
- Per-lead cooldown rules prevent repeated interventions
- `cooldown_by_type_hours`: { reassurance:6, clarify:12, urgency:24, schedule:12, confirm:6, revive:24 }
- `max_touches_per_day_by_stage`: stage-based daily limits
- Decision pipeline calls `canInterveneNow()` before execution
- If blocked: log RESTRAINT, schedule observe check via lead_plans

### B. Single Authority Scheduler (Lead Plans)

**Table:** `lead_plans`
- At most ONE active plan per lead
- All subsystems schedule work via lead_plans
- Before enqueueing decision: check lead_plans
- If plan with `next_action_at` in future: do not enqueue duplicate
- If current decision supersedes: cancel old plan, set new plan

### C. Confidence Gating + Uncertainty Deferral

**Settings:** `min_confidence_to_act` (0.55), `min_confidence_to_schedule` (0.45)

- If confidence ≥ min_confidence_to_act: proceed to execution
- If confidence ≥ min_confidence_to_schedule: do NOT send; schedule observe via lead_plans
- Else: record inaction_reason = "low_confidence", schedule long recheck (24–48h) if lead active
- "uncertainty_restraint" action_log entries explain why system waited

### D. Deterministic Sequence Engine

**Table:** `sequences` — approved cadences (followup, revival, attendance)
**Table:** `sequence_runs` — active sequence per lead

- No freeform scheduling; sequences define steps with delays and template keys
- When decision recommends follow-up/revival: choose/start sequence (not one-off jobs)
- `lead_plans` stores sequence_id + step and next_action_at
- process-webhook stops sequences on reply

### E. Learning Safety (No Poisoning)

- `workspace_weight = clamp(local_sample_size / 50, 0, 1)`
- `prior_weight = 1 - workspace_weight`
- Any readiness input from network_patterns multiplied by prior_weight
- Local workspace signals dominate; network priors never override opt-out/safety/policy
- `learning_provenance`: { local_sample_size, prior_sample_size, blend_ratio }

---

## Data Model (Key Additions)

- `conversation_readiness` — scores, explanations, risk factors, readiness_drivers, counterfactuals, evidence_chain per lead/deal
- `network_patterns` — anonymized aggregates (response curves, attendance predictors, optimal intervals, recovery success)
- `staff_users`, `staff_magic_links`, `staff_sessions` — ops auth
- `staff_action_logs` — ops interventions
- `workspace_health` — computed health scores, reason_codes, last_seen_at, integration_status
- `settings` — autonomy_mode, feature_flags, autonomy_ramp_day, cooldown_by_type_hours, max_touches_per_day_by_stage, min_confidence_to_act, min_confidence_to_schedule
- `lead_intervention_limits` — last_intervened_at, cooldown_until, daily_touch_count, anti-thrash
- `lead_plans` — single authority scheduler, next_action_type, next_action_at, sequence_id, sequence_step
- `sequences` — workspace cadences (followup, revival, attendance)
- `sequence_runs` — active sequence per lead, current_step
