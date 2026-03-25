# System Expansion — Implemented Layers

This document summarizes the infrastructure layers implemented per the governance-first revenue workforce expansion plan. No simplification; no removal of governance; no generative freeform output.

## Layer 1 — Universal Work Unit Expansion

- **Module:** `@/lib/work-unit/types.ts`, `@/lib/work-unit/index.ts`
- **Work unit types:** `shared_transaction`, `inbound_lead`, `outbound_prospect`, `qualification_call`, `appointment`, `followup_commitment`, `payment_obligation`, `document_request`, `compliance_notice`, `contract_execution`, `retention_cycle`, `dispute_resolution`
- **Per type:** allowed_states, required_confirmations, completion_* flags, responsible_actor_role, escalation_triggers (no AI decides states)
- **Migration:** `work_unit_types_completion_definitions.sql` — seeds `completion_definitions` for all types per workspace
- **Intent interpreter:** Extended `INTENT_TO_WORK_UNIT_TYPE` for booking→appointment, payment→payment_obligation, follow_up→followup_commitment, etc.

## Layer 2 — Domain Pack Engine

- **Module:** `@/lib/domain-packs/` (schema, resolve, strategy-engine, presets)
- **Strategy graph:** States (discovery, pain_identification, qualification, authority_check, timeline_check, financial_alignment, objection_handling, offer_positioning, compliance_disclosure, commitment_request, follow_up_lock, escalation, disqualification). Each state: allowed_intents, emotional_posture, required/forbidden phrases, required_disclosures, exit_conditions, transition_rules. AI cannot invent states.
- **Objection tree library:** Nodes with objection_phrase, soft_redirect_path, hard_redirect_path, escalation_threshold, compliance_override, disqualification_condition. Stored in `domain_packs.config_json`.
- **Regulatory matrix:** required_disclaimers, tcpa_constraints, fair_housing_language, insurance_disclosures, debt_collection_disclaimers, hipaa_safe_handling, state_based_quiet_hours, recording_consent_required, opt_out_enforcement. Violations → approval_required.
- **Resolver:** `resolveDomainPackConfig(workspaceId)` returns typed `DomainPackConfig`; `runStrategyEngine(input)` returns suggested_state_transition, disclosure_blocks, compliance_required.

## Layer 3 — Adaptive Conversation Intelligence

- **Module:** `@/lib/adaptive-conversation/` (ai-output-schema, emotional-signals)
- **AI output schema (structured JSON only):** `intent`, `emotional_signals` (urgency_score, skepticism_score, compliance_sensitivity, aggression_level, authority_resistance, trust_requirement), `risk_flags`, `confidence`, `suggested_state_transition`. Never message text.
- **Emotional signals:** Type and merge helpers; persist per thread in application layer; influence strategy transitions only.

## Layer 4 — Multi-Channel Orchestration

- **Module:** `@/lib/channel-policy/` (types, resolver)
- **Channel types:** sms, email, whatsapp, voice, instagram_dm, web_chat, voicemail_drop
- **Channel policy:** primary_channel, fallback_channel, escalation_channel, quiet_hours (enforced). Resolver: `resolveChannelPolicy(input)`, `isWithinQuietHours(policy, now)`.
- **Migration:** `channel_policies.sql` — table for per-workspace, per-intent policy. Resolver falls back to compliance pack quiet hours when table missing or no row.

## Layer 6 — Governance Expansion

- **Approval modes:** `autopilot`, `preview_required`, `approval_required`, `locked_script`, `jurisdiction_locked` (type in `@/lib/governance/message-policy`, DB in message_policies and settings).
- **Role matrix:** `owner`, `admin`, `operator`, `closer`, `compliance`, `auditor` (workspace_roles CHECK updated).
- **Migration:** `governance_approval_modes_and_roles.sql` — extends approval_mode checks and adds `closer` to workspace_roles.

## Layer 9 — Action Intents Expansion

- **Module:** `@/lib/action-intents/index.ts`
- **New intent types:** `place_outbound_call`, `send_message`, `schedule_followup`, `request_document`, `collect_payment`, `escalate_to_human`, `generate_contract`, `request_disclosure_confirmation`, `record_verbal_consent`. All remain idempotent (dedupe_key), claimed atomically, completed append-only.

## Pricing Layer — Feature Gating

- **Module:** `@/lib/feature-gate/` (types, resolver)
- **Tiers:** solo ($297), growth ($997), team ($2,500), enterprise (contract). Features: domain_packs_max, channels_max, governance, approval_mode_preview/required, multi_location, role_governance, compliance_packs, supervisor_mode, dedicated_infra, custom_compliance, sso, sla, api_integrations, adaptive_engine.
- **Resolver:** `resolveBillingTier(workspaceId)`, `allowFeature(workspaceId, feature)`, `getMaxDomainPacks`, `getMaxChannels`. Deterministic; enforced in policy layer.
- **Migration:** `billing_tier_feature_gate.sql` — `workspaces.billing_tier` (solo|growth|team|enterprise), default `solo`.

## Layer 10 — Industry-Coverage Modules

- **Module:** `@/lib/domain-packs/presets/industry-packs.ts`
- **Presets:** Real Estate (motivated seller, timeline, offer framing, fair housing), Insurance (coverage, disclosures, recording consent), Solar (incentive compliance), Legal Intake (case type, conflict check, retainer). Each: strategy graph, objection tree, regulatory matrix. Exported as `REAL_ESTATE_PACK`, `INSURANCE_PACK`, `SOLAR_PACK`, `LEGAL_INTAKE_PACK` and `getIndustryPackPreset(domainType)`.

## Reliability Guarantees (Preserved)

- Deterministic ordering; append-only state; idempotent actions; no probabilistic decisions; ≤90 character doctrine; no internal IDs exposed; neutral UI language; no deletion of historical records; atomic state transitions.

## Migration Order (New)

After existing work_units, domain_packs, completion_definitions, message_policies, speech_governance, approval_mode_setting:

1. `work_unit_types_completion_definitions.sql`
2. `channel_policies.sql`
3. `governance_approval_modes_and_roles.sql`
4. `billing_tier_feature_gate.sql`

## Not Implemented in This Phase

- **Layer 5 (Live Call Intelligence):** Real-time transcription ingest, strategy overlay, supervisor mode — tables and APIs to be added in a later phase.
- **Layer 7 (Self-Optimizing Internal Engine):** Branch success rate, objection resolution lift, etc. — internal metrics only; no auto-modify; to be wired when analytics layer is ready.
- **Layer 8 (Enterprise Infrastructure):** Multi-location DB model, region-based compliance, SSO (SAML/OIDC), audit export, data retention, encryption at rest, legal hold — partial (billing_tier, roles); full infra in later phase.
- **Layer 11:** Integration with reciprocal_events, operational_responsibilities, outcome_dependencies, thread amendments, proof capsule, temporal stability, settlement gating is **unchanged**; existing behavior preserved.

Build, prod:gate, health endpoint, trial and checkout contracts remain unchanged. All execution still emits intents; state changes remain append-only; customer-facing text remains template-based.
