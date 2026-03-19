BEGIN;

-- Gate agent go-live until a real test call completes successfully.
ALTER TABLE revenue_operator.agents
  ADD COLUMN IF NOT EXISTS test_call_completed boolean NOT NULL DEFAULT false;

COMMIT;

