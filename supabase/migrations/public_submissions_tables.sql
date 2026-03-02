-- Waitlist (founding members) and contact form submissions.
-- Optional persistence for /api/waitlist and /api/contact.

CREATE TABLE IF NOT EXISTS revenue_operator.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON revenue_operator.waitlist(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON revenue_operator.waitlist(email);

CREATE TABLE IF NOT EXISTS revenue_operator.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  company text,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON revenue_operator.contact_submissions(created_at DESC);

COMMENT ON TABLE revenue_operator.waitlist IS 'Founding members / early access signups from homepage.';
COMMENT ON TABLE revenue_operator.contact_submissions IS 'Contact form submissions from /contact.';
