-- Approval mode for first send: autopilot | review_required (factual, no persuasion).

ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS approval_mode text NOT NULL DEFAULT 'autopilot'
  CHECK (approval_mode IN ('autopilot', 'review_required'));
