-- Institutional state: none | embedded | reliant | assumed. Standard formation.
ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS institutional_state text NOT NULL DEFAULT 'none'
  CHECK (institutional_state IN ('none', 'embedded', 'reliant', 'assumed'));

ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS assumed_orientation_recorded_at timestamptz;

-- Backfill: recomputeInstitutionalState will set from operational_position when cron/ack/proof run.
