-- Stability filter: observation_count for repeated upserts. Internal only.

ALTER TABLE revenue_operator.operational_exposures
  ADD COLUMN IF NOT EXISTS observation_count integer NOT NULL DEFAULT 1;
