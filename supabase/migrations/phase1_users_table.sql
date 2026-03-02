-- Phase 1: users table for admin email check and activation_events reference.
-- id = Supabase auth user id; email synced from auth on first sign-in.

CREATE TABLE IF NOT EXISTS revenue_operator.users (
  id uuid PRIMARY KEY,
  email text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON revenue_operator.users(email);

COMMENT ON TABLE revenue_operator.users IS 'Synced from Supabase auth on callback; used for admin check and activation_events.';
