-- Signups from /activate (launch prompt). Stores form data before user becomes a full business.
-- Admin dashboard reads from this table.

CREATE TABLE IF NOT EXISTS revenue_operator.signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  business_name text NOT NULL,
  email text NOT NULL,
  phone text,
  industry text,
  website text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'onboarded', 'active', 'churned')),
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signups_created_at ON revenue_operator.signups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signups_email ON revenue_operator.signups(email);
CREATE INDEX IF NOT EXISTS idx_signups_status ON revenue_operator.signups(status);

COMMENT ON TABLE revenue_operator.signups IS 'Signup form submissions from /activate; used by /admin.';
