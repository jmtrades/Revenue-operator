# Commercial Execution Infrastructure — Deliverables

## Migration list (new / enhanced)

| Migration | Purpose |
|-----------|---------|
| `lead_memory.sql` | Universal commercial memory per lead (objections, commitments, disclosures, consent, risk, emotional profile). Upsert only. |
| `call_outcomes.sql` | Call outcome ingestion (duration, disposition, objections_tags, commitment_outcome, sentiment, consent/compliance confirmed). Append-only. |
| `channel_escalation_rules.sql` | Deterministic escalation (escalation_sequence_json, timing_intervals_json). No AI decides. |
| `strategy_lifecycle_states.sql` | Extend conversation_strategy_state.current_state with lifecycle states (cold_prospect, warm_inbound, appointment_set, no_show, recovered, payment_pending, contract_sent, disclosure_required, awaiting_compliance, disputed, reactivation). |
| `call_script_blocks_enhanced.sql` | Voice script intelligence (emotional_state, objection_context, branching_rules_json, closing_attempts_json, compliance_checkpoints_json). |
| `enterprise_governance_superset.sql` | dual_approval_required, compliance_only_approval; approval_timeout_minutes, auto_escalate_if_pending; immutable_message_archive. |
| `competitive_defense.sql` | consent_ledger (append-only), compliance_breach_signals (jurisdiction_misalignment, unauthorized_authority). |
| `performance_intelligence_internal.sql` | strategy_state_success_rate, objection_resolution_rate, escalation_success_rate. Internal tuning only; no dashboards. |

## New table summary

| Table | Key columns | Rules |
|-------|-------------|--------|
| lead_memory | workspace_id, lead_id, disclosed_price_range, objections_history_json, commitments_made_json, disclosures_acknowledged_json, consent_records_json, last_channel_used, last_contact_attempt_at, risk_flags_json, emotional_profile_json, lifecycle_notes_json | Upsert only; no freeform text |
| call_outcomes | workspace_id, work_unit_id, lead_id, duration_seconds, disposition, objections_tags_json, commitment_outcome, sentiment_score, consent_confirmed, compliance_confirmed | Append-only |
| channel_escalation_rules | workspace_id, domain_type, stage_state, escalation_sequence_json, timing_intervals_json | Deterministic rules only |
| immutable_message_archive | workspace_id, channel, intent_type, rendered_text, disclaimer_lines_json, policy_id, sent_at, thread_id, conversation_id, work_unit_id | Append-only; no deletes |
| consent_ledger | workspace_id, lead_id, consent_type, channel, scope, recorded_at | Append-only |
| compliance_breach_signals | workspace_id, signal_type, work_unit_id, thread_id, jurisdiction_misalignment, unauthorized_authority | Internal; no PII |
| strategy_state_success_rate | workspace_id, domain_type, state_from, state_to, transition_count, success_count | Internal only |
| objection_resolution_rate | workspace_id, domain_type, objection_tag, attempt_count, resolved_count | Internal only |
| escalation_success_rate | workspace_id, channel_from, channel_to, attempt_count, success_count | Internal only |

## Execution flow (high level)

1. **Inbound/outbound event** → Normalize.
2. **Resolve** domain pack, channel policy, jurisdiction, compliance pack.
3. **Classify** (AI structured JSON only) → intent, risk_flags, emotional_signals.
4. **Update** lead_memory (if lead_id), thread_emotional_signals, conversation_strategy_state.
5. **Strategy engine** (domain pack) → next state, disclosures, objection branch.
6. **Message policy** + **compliance** → template, disclaimers, approval_mode.
7. **Compile** governed message (templates only).
8. **Decide** → send | emit_approval | emit_preview | blocked.
9. **Emit** action_intent (send_message | place_outbound_call | escalate_to_human | request_disclosure_confirmation).
10. **Executor** (outside repo) claims intents, performs send/call, returns call_outcome when applicable.
11. **Ingest** call_outcome → call_outcomes, lead_memory, emotional_signals.

All state transitions deterministic. All actions via action_intents. No freeform AI to customers.

## Enterprise feature matrix

| Feature | Solo | Growth | Team | Enterprise |
|--------|------|--------|------|------------|
| Domain packs max | 1 | 3 | 50 | Contract |
| Channels max | 2 | 5 | 10 | Contract |
| Approval preview/required | No | Yes | Yes | Yes |
| Dual approval | No | No | No | Yes |
| Full escalation engine | No | Yes | Yes | Yes |
| Audit export | No | Yes | Yes | Yes |
| Immutable archive | No | No | No | Yes |
| Multi-location | No | No | Yes | Yes |
| Role-based approvals | No | No | Yes | Yes |
| Compliance packs | No | No | Yes | Yes |
| Supervisor mode | No | No | Yes | Yes |
| SSO / SLA / API | No | No | No | Contract |

## Industry preset coverage

| Preset | Regulatory focus |
|--------|------------------|
| real_estate | Fair housing, offer disclaimers |
| insurance | Insurance disclosures, recording consent |
| solar | Incentive compliance |
| legal | Attorney-client disclaimer, recording consent |
| mortgage | Mortgage disclaimer, recording consent |
| debt_resolution | FDCPA, debt collection disclaimers |
| home_services | Quiet hours, consent |
| b2b_appointment | Recording consent |
| agency_services | Generic B2B |
| med_spas | Medical consent, HIPAA-safe |
| clinics | HIPAA notice, recording consent |
| financial_advisors | Financial disclaimer |
| high_ticket_coaching | Results disclaimer |

Presets are configurable via domain_packs.config_json; not hardcoded in app logic.

## Launch positioning summary

- **Category:** Commercial execution infrastructure (not automation, not chatbot).
- **Promise:** Governed communication across every industry without compliance risk.
- **Differentiation:** Template-only output, deterministic strategy, action_intents execution, append-only state, full lifecycle and industry presets.
- **Solo:** Connect channel → choose industry → live in 60 seconds. Autopilot strict mode, 2 channels, 1 pack.
- **Enterprise:** Contract-driven; dual approval, jurisdiction lock, immutable archive, SLA.
