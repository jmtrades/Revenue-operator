-- Layer 5: Voice script intelligence. emotional_state, objection_context, branching_rules, closing_attempts, compliance checkpoints.

BEGIN;

ALTER TABLE revenue_operator.call_script_blocks
  ADD COLUMN IF NOT EXISTS emotional_state text,
  ADD COLUMN IF NOT EXISTS objection_context text,
  ADD COLUMN IF NOT EXISTS branching_rules_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS closing_attempts_json jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS compliance_checkpoints_json jsonb NOT NULL DEFAULT '[]';

COMMENT ON COLUMN revenue_operator.call_script_blocks.emotional_state IS 'Emotional context for block (e.g. skeptical, urgent). Deterministic.';
COMMENT ON COLUMN revenue_operator.call_script_blocks.objection_context IS 'Objection tag this block addresses.';
COMMENT ON COLUMN revenue_operator.call_script_blocks.branching_rules_json IS 'Deterministic branching: condition -> next_block_id.';
COMMENT ON COLUMN revenue_operator.call_script_blocks.closing_attempts_json IS 'Structured close attempts; no freeform.';
COMMENT ON COLUMN revenue_operator.call_script_blocks.compliance_checkpoints_json IS 'Required compliance confirmations at this block.';

COMMIT;
