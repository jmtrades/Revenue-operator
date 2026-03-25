-- Temporal stability: repeated coherent completion across threads and days. No deletes.

BEGIN;

CREATE TABLE IF NOT EXISTS revenue_operator.temporal_stability_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  stability_type text NOT NULL CHECK (stability_type IN (
    'repeated_resolution',
    'repeated_confirmation',
    'repeated_settlement',
    'repeated_followthrough'
  )),
  first_observed_at timestamptz NOT NULL,
  last_confirmed_at timestamptz NOT NULL,
  occurrence_count int NOT NULL DEFAULT 1,
  independent_threads_count int NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_temporal_stability_workspace_type
  ON revenue_operator.temporal_stability_records (workspace_id, stability_type);
CREATE INDEX IF NOT EXISTS idx_temporal_stability_workspace
  ON revenue_operator.temporal_stability_records (workspace_id);

COMMENT ON TABLE revenue_operator.temporal_stability_records IS 'Temporal stability: same completion pattern across ≥3 threads and ≥2 UTC days. Historical fact only.';

COMMIT;
