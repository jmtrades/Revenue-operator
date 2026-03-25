-- Settlement Layer: consent-based authorization and usage export. No pricing UI.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  settlement_state text NOT NULL CHECK (settlement_state IN ('inactive', 'pending_authorization', 'active', 'suspended')),
  stripe_customer_id text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_subscription_item_id text,
  stripe_price_id text,
  currency text NOT NULL DEFAULT 'usd',
  country text,
  authorized_at timestamptz,
  suspended_at timestamptz,
  last_exported_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_accounts_workspace ON revenue_operator.settlement_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_settlement_accounts_state ON revenue_operator.settlement_accounts(settlement_state);

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  external_ref text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  state text NOT NULL CHECK (state IN ('issued', 'opened', 'authorized', 'expired', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_settlement_intents_workspace_created ON revenue_operator.settlement_intents(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  export_state text NOT NULL CHECK (export_state IN ('pending', 'exported', 'failed')),
  failure_reason text,
  stripe_usage_record_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_settlement_exports_workspace ON revenue_operator.settlement_exports(workspace_id);

CREATE TABLE IF NOT EXISTS revenue_operator.settlement_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Extend protocol_events event_type for settlement
ALTER TABLE revenue_operator.protocol_events
  DROP CONSTRAINT IF EXISTS protocol_events_event_type_check;
ALTER TABLE revenue_operator.protocol_events
  ADD CONSTRAINT protocol_events_event_type_check
  CHECK (event_type IN (
    'created', 'token_issued', 'acknowledged', 'rescheduled', 'disputed', 'expired',
    'mirrored', 'network_pressure', 'environment_required',
    'settlement_issued', 'settlement_opened', 'settlement_authorized', 'settlement_expired',
    'settlement_exported', 'settlement_export_failed'
  ));

COMMIT;
