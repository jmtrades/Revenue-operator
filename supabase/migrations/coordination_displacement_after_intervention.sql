ALTER TABLE revenue_operator.coordination_displacement_events
  ADD COLUMN IF NOT EXISTS after_intervention boolean NOT NULL DEFAULT true;
