ALTER TABLE revenue_operator.workspaces
  ADD COLUMN IF NOT EXISTS verified_phone text;

COMMENT ON COLUMN revenue_operator.workspaces.verified_phone IS 'E.164 phone number verified via SMS (Twilio Verify).';
