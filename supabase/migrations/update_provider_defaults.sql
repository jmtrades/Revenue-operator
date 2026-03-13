ALTER TABLE revenue_operator.phone_numbers ALTER COLUMN provider SET DEFAULT 'twilio';

UPDATE revenue_operator.phone_numbers SET provider = 'twilio' WHERE provider = 'vapi';

