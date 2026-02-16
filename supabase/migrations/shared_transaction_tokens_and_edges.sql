-- One-tap acknowledgement tokens (no login) and counterparty propagation edges.

BEGIN;

-- A1) Tokens for public acknowledge link
CREATE TABLE IF NOT EXISTS revenue_operator.shared_transaction_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_transaction_id uuid NOT NULL REFERENCES revenue_operator.shared_transactions(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shared_transaction_tokens_hash
  ON revenue_operator.shared_transaction_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_shared_transaction_tokens_expires
  ON revenue_operator.shared_transaction_tokens (expires_at);

-- B1) Counterparty edges for propagation (observed -> invited -> activated)
CREATE TABLE IF NOT EXISTS revenue_operator.counterparty_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  counterparty_identifier text NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'observed'
    CHECK (status IN ('observed', 'invited', 'activated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, counterparty_identifier)
);

CREATE INDEX IF NOT EXISTS idx_counterparty_edges_workspace_status
  ON revenue_operator.counterparty_edges (workspace_id, status);

COMMIT;
