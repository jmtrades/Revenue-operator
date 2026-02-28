# Final Lock Checklist

Commercial execution infrastructure — guarantee → enforcing tests → code path. Build fails if any invariant is broken.

---

## A) Zero-tech activation (solo-first, universal)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| `/api/activate/execution` accepts industry, jurisdiction, review level only | `enterprise_immutability.test.ts` (activation fail-fast) | `src/app/api/activate/execution/route.ts` |
| Universal autostart: no domain pack → general + UNSPECIFIED + preview_required | `auto_activation_preview.test.ts` | `src/lib/execution-plan/run.ts` |
| UNSPECIFIED jurisdiction never sends; forces preview/approval | `unspecified_jurisdiction_forces_preview.test.ts`, `commercial_execution_final_invariants.test.ts` | `src/lib/execution-plan/build.ts` (jurisdictionUnspecified branch) |
| Enterprise/immutability: activation fail-fast when config incomplete | `enterprise_immutability.test.ts` | `src/app/api/activate/execution/route.ts` (enterprise_configuration_incomplete) |
| Domain pack validation before autopilot/voice send | `validateDomainPackForActivation` used in activation | `src/lib/domain-packs/validate-activation.ts` |

---

## B) Solo viral wedge (record-forwarding)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Public record flows shareable; no internal IDs in tokens | API contract tests, final lock | `src/app/public/work/[external_ref]`, shared-transaction-assurance |
| Governance export bounded and ordered | `enterprise_immutability.test.ts` (audit ORDER BY + LIMIT) | `src/app/api/enterprise/audit/export/route.ts` |

---

## C) Domain coverage (industry presets)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Strategy graph ≥ 15 states per preset | `domain_pack_depth_enforcement.test.ts`, `domain_pack_completeness.test.ts` | `src/lib/domain-packs/validate-activation.ts`, schema |
| Objection tree + regulatory matrix present | `domain_pack_objection_integrity.test.ts`, `domain_pack_regulatory_required_fields.test.ts` | Domain pack schema, presets |
| Compliance pack required fields | `compliance_pack_required_fields.test.ts` | `src/lib/governance/compliance-pack.ts` |

---

## D) Voice dominance (governed, no improvisation)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Voice plan deterministic; script blocks only | `voice_plan_integrity.test.ts`, `voice_no_freeform_enforcement.test.ts` | `src/lib/voice/plan/build.ts` |
| Objection chain limit; overflow → escalate_to_human | `commercial_execution_final_lock.test.ts` (voice) | `src/lib/voice/plan/build.ts` (OBJECTION_CHAIN_LIMIT), `src/lib/execution-plan/emit.ts` |
| Voice outcome: consent/disclosures block completion | `voice_outcome_compliance_enforcement.test.ts`, `voice_compliance_block_required.test.ts` | `src/app/api/connectors/voice/outcome/route.ts` |
| No Math.random in strategy/execution/voice | `determinism_lock.test.ts` | Strategy engine, execution-plan, compiler, voice plan |

---

## E) Never-mess-up reliability rings

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Rate ceiling: send_message + place_outbound_call capped | `rate_ceiling_enforcement.test.ts`, `commercial_execution_final_lock.test.ts` | `src/lib/execution-plan/rate-limits.ts`, `src/lib/execution-plan/emit.ts` |
| Dead-letter: invalid normalized_inbound or execution failure appended | `commercial_execution_final_invariants.test.ts`, final lock | `src/app/api/connectors/events/ingest/route.ts`, `connector_events_dead_letter` |
| Watchdog + self-healing + approval-expiry in core cron | `self_healing_integrity.test.ts`, cron core route | `src/app/api/cron/core/route.ts` |
| Single pipeline: no delivery calls; createActionIntent only in allowed files | `single_pipeline_enforcement.test.ts` | Allowed list in test; emit, approvals, voice outcome, action-intents lib |
| No freeform outbound; template/compiler only | `no_freeform_ai_enforcement.test.ts`, `execution_pipeline_no_freeform.test.ts` | `src/lib/execution-plan/build.ts`, compiler |

---

## F) Pricing + Stripe (premium, non-SaaS)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| No forbidden SaaS language on pricing/homepage | `forbidden_language_enforcement.test.ts`, `ui-doctrine-forbidden-language.test.ts` | `src/app/pricing/page.tsx`, `src/app/page.tsx` |
| Tier + interval mapping; webhook writes billing_tier/interval | Billing tests | `src/lib/billing/*`, `src/app/api/billing/webhook/route.ts` |

---

## G) Enterprise immutability + final lock

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Approval decisions + locks append-only; dual approval chain | `enterprise_immutability.test.ts` | `message_approval_decisions`, `message_approval_locks`; `src/app/api/enterprise/approvals/approve/route.ts` |
| Compliance lock returns { ok: false, reason: "compliance_lock" } | `enterprise_immutability.test.ts` | Approve route checks locks |
| jurisdiction_locked never returns send | `enterprise_jurisdiction_lock.test.ts`, final lock | Compiler + message policy |
| Master lock suite runs in prebuild | `commercial_execution_final_lock.test.ts`, `enterprise_immutability.test.ts` | `scripts/verify-guarantees.ts` |

---

## H) Launch gate

| Check | Command | Expected |
|-------|---------|----------|
| All tests | `npm test` | All test files pass. |
| Guarantee invariants | `npm run prebuild` | `Guarantee verification passed.` Exit 0. |
| Production build | `npm run build` | Next.js build success. |
| Production readiness | `BASE_URL=https://... npm run prod:gate` | verify-prod-config + self-check pass; exit 0. |

---

## I) Distribution + stability lock

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Hosted executor bounded (ORDER BY + LIMIT); no DELETE; no provider calls | `hosted_executor_bounded.test.ts` | `src/app/api/cron/hosted-executor/route.ts` |
| Data retention append-only (INSERT INTO archive; no DELETE) | `data_retention_append_only.test.ts` | `src/app/api/cron/data-retention/route.ts` |
| Founder export allowlisted; no secrets/Stripe IDs/tokens/stack | `founder_export_allowlist.test.ts` | `src/app/api/internal/founder/export/route.ts` |
| Cron heartbeat (last_cron_cycle_at in founder export) | Founder export route | `system_cron_heartbeats`, `last_cron_cycle_at` |
| Invite system append-only; no CRM/automation/campaign language | `enterprise_invite_append_only.test.ts` | `src/app/api/enterprise/invite/route.ts` |
| Dashboard start canonical; /dashboard redirects to /dashboard/start | `commercial_execution_final_lock.test.ts` | `src/app/dashboard/layout.tsx`, `src/app/dashboard/start/page.tsx` |

---

## J) Launch lock (PRODUCTION LOCKED)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Public record never exposes internal IDs | `public_record_no_internal_ids.test.ts` | `src/app/api/public/work/[external_ref]/route.ts`, page |
| Hosted executor never imports provider libs | `hosted_executor_no_provider_imports.test.ts` | `src/app/api/cron/hosted-executor/route.ts` |
| Founder export strict allowlist + anomaly/external_execution/rate_ceiling | `founder_export_allowlist.test.ts` | `src/app/api/internal/founder/export/route.ts` |
| Hosted executor concurrency guard (min interval) | hosted-executor route | `system_cron_heartbeats`, 2 min |
| Critical routes bounded | `scripts/verify-bounded-queries.ts` | hosted-executor, data-retention, founder export |

**Status: PRODUCTION LOCKED.** Do not add new architectural layers or features. Harden and simplify only.

---

## K) Distribution lock (PRODUCTION LOCKED — DISTRIBUTION MODE)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Start surface single primary CTA only; labels: Open record \| Record activation \| Confirm governance \| Resolve authorization \| Share record | `start_surface_single_primary_cta.test.ts` | `src/app/dashboard/start/page.tsx`, `src/app/api/operational/next-action/route.ts` |
| Record canonical URL only; no tracking params, no query strings, no internal IDs | `public_record_no_query_params.test.ts` | `src/app/public/work/[external_ref]/page.tsx` |
| No metrics surfaces on start | `start_surface_single_primary_cta.test.ts` | `/dashboard/start` |
| Invite append-only; Share record when invite pending | next-action route | `workspace_invites`, next-action `share_record` branch |
| Hosted executor bounded; execution_cycle_completed ledger on success | `hosted_executor_bounded.test.ts` | `src/app/api/cron/hosted-executor/route.ts` |
| No new DELETEs in operational spine | existing invariants | Data retention archive; append-only |
| Activation success: "Activation recorded." + redirect under 500ms | `activation_redirect_under_500ms.test.ts` | `src/app/dashboard/start/page.tsx` (checkout=success) |
| Performance: critical routes bounded; no N+1 | `performance_regression_smoke.test.ts` | next-action, hosted-executor, founder export, data-retention |

**Status: PRODUCTION LOCKED — DISTRIBUTION MODE.** Distribution > engineering. No new features; simplify perception only.

---

## L) Record authority (psychological dominance)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Public record: institutional header + governed copy; no automation/AI/software/system | `public_record_authority_copy.test.ts` | `src/app/public/work/[external_ref]/page.tsx` |
| Scarcity signal: Records chronological and immutable; no blockchain/append-only/audit log | `public_record_authority_copy.test.ts` | Public record page |
| Copy action label "Copy record" (canonical URL only) | `public_record_copy_label.test.ts` | Public record page |
| Viral trigger line in footer | `public_record_authority_copy.test.ts` | Public record page |
| Start: identity line "You are operating under governance." | `start_identity_line_present.test.ts` | `src/app/dashboard/start/page.tsx` |
| Activation: "Execution has been placed under record." 3s then fade (opacity only) | `activation_confirmation_identity.test.ts`, `activation_redirect_under_500ms.test.ts` | Start page |
| Start copy: no sentence > 14 words; no instructional paragraph | `start_surface_copy_length.test.ts` | Start page, ExecutionContinuityLine |

**Status: Record authority amplification.** Institutional posture only. No analytics, gamification, or engagement nudges.

---

## M) Institutional standard — launch mode

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| Public record: GOVERNED COMMERCIAL RECORD, Verified under declared jurisdiction, forwarded without modification, cannot be altered, social reinforcement footer | `public_record_authority_copy.test.ts` | `src/app/public/work/[external_ref]/page.tsx` |
| Start: "You are operating at institutional standard." + "Commercial conversations are now governed." | `start_identity_line_present.test.ts` | `src/app/dashboard/start/page.tsx` |
| Activation: "Execution is now under institutional governance." 3s then fade | `activation_confirmation_identity.test.ts`, `activation_redirect_under_500ms.test.ts` | Start page |
| Copy record label only; Share record when invite pending (no extra UI) | `public_record_copy_label.test.ts`, next-action route | Public page, next-action |
| Language purity: analytics, sequence, dialer, metrics + existing forbidden list | `ui_forbidden_technical_terms.test.ts` | All app/component TSX |
| Hosted executor: execution_cycle_completed, Execution not observed when stale | Section J, K | hosted-executor, next-action |
| Founder export: boolean only, bounded, no aggregates | `founder_export_allowlist.test.ts` | founder/export |
| Tone: institutional, short sentences, no exclamation marks, no emojis, no marketing | Copy and layout only | App-wide |

**Status: PRODUCTION LOCKED — INSTITUTIONAL STANDARD.** No product changes for 30 days. Distribution creates inevitability.

---

## N) Surgical perfection — cohesion lock

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| createActionIntent only in allowed call sites | `single_pipeline_enforcement.test.ts` | emit, approvals, voice outcome, check-in-email, watchdog, self-healing, hosted-executor, action-intents |
| No delivery provider calls in API routes | `single_pipeline_enforcement.test.ts` | All route.ts |
| Next-action returns only allowed primary labels; one CTA per branch | `surgical_perfection_invariants.test.ts`, `start_surface_single_primary_cta.test.ts` | next-action route |
| Hosted executor: no TRUNCATE; 2-min cycle; execution_cycle_completed; max 10 workspaces, 5 intents/workspace | `surgical_perfection_invariants.test.ts`, `hosted_executor_bounded.test.ts` | hosted-executor |
| No stack traces in API responses | `api_no_stack_traces.test.ts` | All API routes |
| Data retention: no DELETE (archive only) | `data_retention_append_only.test.ts` | data-retention cron |
| Founder export: strict allowlist, no secrets/Stripe/tokens | `founder_export_allowlist.test.ts` | founder/export |
| Language purity: software + full forbidden list in user-facing UI | `ui_forbidden_technical_terms.test.ts` | App, components |
| scripts/verify-guarantees.ts runs all invariant tests | Prebuild | verify-guarantees.ts |

**Status: Surgical perfection pass.** No alternate emit paths; no unbounded queries; no silent no-op states; no dead code in canonical paths.

---

## O) Universal scenario coverage (PRODUCTION LOCKED SAFE)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| use_modes + scenario_profiles + workspace_scenario_state; no DELETE | `scenario_profiles_contract.test.ts` | `supabase/migrations/scenario_profiles_and_use_modes.sql` |
| Queue type only from allowed set; deterministic | `queue_type_mapping_invariants.test.ts` | `src/lib/scenarios/queue-type.ts` |
| List execution without profile forces preview; triage route/qualify/escalate | `scenario_objective_safety.test.ts` | `src/lib/intelligence/objective-engine.ts`, `build.ts` |
| Triage reason deterministic; unknown → route | `triage_reason_determinism.test.ts` | `src/lib/scenarios/triage.ts` |
| Path variant deterministic; no random | `path_variant_determinism.test.ts`, `template_variant_fallback.test.ts` | `src/lib/intelligence/path-variant.ts` |
| Import: one Purpose control; no forbidden words | `import_purpose_single_control.test.ts`, `csv_list_purpose_wiring.test.ts` | `src/app/dashboard/import/page.tsx`, ingest domain_hints |
| Stop conditions prevent send when risk/consent/jurisdiction/objection/attempt | `stop_conditions_never_send.test.ts` | `src/lib/intelligence/stop-conditions.ts`, build |
| Start clarity line ≤12 words; no forbidden terms | `start_clarity_line_contract.test.ts` | `src/app/dashboard/start/page.tsx` |
| Ledger scenario_selected, stop_condition_triggered, list_purpose_recorded | `scenario_ledger_emission_presence.test.ts` | `src/lib/ops/ledger.ts`, build |

---

## Oa) Commitment registry, cadence, escalation memory (PRODUCTION LOCKED SAFE)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| commitment_registry append-only; no DELETE/TRUNCATE; bounded ORDER BY + LIMIT | `intelligence_commitment_registry.test.ts`, `no_delete_in_commitment_registry.test.ts`, `bounded_queries_commitment.test.ts` | `supabase/migrations/commitment_registry.sql`, `src/lib/intelligence/commitment-registry.ts` |
| Cadence governor deterministic; allow \| cool_off \| freeze_24h \| escalate; no random | `cadence_governor_invariants.test.ts` | `src/lib/intelligence/cadence-governor.ts`, build.ts |
| Scenario auto-override: risk/hostile/legal → compliance_shield (plan only; ledger scenario_auto_override) | `scenario_auto_override_invariants.test.ts` | `src/lib/execution-plan/build.ts` |
| Stop reasons: cadence_restriction, hostile_cooldown, broken_commitment_threshold; never send when set | `stop_conditions_never_send.test.ts` | `src/lib/intelligence/stop-conditions.ts` |
| Escalation summary: open_commitments, broken_commitments, last_3_actions, regulatory_constraints_snapshot, what_not_to_say | `escalation_summary_expanded.test.ts` | `src/lib/intelligence/escalation-summary.ts`, emit.ts |
| Intelligence layer: no Math.random, no crypto.randomUUID | `no_random_in_intelligence_layer.test.ts` | `src/lib/intelligence/*.ts` |
| Ledger: commitment_recorded, commitment_fulfilled, commitment_broken, cadence_governor_triggered, batch_wave_selected, batch_wave_paused | Ledger type + build/hosted-executor | `src/lib/ops/ledger.ts` |
| Batch wave: commitment fatigue, volatility balance, cadence headroom; pause if >30% volatile | `intelligence_layer_invariants.test.ts` (selectBatchWave) | `src/lib/intelligence/batch-controller.ts`, hosted-executor |
| Triage: refund_request, legal_threat, data_request, opt_out, dispute, technical_issue; unknown → route | `triage_reason_determinism.test.ts` | `src/lib/scenarios/triage.ts` |

---

## Ob) Universal outcome taxonomy (PRODUCTION LOCKED SAFE)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| universal_outcomes append-only; no DELETE/TRUNCATE | `universal_outcome_registry_append_only.test.ts`, `no_delete_in_universal_outcome_registry.test.ts` | `supabase/migrations/universal_outcome_registry.sql`, `src/lib/intelligence/outcome-taxonomy.ts` |
| resolveUniversalOutcome deterministic; only allowed OutcomeType and NextRequiredAction | `universal_outcome_determinism.test.ts`, `universal_outcome_requires_next_action.test.ts` | `src/lib/intelligence/outcome-taxonomy.ts` |
| No Math.random / crypto.randomUUID in outcome taxonomy | `universal_outcome_no_random.test.ts` | `src/lib/intelligence/outcome-taxonomy.ts` |
| Voice outcome and message completion insert universal_outcomes, append ledger, emit next_required_action when not none | Wiring in routes | `src/app/api/connectors/voice/outcome/route.ts`, `src/app/api/operational/action-intents/complete/route.ts` |
| Stop conditions: outcome_requires_pause, excessive_hostility_loop, repeated_unknown_outcome | `stop_conditions_never_send.test.ts` | `src/lib/intelligence/stop-conditions.ts` |
| Batch wave: lastOutcomeType, hostilityScore; pause if >30% hostile/legal_risk/complaint | `batch_wave_outcome_safety.test.ts` | `src/lib/intelligence/batch-controller.ts` |
| Escalation summary includes last_outcome_type, outcome_confidence, last_commitment_status | `escalation_payload_contains_outcome.test.ts` | `src/lib/intelligence/escalation-summary.ts` |
| Ledger universal_outcome_recorded | Ledger type + insertUniversalOutcome | `src/lib/ops/ledger.ts` |

---

## Oc) Resolution Kernel (PRODUCTION LOCKED — INSTITUTIONAL STANDARD)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| unresolved_questions append-only; no DELETE/TRUNCATE; schema and indexes | `unresolved_questions_append_only.test.ts` | `supabase/migrations/unresolved_questions_registry.sql`, `src/lib/intelligence/unresolved-questions.ts` |
| Question extractors deterministic; max 3 per event; question_type from allowlist | `question_extractor_determinism.test.ts` | `src/lib/intelligence/unresolved-questions.ts`, `question-taxonomy.ts` |
| Objection lifecycle deterministic; stages from allowlist; complaint→raised/reopened, information_provided→addressed | `objection_lifecycle_determinism.test.ts` | `src/lib/intelligence/objection-lifecycle.ts` |
| Attempt envelope: no same variant 3x; open questions→clarify; legal_risk→compliance_forward; contradiction→handoff | `attempt_envelope_no_repeat.test.ts` | `src/lib/intelligence/attempt-envelope.ts` |
| Outcome closure: opted_out→pause only; legal_risk→escalate only; payment_made/terminated→none | `outcome_closure_enforcement.test.ts` | `src/lib/intelligence/outcome-closure.ts` |
| All reads bounded (ORDER BY + LIMIT) | `bounded_reads_unresolved_questions.test.ts` | `src/lib/intelligence/unresolved-questions.ts` |
| No Math.random / crypto.randomUUID in resolution kernel | `no_random_in_resolution_kernel.test.ts` | `src/lib/intelligence/question-taxonomy.ts`, unresolved-questions, objection-lifecycle, attempt-envelope, outcome-closure |
| Voice outcome: extract/record/resolve questions, objection stage, attempt envelope, enforceOutcomeClosure before emit | Wiring | `src/app/api/connectors/voice/outcome/route.ts` |
| Action-intents/complete (send_message): extract questions, enforceOutcomeClosure before createActionIntent | Wiring | `src/app/api/operational/action-intents/complete/route.ts` |
| Ledger: unresolved_question_recorded, unresolved_question_resolved, outcome_closure_enforced | Ledger type + routes | `src/lib/ops/ledger.ts` |

---

## Od) Strategic pattern memory + workspace pattern guard + deterministic micro-variation (PRODUCTION LOCKED)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| strategic_pattern_registry UPSERT only; no DELETE/TRUNCATE | `strategic_pattern_invariants.test.ts` | `supabase/migrations/strategic_pattern_registry.sql`, `src/lib/intelligence/strategic-pattern.ts` |
| evaluateStrategicGuard deterministic; persuasion/clarification/compliance/hard_close/escalation rules | `strategic_pattern_invariants.test.ts` | `src/lib/intelligence/strategic-pattern.ts` |
| No Math.random() / randomUUID() in strategic layer | `no_random_in_strategic_layer.test.ts` | strategic-pattern, workspace-pattern-guard, deterministic-variant |
| Build: load pattern, evaluate guard; forceEscalation/forcePause/blockVariant override; run updates pattern after emit | Wiring | `src/lib/execution-plan/build.ts`, `src/lib/execution-plan/run.ts` |
| Workspace guard: bounded query ORDER BY + LIMIT 50; no COUNT(*); hostility spike → requiresPause | `workspace_pattern_guard_invariants.test.ts` | `src/lib/intelligence/workspace-pattern-guard.ts` |
| Hosted executor: guard before wave; requiresPause → pause intent + workspace_pattern_pause; requiresEscalation → ledger | Wiring | `src/app/api/cron/hosted-executor/route.ts` |
| selectDeterministicVariant: same thread+attempt → same variant; uses createHash | `deterministic_micro_variation.test.ts` | `src/lib/intelligence/deterministic-variant.ts` |
| Compiler/templates: optional threadId+attemptNumber; multiple templates → selectDeterministicVariant | Wiring | `src/lib/speech-governance/templates.ts`, `compiler.ts` |
| Escalation severity: strategic_guard_triggered ≥4, workspace_pattern_pause 5, hostility_spike+low_goodwill 5 | buildEscalationSummary | `src/lib/intelligence/escalation-summary.ts` |
| Ledger: strategic_pattern_updated, strategic_guard_triggered, workspace_pattern_pause, workspace_pattern_escalation | Ledger type + routes | `src/lib/ops/ledger.ts` |

---

## Oe) Strategic intelligence expansion (PRODUCTION LOCKED)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| strategy_effectiveness_registry append-only; no DELETE/TRUNCATE | `no_delete_in_strategy_registry.test.ts` | `supabase/migrations/strategy_effectiveness_registry.sql`, `src/lib/intelligence/strategy-effectiveness.ts` |
| Window 200; ORDER BY + LIMIT; no COUNT(*); score formula deterministic | `strategy_effectiveness_determinism.test.ts`, `bounded_queries_strategy_effectiveness.test.ts` | `src/lib/intelligence/strategy-effectiveness.ts` |
| recordStrategyEffectiveness on voice outcome and message completion | Wiring | voice outcome route, action-intents/complete |
| path-variant: suppress variant when score < −10; deterministic hash among allowed | path_variant_determinism | `src/lib/intelligence/path-variant.ts` |
| applyCommitmentDecay deterministic; 3d/7d/14d rules; clamp 0–100 | `commitment_decay_determinism.test.ts` | `src/lib/intelligence/commitment-decay.ts` |
| Build: decay applied when threadId; goodwill < 10 → emit_approval; ledger commitment_decay_applied | Wiring | `src/lib/execution-plan/build.ts` |
| buildStrategicHorizon deterministic; max 3 steps; stage-based mapping | `strategic_horizon_determinism.test.ts` | `src/lib/intelligence/strategic-horizon.ts` |
| ExecutionPlan.strategic_horizon; populated in build | Wiring | `src/lib/execution-plan/build.ts`, types |
| Decision guard: variant score < −20 or goodwill < 5 → strategic_guard_block; ledger | Wiring | `src/lib/execution-plan/build.ts` |
| No Math.random/randomUUID/provider imports in strategy expansion | `no_random_in_strategy_expansion.test.ts` | strategy-effectiveness, commitment-decay, strategic-horizon |
| Ledger: strategy_effectiveness_recorded, commitment_decay_applied, strategic_guard_block | Ledger type + routes | `src/lib/ops/ledger.ts` |

---

## Of) Scenario replay lock (PRODUCTION LOCKED)

| Guarantee | Enforcing test(s) | Code path |
|-----------|-------------------|-----------|
| scenario_incidents table append-only; no DELETE/TRUNCATE | Migration + invariant | `supabase/migrations/scenario_incidents_and_replays.sql` |
| run-scenario-replays bounded (fixtures or ORDER BY + LIMIT for incidents) | `scenario_replay_harness_invariants.test.ts` | `scripts/run-scenario-replays.ts` |
| Fixture coverage ≥30; never-send categories covered; allowlisted values only | `scenario_fixture_coverage.test.ts` | `__fixtures__/scenarios/*.json` |
| Unknown never sends: next_required_action not none when outcome unknown | `unknown_never_sends_final_lock.test.ts` | `src/lib/intelligence/outcome-taxonomy.ts` |
| Internal incident route auth-protected (SCENARIO_INGEST_KEY or FOUNDER_EXPORT_KEY) | `scenario_replay_harness_invariants.test.ts` | `src/app/api/internal/scenarios/incident/route.ts` |

---

## P) Production deployment — recall-touch.com

| Item | Enforcement |
|------|-------------|
| Migrations | `production_system_cron_heartbeats.sql`, `production_indexes.sql`; data_retention_archive_tables; no DELETE in spine |
| Env | `docs/VERCEL_ENV.md`; `scripts/verify-prod-config.ts` requires CRON_SECRET, PUBLIC_VIEW_SALT, FOUNDER_EXPORT_KEY, Stripe webhook when Stripe enabled |
| Security headers | next.config: X-Frame-Options DENY, X-Content-Type-Options nosniff, HSTS, CSP default-src 'self' |
| Cron | `/api/cron/core` runs hosted-executor, data-retention; schedule every 2 min; Authorization: Bearer CRON_SECRET |
| Founder export | 401 without key; allowlist only; no Stripe IDs/tokens |
| Prod gate | `BASE_URL=https://recall-touch.com npm run prod:gate` runs verify-prod-config + self-check; BASE_URL must be recall-touch.com or www |
| No TRUNCATE in cron | `surgical_perfection_invariants.test.ts` |

**Status: Production-ready for recall-touch.com.** Apply migrations; set Vercel env; deploy; run prod:gate.

---

**Canonical:** This checklist reflects the final lock. Do not remove or weaken any invariant. New features must not bypass the single pipeline or introduce freeform outbound, randomness, or direct delivery calls.

---

## System Cohesion & Stability Lock — Verified

| Item | Status |
|------|--------|
| createActionIntent only at allowed call sites (emit, approvals, voice outcome, complete, check-in-email, watchdog, self-healing, hosted-executor, action-intents) | Verified |
| No DELETE/TRUNCATE on operational_ledger, universal_outcomes, commitment_registry, conversation_state_snapshots, unresolved_questions, scenario_incidents, strategy_effectiveness_registry, strategic_pattern_registry, workspace_invites | Verified |
| Bounded reads: hosted-executor, data-retention, founder export, workspace-pattern-guard, commitment-registry, unresolved-questions, conversation-snapshot, strategy-effectiveness use ORDER BY + LIMIT | Verified |
| Determinism: team routing (closer selection) and absence-confidence (message selection) use SHA-256 deterministic selection; no Math.random in execution path for those crons | Verified |
| Absence-confidence cron: workspaces query bounded (ORDER BY id LIMIT 500); escalation check uses limit(1) instead of COUNT | Verified |
| Data retention: archive-only pattern; no DELETE on ledger | Verified |
| API responses: structured { ok, reason }; no stack traces or internal IDs in user-facing responses | Verified |

**Status: Final cohesion perfection pass applied.** Invariants preserved; determinism and boundedness enforced where applicable.
