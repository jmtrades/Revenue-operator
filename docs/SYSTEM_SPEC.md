# Revenue Operator — System Specification

**Commercial Execution Infrastructure.** Single source of truth for architecture, work units, governance, and guarantees.

**Canonical positioning:** `docs/CATEGORY_AND_POSITIONING.md`

---

## I. Category Positioning (Non-Negotiable)

Every revenue conversation should be governed. This system replaces improvisation with execution.

**Never use:** chatbot, automation, campaign, blast, workflow, funnel, sequence, marketing tool.

**Always use:** governed execution, operational continuity, compliance enforcement, commitment confirmation, jurisdiction lock, structured strategy, recorded confirmation, execution infrastructure.

**Homepage:**
- **Headline:** Every revenue conversation should be governed.
- **Subheadline:** Revenue Operator runs inbound, outbound, voice, confirmations, and compliance without improvisation.

---

## II. Core Architecture

Everything routes through:

```
Inbound Event
→ Domain Pack
→ Channel Policy
→ AI Structured Classifier
→ Emotional Signal Merge
→ Strategy Engine
→ Governance Layer
→ Compliance Pack
→ Message Compiler
→ Approval / Preview / Send Decision
→ Action Intent Emission
```

- No direct external calls from core system. Execution via action_intents only.
- Append-only. Deterministic. Replayable.

---

## III. Work Unit System (Universal)

**Types:** lead_acquisition, appointment, payment_obligation, contract_generation, disclosure_confirmation, outbound_campaign_execution, compliance_review, verbal_consent_record, followup_commitment, escalation_event, document_request, cross_party_confirmation.

Each type has: allowed states, completion rules, required confirmations, escalation triggers, responsible role. No AI-driven state transitions.

---

## IV. Domain Pack Engine

Each industry pack includes: Strategy Graph (≥13 states), Objection Tree, Regulatory Matrix, Disclosure Requirements, Forbidden Claims, Quiet Hours, Consent Rules, Escalation Rules.

**Presets required for:** Real Estate, Insurance, Solar, Legal Intake, High Ticket Sales, Financial Services. Custom packs per workspace allowed.

---

## V. Adaptive Conversation

AI output must be **JSON only:**

```json
{
  "intent",
  "emotional_signals",
  "risk_flags",
  "confidence",
  "suggested_state_transition"
}
```

No generated message text. Strategy engine chooses next state deterministically.

---

## VI. Voice Execution Layer

Support: outbound calling intents, script blocks per state, disclosure blocks, objection branches, consent capture, recording acknowledgment, compliance enforcement.

No voice API inside repo. Emit **place_outbound_call** intent with:

```json
{
  "phone",
  "script_blocks",
  "disclaimer_lines",
  "compliance_requirements",
  "intent_type"
}
```

---

## VII. Governance Layer

**approval_mode:** autopilot, preview_required, approval_required, locked_script, jurisdiction_locked (plus dual_approval_required, compliance_only_approval for enterprise).

**Compliance pack:** required_disclaimers, forbidden_phrases, required_phrases, quiet_hours, opt_out handling, recording consent.

**Approvals:** Only owner/admin/compliance can approve. Operators view only.

---

## VIII. Message Template System

All outbound from **message_templates** (template_id, intent_type, channel, body, max_chars). No AI freeform output.

**Preview API** must return: text, disclaimer_lines, approval_mode, policy_id, template_id.

---

## IX. Solo Experience

"I now operate like a disciplined company." Dashboard language: "Governed strategy applied." "Operational execution active." No SaaS language. No "campaign builder" or "automation designer."

---

## X. Enterprise Layer

Jurisdiction locking, dual approvals, compliance officer role, enterprise contract reference, scoped feature overrides, audit export, multi-location governance, script locking.

- **Immutability:** Message approvals use an append-only decision chain and optional compliance lock. Dual approval (when enabled) requires two distinct roles before send. Compliance rejection can lock an approval for a fixed cooldown window.
- **Fail-fast activation:** Enterprise activation fails if domain pack is incomplete, jurisdiction is UNSPECIFIED, or compliance pack rules are missing. Execution will not send until these are resolved.
- **Audit:** Governance export is bounded (ORDER BY + LIMIT) and contains only approved fields; no metrics or aggregates.

**Pricing:** Enterprise infrastructure is scoped per organization. No fixed price.

---

## XI. Pricing Model

Do not say channels or packs.

- **Solo** — $297/month. Structured revenue execution.
- **Growth** — $897/month. Governed outbound + compliance preview.
- **Team** — $2,400/month. Multi-role approvals + cross-location governance.
- **Enterprise** — Contract. Jurisdiction-locked execution infrastructure. Scoped per organization.

**Annual:** Annual commitment preferred for operational continuity. Two months at no charge. Execution continues without renewal interruption. No percentage language.

**Stripe:** SOLO_MONTH/YEAR, GROWTH_MONTH/YEAR, TEAM_MONTH/YEAR. Webhook maps price_id → tier + interval.

---

## XII. Connector Layer

Ingest from: SMS, Email, WhatsApp, Instagram DM, Voice logs, CSV import, Web form, CRM sync. All writes to **connector_events** append-only.

---

## XIII. Execution Intents

Emit only: send_message, place_outbound_call, schedule_followup, escalate_to_human, collect_payment, generate_contract, request_disclosure_confirmation, record_verbal_consent. Idempotent. Deduped. Append-only.

---

## XIIIa. Scenario Layer (Universal Coverage)

**Use intent (internal: use_modes):** triage, list_execution, recovery, front_desk, reactivation, compliance_shield, concierge. UI language: "Purpose" and "Operating posture" only; never "mode", "profile", "workflow", "automation", "dialer", "campaign".

**Scenario profiles:** Per-workspace; profile_id, mode_key, primary_objective, secondary_objectives_json, default_review_level, default_jurisdiction, rules_json (max_attempts_per_lead, max_objection_chain, stop_conditions, escalation_thresholds). Unique (workspace_id, profile_id). Upsert only; no deletes.

**Queue types (deterministic):** inbound_queue, outbound_queue, commitment_queue, collections_queue, routing_queue, review_queue, exception_queue. Resolved from isInbound, primary_objective, risk_score, use_mode_key. Stored on ExecutionPlan and intent payload (internal only).

**Stop conditions:** When risk_threshold, jurisdiction_unspecified, consent_missing, disclosure_incomplete, objection_chain_exceeded, attempt_limit_exceeded, rate_headroom_exhausted, execution_stale, or compliance_lock is set, execution must not send; downgrade to preview, escalate_to_human, or pause only. Ledger event stop_condition_triggered with stop_reason.

**Controlled improvisation:** Path variant selection (direct, gentle, firm, compliance_forward, clarify, handoff) is deterministic from commitment state, emotional category, objective, attempt number. Used only to pick template variant or voice script sub-branch; no text generation.

---

## XIIIb. Universal Outcome Layer

**Purpose:** Standardize how every interaction concludes (voice, message, list execution, triage, recovery, compliance, escalation) so the system always knows what happened and what must happen next. No manual interpretation; no improvisation.

**universal_outcomes table (append-only):** id, workspace_id, thread_id, work_unit_id, action_intent_id, channel (voice | message | system), outcome_type, outcome_confidence (low | medium | high), next_required_action (nullable), structured_payload_json, recorded_at. Indexes: (workspace_id, thread_id, recorded_at desc), (workspace_id, outcome_type), (workspace_id, next_required_action). No DELETE. INSERT only.

**Outcome taxonomy (strict allowlist):** OutcomeType: connected, no_answer, wrong_number, call_back_requested, information_provided, information_missing, payment_promised, payment_made, payment_failed, opted_out, complaint, refund_request, dispute, legal_risk, hostile, technical_issue, routed, escalation_required, appointment_confirmed, appointment_cancelled, followup_scheduled, no_show, unknown. NextRequiredAction: schedule_followup, request_disclosure_confirmation, escalate_to_human, pause_execution, record_commitment, none. No dynamic strings; no GPT.

**resolveUniversalOutcome:** Deterministic resolver from voice outcome flags, message metadata, commitment state, triage_reason, riskScore, emotionalCategory, consent_recorded, disclosures_read, payment flags, opt_out, objection chain count, brokenCommitmentsCount. Returns { outcome_type, outcome_confidence, next_required_action }. Confidence: direct structured flag = high, keyword match = medium, fallback = low.

**Wiring:** Voice outcome route and action-intents/complete call resolveUniversalOutcome, insert into universal_outcomes, append ledger universal_outcome_recorded. When next_required_action ≠ none and not record_commitment, emit corresponding action intent. Commitment integration: payment_promised or call_back_requested → recordCommitment; payment_made → markCommitmentFulfilled (when commitment id known). Never bypass compliance; only emit intents.

**Stop conditions (extended):** outcome_requires_pause (opted_out, legal_risk), excessive_hostility_loop, repeated_unknown_outcome. When triggered: set stopReason; decision = emit_approval or emit_preview; ledger stop_condition_triggered. Never allow send when stopReason present.

**Batch wave:** LeadSegmentItem includes lastOutcomeType, hostilityScore. Prioritization: probabilityScore DESC, volatilityScore ASC, brokenCommitmentsCount ASC, lastOutcomeType ≠ hostile. Pause wave if >30% of selected wave has hostile, legal_risk, or complaint. Ledger batch_wave_selected, batch_wave_paused.

**Escalation summary:** Includes last_outcome_type, outcome_confidence, last_commitment_status, broken_commitments_count, cadence_recommendation, risk_score, what_not_to_say. Deterministic construction only.

---

## XIIIc. Strategic Intelligence Expansion

**Purpose:** Memory-aware strategy weighting, time-based commitment decay, and deterministic 3-step horizon planning. No learning models; bounded window scoring only. Never silent send when variant score or goodwill below threshold.

**Strategy effectiveness registry (append-only):** id, workspace_id, thread_id, variant_key, objective, outcome_type, commitment_delta, goodwill_delta, escalation_triggered, recorded_at. Indexes: (workspace_id, recorded_at desc), (workspace_id, variant_key), (workspace_id, outcome_type). No DELETE. recordStrategyEffectiveness on voice outcome and message completion. Window: last 200 rows (ORDER BY recorded_at DESC LIMIT 200). Score = avgCommitmentDelta + avgGoodwillDelta − (escalationRate × 20). evaluateVariantEffectiveness(workspaceId, variantKey); getWorkspaceStrategyMatrix(workspaceId). path-variant: suppress variant when score < −10; deterministic hash selection among allowed. Ledger: strategy_effectiveness_recorded.

**Commitment decay:** applyCommitmentDecay(lastMeaningfulOutcomeAt, openCommitmentsCount, daysSinceLastResponse, goodwillScore). Rules: 3d silence → goodwill −5; 7d → −10; 14d → −20; open commitments unresolved >7d → friction +10. Clamp 0–100. No timers; called in build when threadId exists. If adjusted goodwill < 10 → force emit_approval. Ledger: commitment_decay_applied.

**Strategic horizon:** buildStrategicHorizon(stage, primaryObjective, openQuestionsCount, brokenCommitmentsCount, goodwillScore, riskScore, driftScore). Returns array max length 3. Deterministic mapping (e.g. information_exchange → clarify, reinforce, commit; objection_handling → address_objection, verify_resolution, commit; commitment_negotiation → reinforce_commitment, confirm_time, close). Goodwill low → insert trust_rebuild at step 1; risk high → step1 = compliance_confirm. ExecutionPlan.strategic_horizon populated in build.

**Snapshot extension (snapshot_json only):** strategy_effectiveness_snapshot, commitment_decay_applied, strategic_horizon, variant_score_snapshot. Optional. Append-only unchanged.

**Decision guard extension:** Block send when variant score < −20, goodwill < 5. stopReason: strategic_guard_block. Ledger strategic_guard_block. Never silent send.

**Scenario coverage (internal):** Scenario coverage is enforced by replay harness and fixtures; unknown never sends.

---

## XIV. Investor Positioning

We are building the infrastructure layer for revenue execution. Not a tool. A standard. Revenue conversations should not be improvised; they should be governed.

---

## XV. GTM Strategy

Vertical order: Real Estate, Insurance, Solar, Legal Intake, High-ticket outbound. Assets: Homepage, vertical landing pages, enterprise deck, investor deck, whitepaper "Revenue Conversations Should Be Governed", 90-day GTM plan.

---

## XVI. System Guarantees

- No freeform AI
- Deterministic state transitions
- Compliance enforcement pre-send
- Append-only records
- Replayable execution
- Approval gates honored
- No internal IDs exposed
- ≤90 char doctrine lines where required
- Final lock tests enforce single pipeline, enterprise immutability, jurisdiction safety, dead-letter reliability, rate ceilings, and voice dominance.

**Final lock checklist:** See `docs/FINAL_LOCK_CHECKLIST.md` for guarantee → test → code path mapping. Prebuild runs these invariants; build fails if any is broken.

Build must pass. All tests must pass. No forbidden words.
