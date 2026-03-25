-- Operational infrastructure: memory, relationship state, structural rules, resolution preferences.
-- Additive only.

BEGIN;

-- Operational memory: durable facts that influence engine behavior
CREATE TABLE IF NOT EXISTS revenue_operator.operational_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  promise_summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  fulfilled_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_operational_promises_workspace_unfulfilled
  ON revenue_operator.operational_promises (workspace_id) WHERE fulfilled_at IS NULL;

CREATE TABLE IF NOT EXISTS revenue_operator.recurring_expectations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  expectation_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, counterparty_identifier, expectation_type)
);
CREATE INDEX IF NOT EXISTS idx_recurring_expectations_workspace ON revenue_operator.recurring_expectations (workspace_id);

CREATE TABLE IF NOT EXISTS revenue_operator.outcome_precedents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  outcome_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outcome_precedents_workspace_subject
  ON revenue_operator.outcome_precedents (workspace_id, subject_type, subject_id);

CREATE TABLE IF NOT EXISTS revenue_operator.commitment_behavior_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  pattern_type text NOT NULL CHECK (pattern_type IN ('repeatedly_reschedules', 'repeatedly_confirms', 'repeatedly_misses', 'consistent_confirm')),
  occurrence_count int NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, subject_type, subject_id, pattern_type)
);
CREATE INDEX IF NOT EXISTS idx_commitment_behavior_workspace ON revenue_operator.commitment_behavior_patterns (workspace_id);

-- Resolution preferences: past outcomes for decision assumption
CREATE TABLE IF NOT EXISTS revenue_operator.resolution_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  context_type text NOT NULL,
  resolution_type text NOT NULL,
  occurrence_count int NOT NULL DEFAULT 0,
  last_applied_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, context_type, resolution_type)
);
CREATE INDEX IF NOT EXISTS idx_resolution_preferences_workspace ON revenue_operator.resolution_preferences (workspace_id);

-- Relationship state: workspace ↔ counterparty stability
CREATE TABLE IF NOT EXISTS revenue_operator.relationship_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  interaction_reliability text NOT NULL DEFAULT 'unknown' CHECK (interaction_reliability IN ('unknown', 'low', 'medium', 'high')),
  response_reciprocity text NOT NULL DEFAULT 'unknown' CHECK (response_reciprocity IN ('unknown', 'low', 'medium', 'high')),
  completion_reliability text NOT NULL DEFAULT 'unknown' CHECK (completion_reliability IN ('unknown', 'low', 'medium', 'high')),
  dispute_frequency text NOT NULL DEFAULT 'unknown' CHECK (dispute_frequency IN ('unknown', 'low', 'medium', 'high')),
  payment_consistency text NOT NULL DEFAULT 'unknown' CHECK (payment_consistency IN ('unknown', 'low', 'medium', 'high')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, counterparty_identifier)
);
CREATE INDEX IF NOT EXISTS idx_relationship_state_workspace ON revenue_operator.relationship_state (workspace_id);

-- Structural rules: enforced after repeated recoveries (economic gravity)
CREATE TABLE IF NOT EXISTS revenue_operator.structural_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  rule_type text NOT NULL CHECK (rule_type IN ('require_confirmation', 'require_deposit', 'require_ack_before_work')),
  triggered_reason text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, rule_type)
);
CREATE INDEX IF NOT EXISTS idx_structural_rules_workspace ON revenue_operator.structural_rules (workspace_id);

-- Ritual cycle state: last run timestamps (engines enforce timing)
CREATE TABLE IF NOT EXISTS revenue_operator.ritual_cycle_state (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  daily_continuity_last_at timestamptz,
  weekly_closure_last_at timestamptz,
  post_outcome_stabilization_last_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Settlement usage classification only (no subscription tiers, no plan UI)
CREATE TABLE IF NOT EXISTS revenue_operator.settlement_usage_classification (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  continuity_preserved boolean NOT NULL DEFAULT false,
  loss_prevented boolean NOT NULL DEFAULT false,
  coordination_enabled boolean NOT NULL DEFAULT false,
  outcome_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_settlement_usage_classification_workspace
  ON revenue_operator.settlement_usage_classification (workspace_id);

COMMIT;
