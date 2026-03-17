/**
 * Follow-up Sequence Engine — Works with follow_up_sequences, sequence_steps, sequence_enrollments.
 * Handles enrollment, advancement, pausing, and batch processing of sequences.
 */

import { getDb } from "@/lib/db/queries";

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  channel: "sms" | "email" | "call";
  delay_minutes: number;
  template_content?: string;
  conditions: Record<string, unknown>;
  created_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  contact_id: string;
  workspace_id: string;
  status: "active" | "completed" | "cancelled" | "paused";
  current_step: number;
  enrolled_at: string;
  completed_at?: string;
  next_step_due_at?: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUpSequence {
  id: string;
  workspace_id: string;
  name: string;
  trigger_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Enroll a contact into a follow-up sequence.
 * Creates an enrollment record and calculates the first step's due time.
 */
export async function enrollContact(
  workspaceId: string,
  sequenceId: string,
  contactId: string
): Promise<SequenceEnrollment | null> {
  const db = getDb();

  // Verify the sequence exists and belongs to this workspace
  const { data: seq } = await db
    .from("follow_up_sequences")
    .select("id, workspace_id")
    .eq("id", sequenceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!seq) return null;

  // Get the first step to calculate next_step_due_at
  const { data: firstStep } = await db
    .from("sequence_steps")
    .select("id, delay_minutes")
    .eq("sequence_id", sequenceId)
    .eq("step_order", 1)
    .maybeSingle();

  // Calculate when the first step should execute
  let nextStepDueAt: string | null = null;
  if (firstStep) {
    const delay = (firstStep as { delay_minutes?: number | null }).delay_minutes ?? 0;
    const dueDate = new Date();
    dueDate.setMinutes(dueDate.getMinutes() + delay);
    nextStepDueAt = dueDate.toISOString();
  }

  // Insert enrollment
  const { data: enrollment, error } = await db
    .from("sequence_enrollments")
    .insert({
      sequence_id: sequenceId,
      contact_id: contactId,
      workspace_id: workspaceId,
      status: "active",
      current_step: 0, // Will increment to 1 on first execution
      next_step_due_at: nextStepDueAt,
    })
    .select("*")
    .maybeSingle();

  if (error || !enrollment) return null;
  return enrollment as SequenceEnrollment;
}

/**
 * Get the next step for an enrollment.
 */
async function getNextStep(
  sequenceId: string,
  currentStepOrder: number
): Promise<SequenceStep | null> {
  const db = getDb();
  const nextStepOrder = currentStepOrder + 1;

  const { data: step } = await db
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .eq("step_order", nextStepOrder)
    .maybeSingle();

  if (!step) return null;
  return step as SequenceStep;
}

/**
 * Advance an enrollment to the next step.
 * Executes the action for the current step (SMS/email/call) and calculates the next due time.
 * Returns the executed step info or null if sequence is complete.
 */
export async function advanceEnrollment(
  enrollmentId: string
): Promise<{ step: SequenceStep; enrollment: SequenceEnrollment } | null> {
  const db = getDb();

  // Get enrollment
  const { data: enrollment } = await db
    .from("sequence_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return null;

  const e = enrollment as SequenceEnrollment;
  if (e.status !== "active") return null;

  // Get the next step (increment current_step)
  const nextStep = await getNextStep(e.sequence_id, e.current_step);
  if (!nextStep) {
    // No more steps: mark as completed
    await db
      .from("sequence_enrollments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", enrollmentId);
    return null;
  }

  // Execute the action (in a real system, this would trigger SMS/email/call)
  // For now, we just log the intention
  console.log(
    `[Sequence] Executing step ${nextStep.step_order} for enrollment ${enrollmentId}: ${nextStep.channel}`
  );

  // Calculate when the next step should execute
  const nextDueDate = new Date();
  nextDueDate.setMinutes(nextDueDate.getMinutes() + nextStep.delay_minutes);

  // Update enrollment
  const { data: updated } = await db
    .from("sequence_enrollments")
    .update({
      current_step: nextStep.step_order,
      next_step_due_at: nextDueDate.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId)
    .select("*")
    .maybeSingle();

  if (!updated) return null;
  return { step: nextStep, enrollment: updated as SequenceEnrollment };
}

/**
 * Pause an enrollment.
 */
export async function pauseEnrollment(enrollmentId: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db
    .from("sequence_enrollments")
    .update({
      status: "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  return !error;
}

/**
 * Resume a paused enrollment.
 */
export async function resumeEnrollment(enrollmentId: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db
    .from("sequence_enrollments")
    .update({
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  return !error;
}

/**
 * Cancel an enrollment.
 */
export async function cancelEnrollment(
  enrollmentId: string,
  reason?: string
): Promise<boolean> {
  const db = getDb();
  const { error } = await db
    .from("sequence_enrollments")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId);

  return !error;
}

/**
 * Get all enrollments due for execution.
 * Returns enrollments where next_step_due_at is in the past.
 */
export async function getNextDueEnrollments(
  workspaceId: string,
  limit: number = 100
): Promise<SequenceEnrollment[]> {
  const db = getDb();
  const now = new Date().toISOString();

  const { data: enrollments, error } = await db
    .from("sequence_enrollments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .lt("next_step_due_at", now)
    .order("next_step_due_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[Sequence] Error fetching due enrollments:", error);
    return [];
  }

  return (enrollments as SequenceEnrollment[]) ?? [];
}

/**
 * Get all enrollments for a contact (check if already enrolled).
 */
export async function getContactEnrollments(
  workspaceId: string,
  contactId: string
): Promise<SequenceEnrollment[]> {
  const db = getDb();

  const { data: enrollments, error } = await db
    .from("sequence_enrollments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", contactId)
    .order("enrolled_at", { ascending: false });

  if (error) {
    console.error("[Sequence] Error fetching contact enrollments:", error);
    return [];
  }

  return (enrollments as SequenceEnrollment[]) ?? [];
}

/**
 * Get an enrollment by ID with related sequence and steps.
 */
export async function getEnrollmentWithDetails(
  enrollmentId: string
): Promise<{
  enrollment: SequenceEnrollment;
  sequence: FollowUpSequence;
  steps: SequenceStep[];
} | null> {
  const db = getDb();

  const { data: enrollment } = await db
    .from("sequence_enrollments")
    .select("*")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return null;

  const e = enrollment as SequenceEnrollment;

  const { data: sequence } = await db
    .from("follow_up_sequences")
    .select("*")
    .eq("id", e.sequence_id)
    .maybeSingle();

  const { data: steps } = await db
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", e.sequence_id)
    .order("step_order", { ascending: true });

  if (!sequence) return null;

  return {
    enrollment: e,
    sequence: sequence as FollowUpSequence,
    steps: (steps as SequenceStep[]) ?? [],
  };
}

/**
 * Batch processor: Get and process all due enrollments for a workspace.
 * This is called by the cron endpoint.
 */
export async function processWorkspaceDueEnrollments(
  workspaceId: string,
  batchSize: number = 50
): Promise<number> {
  const due = await getNextDueEnrollments(workspaceId, batchSize);
  let processedCount = 0;

  for (const enrollment of due) {
    try {
      const result = await advanceEnrollment(enrollment.id);
      if (result) {
        processedCount++;
      }
    } catch (err) {
      console.error(`[Sequence] Error advancing enrollment ${enrollment.id}:`, err);
    }
  }

  return processedCount;
}

/**
 * Get all active sequences for a workspace.
 */
export async function getWorkspaceSequences(
  workspaceId: string
): Promise<FollowUpSequence[]> {
  const db = getDb();

  const { data: sequences, error } = await db
    .from("follow_up_sequences")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Sequence] Error fetching sequences:", error);
    return [];
  }

  return (sequences as FollowUpSequence[]) ?? [];
}

/**
 * Get a sequence with all its steps.
 */
export async function getSequenceWithSteps(
  sequenceId: string,
  workspaceId: string
): Promise<{ sequence: FollowUpSequence; steps: SequenceStep[] } | null> {
  const db = getDb();

  const { data: sequence } = await db
    .from("follow_up_sequences")
    .select("*")
    .eq("id", sequenceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!sequence) return null;

  const { data: steps } = await db
    .from("sequence_steps")
    .select("*")
    .eq("sequence_id", sequenceId)
    .order("step_order", { ascending: true });

  return {
    sequence: sequence as FollowUpSequence,
    steps: (steps as SequenceStep[]) ?? [],
  };
}

/**
 * Create a new follow-up sequence.
 */
export async function createSequence(
  workspaceId: string,
  name: string,
  triggerType: string = "manual"
): Promise<FollowUpSequence | null> {
  const db = getDb();

  const validTriggers = [
    "missed_call",
    "new_lead",
    "no_show",
    "quote_sent",
    "dormant_contact",
    "manual",
  ];
  const trigger = validTriggers.includes(triggerType) ? triggerType : "manual";

  const { data: sequence, error } = await db
    .from("follow_up_sequences")
    .insert({
      workspace_id: workspaceId,
      name: name.trim(),
      trigger_type: trigger,
      is_active: true,
    })
    .select("*")
    .maybeSingle();

  if (error || !sequence) return null;
  return sequence as FollowUpSequence;
}

/**
 * Add a step to a sequence.
 */
export async function addSequenceStep(
  sequenceId: string,
  stepOrder: number,
  channel: "sms" | "email" | "call",
  delayMinutes: number = 0,
  templateContent?: string
): Promise<SequenceStep | null> {
  const db = getDb();

  const { data: step, error } = await db
    .from("sequence_steps")
    .insert({
      sequence_id: sequenceId,
      step_order: stepOrder,
      channel,
      delay_minutes: delayMinutes,
      template_content: templateContent,
      conditions: {},
    })
    .select("*")
    .maybeSingle();

  if (error || !step) return null;
  return step as SequenceStep;
}

/**
 * Update a sequence.
 */
export async function updateSequence(
  sequenceId: string,
  workspaceId: string,
  updates: { name?: string; trigger_type?: string; is_active?: boolean }
): Promise<FollowUpSequence | null> {
  const db = getDb();

  const { data: sequence, error } = await db
    .from("follow_up_sequences")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sequenceId)
    .eq("workspace_id", workspaceId)
    .select("*")
    .maybeSingle();

  if (error || !sequence) return null;
  return sequence as FollowUpSequence;
}

/**
 * Delete a sequence and all its enrollments/steps.
 */
export async function deleteSequence(
  sequenceId: string,
  workspaceId: string
): Promise<boolean> {
  const db = getDb();

  const { error } = await db
    .from("follow_up_sequences")
    .delete()
    .eq("id", sequenceId)
    .eq("workspace_id", workspaceId);

  return !error;
}

/**
 * Update the order of steps in a sequence.
 */
export async function reorderSequenceSteps(
  stepIds: string[]
): Promise<boolean> {
  const db = getDb();

  try {
    for (let i = 0; i < stepIds.length; i++) {
      const { error } = await db
        .from("sequence_steps")
        .update({ step_order: i + 1 })
        .eq("id", stepIds[i]);

      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}
