-- Add continuity_scope_units to settlement usage classification (weighted sum of load events). Internal only.
ALTER TABLE revenue_operator.settlement_usage_classification
  ADD COLUMN IF NOT EXISTS continuity_scope_units integer NOT NULL DEFAULT 0;
