-- Layer 6: Governance expansion — approval modes (jurisdiction_locked), role matrix (closer).
-- Deterministic. No removal of existing constraints until new ones are in place.

BEGIN;

-- message_policies: add jurisdiction_locked to approval_mode
ALTER TABLE revenue_operator.message_policies
  DROP CONSTRAINT IF EXISTS message_policies_approval_mode_check;
ALTER TABLE revenue_operator.message_policies
  ADD CONSTRAINT message_policies_approval_mode_check
  CHECK (approval_mode IN ('autopilot','preview_required','approval_required','locked_script','jurisdiction_locked'));

-- workspace_roles: add closer to role enum
ALTER TABLE revenue_operator.workspace_roles
  DROP CONSTRAINT IF EXISTS workspace_roles_role_check;
ALTER TABLE revenue_operator.workspace_roles
  ADD CONSTRAINT workspace_roles_role_check
  CHECK (role IN ('owner','admin','operator','closer','compliance','auditor'));

-- settings.approval_mode: extend to full approval mode set (workspace-level default)
ALTER TABLE revenue_operator.settings
  DROP CONSTRAINT IF EXISTS settings_approval_mode_check;
ALTER TABLE revenue_operator.settings
  ADD CONSTRAINT settings_approval_mode_check
  CHECK (approval_mode IN ('autopilot','review_required','preview_required','approval_required','locked_script','jurisdiction_locked'));

COMMIT;
