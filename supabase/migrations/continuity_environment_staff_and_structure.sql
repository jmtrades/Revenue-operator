-- Staff reliance, operational expectations, structural dependence.

BEGIN;

-- Staff reliance: handoff ack, authority resolved, shared record, outcome after escalation.
CREATE TABLE IF NOT EXISTS revenue_operator.staff_operational_reliance (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  first_reliance_at timestamptz NOT NULL DEFAULT now(),
  last_reliance_at timestamptz NOT NULL DEFAULT now(),
  reliance_events integer NOT NULL DEFAULT 0
);

-- Expectation: counterparties ack >=3, staff reliance, operationally_embedded.
CREATE TABLE IF NOT EXISTS revenue_operator.operational_expectations (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  expectation_established boolean NOT NULL DEFAULT false,
  last_updated_at timestamptz NOT NULL DEFAULT now()
);

-- Structural dependence: embedded + staff reliance + expectation.
CREATE TABLE IF NOT EXISTS revenue_operator.structural_dependence (
  workspace_id uuid PRIMARY KEY REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE,
  dependent boolean NOT NULL DEFAULT false,
  established_at timestamptz
);

-- One-time orientation when structurally_dependent becomes true.
ALTER TABLE revenue_operator.workspace_orientation_state
  ADD COLUMN IF NOT EXISTS structural_orientation_recorded_at timestamptz;

COMMIT;
