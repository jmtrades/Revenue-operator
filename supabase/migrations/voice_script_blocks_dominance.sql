-- Voice Dominance: script block types and enforcement columns.
-- All voice outbound from script blocks only. No freeform.

BEGIN;

-- Extend block_type to full dominance set
ALTER TABLE revenue_operator.call_script_blocks
  DROP CONSTRAINT IF EXISTS call_script_blocks_block_type_check;

ALTER TABLE revenue_operator.call_script_blocks
  ADD CONSTRAINT call_script_blocks_block_type_check
  CHECK (block_type IN (
    'opening_block', 'context_block', 'authority_block', 'disclosure_block',
    'qualification_block', 'objection_block', 'alignment_block', 'compliance_block',
    'consent_block', 'commitment_block', 'confirmation_block', 'close_block',
    'opening', 'discovery', 'qualification', 'objection', 'compliance', 'close', 'fallback'
  ));

-- Escalation and consent enforcement
ALTER TABLE revenue_operator.call_script_blocks
  ADD COLUMN IF NOT EXISTS escalation_threshold text CHECK (escalation_threshold IN ('none', 'low', 'medium', 'high', 'immediate')),
  ADD COLUMN IF NOT EXISTS max_duration_seconds int,
  ADD COLUMN IF NOT EXISTS consent_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN revenue_operator.call_script_blocks.escalation_threshold IS 'When exceeded → emit escalate_to_human. No infinite loops.';
COMMENT ON COLUMN revenue_operator.call_script_blocks.max_duration_seconds IS 'Max block duration; overflow → escalation.';
COMMENT ON COLUMN revenue_operator.call_script_blocks.consent_required IS 'Block requires verbal consent before proceeding.';

COMMIT;
