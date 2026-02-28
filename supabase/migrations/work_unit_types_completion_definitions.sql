-- Layer 1: Universal work unit expansion — completion_definitions for all vertical types.
-- Deterministic completion rules per type. No AI decides states.

BEGIN;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'inbound_lead', true, false, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'outbound_prospect', true, false, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'qualification_call', true, true, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'appointment', true, true, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'followup_commitment', true, false, false, false, true FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'payment_obligation', true, true, true, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'document_request', true, true, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'compliance_notice', true, true, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'contract_execution', true, true, false, false, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'retention_cycle', true, false, false, false, true FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

INSERT INTO revenue_operator.completion_definitions (
  workspace_id, work_unit_type,
  requires_confirmation, requires_evidence, requires_payment, requires_third_party, allows_internal_close
)
SELECT id, 'dispute_resolution', true, true, false, true, false FROM revenue_operator.workspaces
ON CONFLICT (workspace_id, work_unit_type) DO NOTHING;

COMMIT;
