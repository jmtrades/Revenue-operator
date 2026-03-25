# Work Unit Layer — Universal Operational Infrastructure

This document describes the Work Unit abstraction and related upgrades. No breaking changes to existing behavior.

## 1. Work Unit

**Table:** `revenue_operator.work_units`

A Work Unit is the universal abstraction for:
- request, commitment, negotiation, compliance obligation, scheduled action, financial settlement, document exchange, review/approval.

Columns: `id`, `workspace_id`, `type`, `subject_type`, `subject_id`, `state`, `completion_required_confirmation`, `completion_required_evidence`, `completion_required_payment`, `completion_required_third_party`, `completion_allows_internal_close`, `created_at`, `updated_at`.

**Existing behavior:** Every `shared_transaction` is represented as a Work Unit with `type = 'shared_transaction'`, `subject_type = 'shared_transaction'`, `subject_id = shared_transaction.id`. Backfill runs once; a trigger keeps new/updated shared_transactions in sync. `reciprocal_events`, `operational_responsibilities`, and `outcome_dependencies` continue to reference `shared_transactions(id)`; no change to existing APIs or crons.

## 2. Domain Packs

**Table:** `revenue_operator.domain_packs`

Per-workspace config for work unit types, state transitions, recovery rules, confirmation/evidence rules. `config_json` holds the pack definition. Policy decides action; AI only extracts entities. No scripts.

## 3. Connector Events

**Table:** `revenue_operator.connector_events`

Normalized ingest from all channels (email, CRM, calendar, forms, etc.). Connectors emit only; all logic remains centralized. Events can be linked to a work unit via `work_unit_id`. Idempotency via `(workspace_id, channel, external_id)`.

## 4. Completion Definitions

**Table:** `revenue_operator.completion_definitions`

Default completion rules per work unit type: `requires_confirmation`, `requires_evidence`, `requires_payment`, `requires_third_party`, `allows_internal_close`. Completion is deterministic.

**Work unit types (Layer 1 expansion):** `shared_transaction`, `inbound_lead`, `outbound_prospect`, `qualification_call`, `appointment`, `followup_commitment`, `payment_obligation`, `document_request`, `compliance_notice`, `contract_execution`, `retention_cycle`, `dispute_resolution`. Definitions and allowed states live in `@/lib/work-unit/types`. State machine details can be overridden per domain in domain pack `config_json`. Migration `work_unit_types_completion_definitions.sql` seeds completion rules for all types per workspace.

## 5. Unified Intent Interpreter

**Module:** `@/lib/work-unit` (e.g. `interpretInboundMessage`, `parseAndInterpret`)

- Input: AI contract (intent, confidence, entities, sentiment, risk_flags, recommended_action).
- Output: Same plus `work_unit_type` (deterministic map from intent) and `urgency` (from risk_flags).
- Policy still decides final action; AI never selects arbitrary next action.

## 6. Operational Ambiguity Expansion

**Table:** `revenue_operator.operational_ambiguity_signals`

**Types:** `multi_thread_contradiction`, `expiring_obligation`, `silent_retraction`, `unauthorized_authority`, `compliance_lapse` (plus existing parallel_reality, external_activity, completion_decay).

**Module:** `@/lib/operational-ambiguity/ambiguity-signals`

All statements factual, ≤90 chars. Documentary only; no metrics.

## Migration Order

Apply in order (if your runner uses lexical order, ensure `work_units_universal_layer` runs before any migration that depends on `work_units`):

1. `work_units_universal_layer.sql` — creates `work_units`, backfill, trigger
2. `domain_packs.sql`
3. `connector_events.sql`
4. `completion_definitions.sql`
5. `operational_ambiguity_expansion.sql`

## Rules (Unchanged)

- No dashboards; no KPIs; no marketing tone.
- No generative text to customers; all public text ≤90 chars.
- Deterministic state machines only; no probabilistic decisions.
- No internal ID exposure; no deletion of historical records.
- Settlement gating and doctrine tests preserved.
