-- Index for strict temporal replay: only the earliest unprocessed signal per lead may run.
-- hasEarlierUnprocessedSignal(workspace_id, lead_id, occurred_at) checks for earlier pending.

CREATE INDEX IF NOT EXISTS idx_canonical_signals_lead_pending_occurred
  ON revenue_operator.canonical_signals (workspace_id, lead_id, occurred_at)
  WHERE processed_at IS NULL;
