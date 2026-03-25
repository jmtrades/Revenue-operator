-- Domain Packs: work unit types, state transitions, recovery rules, confirmation rules, evidence rules.
-- No scripts. Deterministic state logic per domain (real_estate, recruiting, clinic, etc.).

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.domain_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain_type text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, domain_type)
);

CREATE INDEX IF NOT EXISTS idx_domain_packs_workspace
  ON revenue_operator.domain_packs (workspace_id);

COMMENT ON TABLE revenue_operator.domain_packs IS 'Domain pack: work_unit types, states, transitions, recovery rules, confirmation/evidence rules. Policy decides action; AI only extracts entities.';

COMMIT;
