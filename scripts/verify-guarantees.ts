#!/usr/bin/env npx tsx
/**
 * Pre-build guarantee verification. Exit 1 if any guarantee contract test fails.
 * Ensures the operator cannot be built in an unsafe state.
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

async function runVitest(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      "npx",
      [
        "vitest", "run",
        "__tests__/guarantee-contract.test.ts",
        "__tests__/guarantee-preservation.test.ts",
        "__tests__/forbidden_language_enforcement.test.ts",
        "__tests__/system_infrastructure_invariants.test.ts",
        "__tests__/no_freeform_ai_enforcement.test.ts",
        "__tests__/execution_intent_atomicity.test.ts",
        "__tests__/domain_pack_completeness.test.ts",
        "__tests__/enterprise_governance_contract.test.ts",
        "__tests__/voice_script_integrity.test.ts",
        "__tests__/compliance_pack_required_fields.test.ts",
        "__tests__/ui-doctrine-forbidden-language.test.ts",
        "__tests__/execution_pipeline_determinism.test.ts",
        "__tests__/execution_pipeline_replay_integrity.test.ts",
        "__tests__/execution_pipeline_no_freeform.test.ts",
        "__tests__/domain_pack_depth_enforcement.test.ts",
        "__tests__/domain_pack_objection_integrity.test.ts",
        "__tests__/domain_pack_regulatory_required_fields.test.ts",
        "__tests__/voice_script_chain_integrity.test.ts",
        "__tests__/voice_escalation_threshold.test.ts",
        "__tests__/voice_compliance_block_required.test.ts",
        "__tests__/enterprise_jurisdiction_lock.test.ts",
        "__tests__/jurisdiction-lock-enforcement.test.ts",
        "__tests__/onboarding-governance-contract.test.ts",
        "__tests__/enterprise_dual_approval_chain.test.ts",
        "__tests__/enterprise_multi_location_resolution.test.ts",
        "__tests__/connector_idempotency.test.ts",
        "__tests__/connector_execution_trigger.test.ts",
        "__tests__/execution_intent_claim_atomicity.test.ts",
        "__tests__/execution_intent_dedup_enforcement.test.ts",
        "__tests__/final_guarantees_enforcement.test.ts",
        "__tests__/voice_no_freeform_enforcement.test.ts",
        "__tests__/voice_state_machine_integrity.test.ts",
        "__tests__/voice_intent_atomicity.test.ts",
        "__tests__/voice_regulatory_block_enforcement.test.ts",
        "__tests__/voice_escalation_guarantee.test.ts",
        "__tests__/enterprise_voice_governance_contract.test.ts",
        "__tests__/connector_voice_idempotency.test.ts",
        "__tests__/voice_outcome_idempotency.test.ts",
        "__tests__/voice_outcome_no_freeform.test.ts",
        "__tests__/voice_outcome_state_integrity.test.ts",
        "__tests__/single_pipeline_enforcement.test.ts",
        "__tests__/approval_idempotency.test.ts",
        "__tests__/connector_normalized_shape.test.ts",
        "__tests__/execution_atomicity.test.ts",
        "__tests__/voice_outcome_compliance_enforcement.test.ts",
        "__tests__/determinism_lock.test.ts",
        "__tests__/execution_intent_integrity.test.ts",
        "__tests__/api_response_contract.test.ts",
        "__tests__/domain_pack_supremacy.test.ts",
        "__tests__/voice_plan_integrity.test.ts",
        "__tests__/connector_execution_safety.test.ts",
        "__tests__/infrastructure_integrity_final.test.ts",
        "__tests__/commercial_execution_final_invariants.test.ts",
        "__tests__/unspecified_jurisdiction_forces_preview.test.ts",
        "__tests__/tone_variation_determinism.test.ts",
        "__tests__/self_healing_integrity.test.ts",
        "__tests__/rate_ceiling_enforcement.test.ts",
        "__tests__/auto_activation_preview.test.ts",
        "__tests__/enterprise_immutability.test.ts",
        "__tests__/commercial_execution_final_lock.test.ts",
        "__tests__/public_record_views_referrer_invariant.test.ts",
        "__tests__/hosted_executor_bounded.test.ts",
        "__tests__/hosted_executor_rate_ceiling.test.ts",
        "__tests__/data_retention_append_only.test.ts",
        "__tests__/founder_export_allowlist.test.ts",
        "__tests__/enterprise_invite_append_only.test.ts",
        "__tests__/ui_forbidden_technical_terms.test.ts",
        "__tests__/api_no_stack_traces.test.ts",
        "__tests__/public_record_no_internal_ids.test.ts",
        "__tests__/hosted_executor_no_provider_imports.test.ts",
        "__tests__/start_surface_single_primary_cta.test.ts",
        "__tests__/public_record_no_query_params.test.ts",
        "__tests__/activation_redirect_under_500ms.test.ts",
        "__tests__/performance_regression_smoke.test.ts",
        "__tests__/public_record_authority_copy.test.ts",
        "__tests__/start_identity_line_present.test.ts",
        "__tests__/public_record_copy_label.test.ts",
        "__tests__/activation_confirmation_identity.test.ts",
        "__tests__/start_surface_copy_length.test.ts",
        "__tests__/surgical_perfection_invariants.test.ts",
        "__tests__/intelligence_layer_invariants.test.ts",
        "__tests__/scenario_profiles_contract.test.ts",
        "__tests__/queue_type_mapping_invariants.test.ts",
        "__tests__/scenario_objective_safety.test.ts",
        "__tests__/triage_reason_determinism.test.ts",
        "__tests__/path_variant_determinism.test.ts",
        "__tests__/template_variant_fallback.test.ts",
        "__tests__/import_purpose_single_control.test.ts",
        "__tests__/csv_list_purpose_wiring.test.ts",
        "__tests__/stop_conditions_never_send.test.ts",
        "__tests__/start_clarity_line_contract.test.ts",
        "__tests__/scenario_ledger_emission_presence.test.ts",
        "__tests__/intelligence_commitment_registry.test.ts",
        "__tests__/cadence_governor_invariants.test.ts",
        "__tests__/scenario_auto_override_invariants.test.ts",
        "__tests__/escalation_summary_expanded.test.ts",
        "__tests__/no_random_in_intelligence_layer.test.ts",
        "__tests__/no_delete_in_commitment_registry.test.ts",
        "__tests__/bounded_queries_commitment.test.ts",
        "__tests__/universal_outcome_registry_append_only.test.ts",
        "__tests__/universal_outcome_determinism.test.ts",
        "__tests__/universal_outcome_no_random.test.ts",
        "__tests__/universal_outcome_requires_next_action.test.ts",
        "__tests__/batch_wave_outcome_safety.test.ts",
        "__tests__/escalation_payload_contains_outcome.test.ts",
        "__tests__/no_delete_in_universal_outcome_registry.test.ts",
        "__tests__/conversation_stage_determinism.test.ts",
        "__tests__/drift_detector_determinism.test.ts",
        "__tests__/goodwill_bounds.test.ts",
        "__tests__/snapshot_append_only.test.ts",
        "__tests__/escalation_severity_rules.test.ts",
        "__tests__/no_random_in_conversation_kernel.test.ts",
        "__tests__/unresolved_questions_append_only.test.ts",
        "__tests__/question_extractor_determinism.test.ts",
        "__tests__/objection_lifecycle_determinism.test.ts",
        "__tests__/attempt_envelope_no_repeat.test.ts",
        "__tests__/outcome_closure_enforcement.test.ts",
        "__tests__/bounded_reads_unresolved_questions.test.ts",
        "__tests__/no_random_in_resolution_kernel.test.ts",
        "__tests__/strategic_pattern_invariants.test.ts",
        "__tests__/workspace_pattern_guard_invariants.test.ts",
        "__tests__/deterministic_micro_variation.test.ts",
        "__tests__/no_random_in_strategic_layer.test.ts",
        "__tests__/strategy_effectiveness_determinism.test.ts",
        "__tests__/commitment_decay_determinism.test.ts",
        "__tests__/strategic_horizon_determinism.test.ts",
        "__tests__/no_random_in_strategy_expansion.test.ts",
        "__tests__/no_delete_in_strategy_registry.test.ts",
        "__tests__/bounded_queries_strategy_effectiveness.test.ts",
        "__tests__/scenario_fixture_coverage.test.ts",
        "__tests__/scenario_replay_harness_invariants.test.ts",
        "__tests__/unknown_never_sends_final_lock.test.ts",
        "__tests__/prune_script_safety_contract.test.ts",
        "--reporter=verbose",
      ],
      { cwd: root, stdio: "inherit", shell: true }
    );
    child.on("close", (code) => resolve(code === 0));
  });
}

async function main(): Promise<void> {
  console.log("Verifying guarantee contracts...");
  const ok = await runVitest();
  if (!ok) {
    console.error("Guarantee verification failed. Build aborted.");
    process.exit(1);
  }
  console.log("Guarantee verification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
