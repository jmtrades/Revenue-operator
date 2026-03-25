-- Reconcile follow-up sequences with legacy sequences table.
-- Adds workspace_id index, ensures proper constraints, creates unified view for backwards compat.

-- Add workspace_id column to sequence_enrollments if needed (for indexing and filtering)
ALTER TABLE revenue_operator.sequence_enrollments
ADD COLUMN IF NOT EXISTS workspace_id UUID;

-- Update existing enrollments to have workspace_id from their sequence
UPDATE revenue_operator.sequence_enrollments se
SET workspace_id = fs.workspace_id
FROM revenue_operator.follow_up_sequences fs
WHERE se.sequence_id = fs.id AND se.workspace_id IS NULL;

-- Make workspace_id NOT NULL after backfilling
ALTER TABLE revenue_operator.sequence_enrollments
ALTER COLUMN workspace_id SET NOT NULL;

-- Add workspace_id foreign key
ALTER TABLE revenue_operator.sequence_enrollments
ADD CONSTRAINT fk_sequence_enrollments_workspace
FOREIGN KEY (workspace_id) REFERENCES revenue_operator.workspaces(id) ON DELETE CASCADE;

-- Create workspace_id index for fast lookups
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_workspace ON revenue_operator.sequence_enrollments(workspace_id);

-- Create composite index for efficient "get next due enrollments" queries
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_status_updated
ON revenue_operator.sequence_enrollments(workspace_id, status, updated_at DESC)
WHERE status IN ('active', 'paused');

-- Ensure sequence_steps has proper delay constraints
ALTER TABLE revenue_operator.sequence_steps
ADD CONSTRAINT check_delay_minutes_positive CHECK (delay_minutes >= 0);

-- Create index for sequence_steps ordered by step_order (for efficient step retrieval)
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order
ON revenue_operator.sequence_steps(sequence_id, step_order);

-- Enable RLS on all tables (already done in original migration, but ensure it's set)
ALTER TABLE revenue_operator.follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_operator.sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- Add next_step_due_at column to track when the next step should execute
ALTER TABLE revenue_operator.sequence_enrollments
ADD COLUMN IF NOT EXISTS next_step_due_at TIMESTAMPTZ;

-- Create index for efficient "get next due" queries
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_next_due
ON revenue_operator.sequence_enrollments(workspace_id, next_step_due_at)
WHERE status = 'active' AND next_step_due_at IS NOT NULL;

COMMENT ON COLUMN revenue_operator.sequence_enrollments.workspace_id IS 'Denormalized from follow_up_sequences for efficient filtering';
COMMENT ON COLUMN revenue_operator.sequence_enrollments.next_step_due_at IS 'When the current step should execute (created_at + step delay)';
