-- Operational profile: org | solo | creator | vendor | recruiting | legal | saas. Default org.
ALTER TABLE revenue_operator.settings
  ADD COLUMN IF NOT EXISTS operational_profile text NOT NULL DEFAULT 'org'
  CHECK (operational_profile IN ('org', 'solo', 'creator', 'vendor', 'recruiting', 'legal', 'saas'));
