-- Domain-level confidence: autonomy by domain without UI. PK(workspace_id, domain).

CREATE TABLE IF NOT EXISTS revenue_operator.confidence_domain_state (
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  domain text NOT NULL CHECK (domain IN ('communication', 'scheduling', 'payments', 'coordination')),
  phase text NOT NULL DEFAULT 'observing' CHECK (phase IN ('observing', 'simulating', 'assisted', 'autonomous')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, domain)
);

CREATE INDEX IF NOT EXISTS idx_confidence_domain_state_workspace
  ON revenue_operator.confidence_domain_state(workspace_id);
