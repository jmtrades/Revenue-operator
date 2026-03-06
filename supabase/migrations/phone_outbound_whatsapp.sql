-- Outbound from personal/existing number + WhatsApp support
-- Run after risk_surface_phone_billing_coverage

BEGIN;

-- Optional number to use as "From" for outbound SMS and (where supported) calls.
-- When set, must be a number in the same Twilio account (provisioned or ported).
ALTER TABLE revenue_operator.phone_configs
  ADD COLUMN IF NOT EXISTS outbound_from_number text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean DEFAULT false;

COMMENT ON COLUMN revenue_operator.phone_configs.outbound_from_number IS 'E.164 number for outbound SMS/calls when user wants to send from personal or existing business number; must be in Twilio account.';
COMMENT ON COLUMN revenue_operator.phone_configs.whatsapp_enabled IS 'When true, workspace can send/receive WhatsApp via same Twilio number (if enabled in Twilio).';

COMMIT;
