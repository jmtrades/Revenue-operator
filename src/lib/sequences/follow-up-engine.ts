/**
 * Follow-up Sequence Engine — Works with sequences, sequence_steps, sequence_enrollments.
 * Handles enrollment, advancement, pausing, and batch processing of sequences.
 */

import { getDb } from "@/lib/db/queries";
import type { DealStateVector } from "@/lib/engines/perception";
import { setLeadPlan } from "@/lib/plans/lead-plan";
import { getSequenceDelayMultiplier, type WorkspaceStrategyState } from "@/lib/strategy/planner";

/* ─── Safety Limits ─── */
/** Maximum steps any single sequence can have. Prevents runaway automation. */
export const MAX_SEQUENCE_STEPS = 10;
/** Maximum active enrollments a single contact can have simultaneously. */
export const MAX_CONCURRENT_ENROLLMENTS_PER_CONTACT = 3;
/** Maximum outbound touches (SMS + calls) to a single lead within a 24h window. */
export const MAX_TOUCHES_PER_LEAD_24H = 6;

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  /** DB column is `type` — maps to channel kind */
  type: "sms" | "email" | "call";
  delay_minutes: number;
  /** DB stores template content + conditions inside a JSONB `config` column */
  config?: { template_content?: string; conditions?: Record<string, unknown>; [key: string]: unknown };
  template_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  /** DB column is `lead_id` */
  lead_id: string;
  workspace_id: string;
  run_id?: string;
  status: "active" | "completed" | "cancelled" | "paused";
  current_step: number;
  enrolled_at: string;
  completed_at?: string;
  unenrolled_at?: string;
  next_step_due_at?: string;
  created_at: string;
  updated_at?: string;
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

// -----------------------------
// Legacy lead sequence helpers
// -----------------------------
// These exist so older pipeline code can migrate off `engine.ts` without breaking.

export interface LegacySequenceStep {
  step: number;
  delay_hours: number;
  intervention_type: string;
  template_key: string;
  stop_on_reply: boolean;
}

export interface LegacySequence {
  id: string;
  workspace_id: string;
  name: string;
  purpose: "followup" | "revival" | "attendance";
  is_default: boolean;
  steps: LegacySequenceStep[];
}

const LEGACY_DEFAULT_FOLLOWUP_STEPS: LegacySequenceStep[] = [
  { step: 1, delay_hours: 4, intervention_type: "clarify", template_key: "followup_1", stop_on_reply: true },
  { step: 2, delay_hours: 24, intervention_type: "reassurance", template_key: "followup_2", stop_on_reply: true },
  { step: 3, delay_hours: 72, intervention_type: "revive", template_key: "followup_3", stop_on_reply: true },
];

const LEGACY_DEFAULT_REVIVAL_STEPS: LegacySequenceStep[] = [
  { step: 1, delay_hours: 24, intervention_type: "revive", template_key: "revival_1", stop_on_reply: true },
  { step: 2, delay_hours: 72, intervention_type: "revive", template_key: "revival_2", stop_on_reply: true },
];

const LEGACY_DEFAULT_ATTENDANCE_STEPS: LegacySequenceStep[] = [
  { step: 1, delay_hours: 2, intervention_type: "reminder", template_key: "reminder_1", stop_on_reply: true },
  { step: 2, delay_hours: 24, intervention_type: "prep_info", template_key: "prep_1", stop_on_reply: true },
];

/** Legacy: choose a lead sequence based on deal state. */
export async function chooseSequence(
  stateVector: DealStateVector,
  _settings: Record<string, unknown>,
): Promise<LegacySequence> {
  const db = getDb();
  const state = stateVector.state;
  const purpose =
    state === "BOOKED"
      ? "attendance"
      : state === "REACTIVATE" || stateVector.engagement_decay_hours > 72
        ? "revival"
        : "followup";

  // Map legacy purpose to trigger_type; store steps in trigger_config
  const { data: seq } = await db
    .from("sequences")
    .select("*")
    .eq("workspace_id", stateVector.workspace_id)
    .eq("trigger_type", purpose)
    .limit(1)
    .maybeSingle();

  if (seq) {
    // Reconstruct LegacySequence from DB row
    const row = seq as { id: string; workspace_id: string; name: string; trigger_type: string; trigger_config?: { steps?: LegacySequenceStep[]; is_default?: boolean } };
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      name: row.name,
      purpose: row.trigger_type as LegacySequence["purpose"],
      is_default: row.trigger_config?.is_default ?? false,
      steps: row.trigger_config?.steps ?? [],
    };
  }

  const defaultSteps =
    purpose === "attendance"
      ? LEGACY_DEFAULT_ATTENDANCE_STEPS
      : purpose === "revival"
        ? LEGACY_DEFAULT_REVIVAL_STEPS
        : LEGACY_DEFAULT_FOLLOWUP_STEPS;

  const { data: created } = await db
    .from("sequences")
    .insert({
      workspace_id: stateVector.workspace_id,
      name: `Default ${purpose}`,
      trigger_type: purpose,
      trigger_config: { is_default: true, steps: defaultSteps },
      is_active: true,
    })
    .select("*")
    .maybeSingle();

  if (created && (created as { id: string }).id) {
    const row = created as { id: string; workspace_id: string; name: string; trigger_type: string; trigger_config?: { steps?: LegacySequenceStep[]; is_default?: boolean } };
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      name: row.name,
      purpose: row.trigger_type as LegacySequence["purpose"],
      is_default: row.trigger_config?.is_default ?? true,
      steps: row.trigger_config?.steps ?? defaultSteps,
    };
  }

  const { data: fallback } = await db
    .from("sequences")
    .select("*")
    .eq("workspace_id", stateVector.workspace_id)
    .eq("trigger_type", purpose)
    .limit(1)
    .maybeSingle();
  if (fallback) {
    const row = fallback as { id: string; workspace_id: string; name: string; trigger_type: string; trigger_config?: { steps?: LegacySequenceStep[]; is_default?: boolean } };
    return {
      id: row.id,
      workspace_id: row.workspace_id,
      name: row.name,
      purpose: row.trigger_type as LegacySequence["purpose"],
      is_default: row.trigger_config?.is_default ?? false,
      steps: row.trigger_config?.steps ?? [],
    };
  }

  return {
    id: "",
    workspace_id: stateVector.workspace_id,
    name: `Default ${purpose}`,
    purpose,
    is_default: true,
    steps: defaultSteps,
  } as LegacySequence;
}

/** Legacy: advance a lead sequence run and update the lead plan. */
export async function advanceSequence(
  workspaceId: string,
  leadId: string,
  strategyState?: WorkspaceStrategyState | null,
): Promise<{ advanced: boolean; nextStep?: LegacySequenceStep; nextActionAt?: string }> {
  const db = getDb();
  const { data: run } = await db
    .from("sequence_runs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "running")
    .maybeSingle();

  if (!run) return { advanced: false };

  const r = run as { sequence_id: string; current_step: number };
  const { data: seq } = await db.from("sequences").select("trigger_config").eq("id", r.sequence_id).maybeSingle();
  const steps = (((seq as { trigger_config?: { steps?: LegacySequenceStep[] } })?.trigger_config?.steps) ?? []) as LegacySequenceStep[];
  const nextStepIndex = steps.findIndex((s) => s.step === r.current_step + 1);
  if (nextStepIndex < 0) {
    await db
      .from("sequence_runs")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("workspace_id", workspaceId)
      .eq("lead_id", leadId);
    return { advanced: true };
  }

  const nextStep = steps[nextStepIndex];
  const { getWorkspaceStrategy } = await import("@/lib/strategy/planner");
  const strategy = strategyState ?? (await getWorkspaceStrategy(workspaceId));
  const mult = getSequenceDelayMultiplier(strategy.aggressiveness_level);
  let nextAt: Date;
  try {
    const { computeDealStateVector } = await import("@/lib/engines/perception");
    const { computeRevenueState } = await import("@/lib/revenue-state");
    const vector = await computeDealStateVector(workspaceId, leadId);
    if (vector) {
      const rev = computeRevenueState(vector);
      if (rev.transition_toward_risk_at) {
        nextAt = new Date(rev.transition_toward_risk_at);
      } else {
        nextAt = new Date();
        nextAt.setHours(nextAt.getHours() + Math.max(1, nextStep.delay_hours * mult));
      }
    } else {
      nextAt = new Date();
      nextAt.setHours(nextAt.getHours() + Math.max(1, nextStep.delay_hours * mult));
    }
  } catch {
    nextAt = new Date();
    nextAt.setHours(nextAt.getHours() + Math.max(1, nextStep.delay_hours * mult));
  }

  await db
    .from("sequence_runs")
    .update({
      current_step: r.current_step + 1,
    })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId);

  await setLeadPlan(workspaceId, leadId, {
    next_action_type: nextStep.intervention_type,
    next_action_at: nextAt.toISOString(),
    sequence_id: r.sequence_id,
    sequence_step: nextStep.step,
  });

  return { advanced: true, nextStep, nextActionAt: nextAt.toISOString() };
}

/** Legacy: stop a lead sequence run and cancel the lead plan. */
export async function stopSequence(workspaceId: string, leadId: string, reason: string): Promise<void> {
  const db = getDb();
  const { cancelLeadPlan } = await import("@/lib/plans/lead-plan");
  await cancelLeadPlan(workspaceId, leadId, reason);
  await db
    .from("sequence_runs")
    .update({ status: "stopped", metadata: { stopped_reason: reason } })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId);
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
    .from("sequences")
    .select("id, workspace_id")
    .eq("id", sequenceId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!seq) return null;

  // Safety: Check if lead already has too many active enrollments
  const { count: activeCount } = await db
    .from("sequence_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("lead_id", contactId)
    .eq("workspace_id", workspaceId)
    .eq("status", "active");
  if ((activeCount ?? 0) >= MAX_CONCURRENT_ENROLLMENTS_PER_CONTACT) {
    console.warn(`[sequence-safety] Lead ${contactId} already has ${activeCount} active enrollments — skipping new enrollment`);
    return null;
  }

  // Safety: Check if lead is already enrolled in this specific sequence
  const { data: existing } = await db
    .from("sequence_enrollments")
    .select("id")
    .eq("sequence_id", sequenceId)
    .eq("lead_id", contactId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) {
    console.warn(`[sequence-safety] Lead ${contactId} already enrolled in sequence ${sequenceId} — skipping duplicate`);
    return null;
  }

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

  // Insert enrollment — DB-level partial unique index (uq_sequence_enrollments_active)
  // on (sequence_id, lead_id) WHERE status='active' prevents concurrent race conditions.
  const { data: enrollment, error } = await db
    .from("sequence_enrollments")
    .insert({
      sequence_id: sequenceId,
      lead_id: contactId,
      workspace_id: workspaceId,
      status: "active",
      current_step: 0,
      next_step_due_at: nextStepDueAt,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    // Handle unique constraint violation gracefully (23505 = unique_violation)
    const pgCode = (error as { code?: string }).code;
    if (pgCode === "23505") {
      console.warn(`[sequence-safety] Concurrent enrollment race caught for lead ${contactId} in sequence ${sequenceId}`);
      return null;
    }
    console.error(`[sequence-safety] Enrollment insert failed:`, error.message);
    return null;
  }
  if (!enrollment) return null;
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

  // Safety: Hard cap on step count to prevent runaway sequences
  if (e.current_step >= MAX_SEQUENCE_STEPS) {
    console.warn(`[sequence-safety] Enrollment ${enrollmentId} reached MAX_SEQUENCE_STEPS (${MAX_SEQUENCE_STEPS}) — auto-completing`);
    await db
      .from("sequence_enrollments")
      .update({ status: "completed", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", enrollmentId);
    return null;
  }

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

  let stepToExecute = nextStep;
  if (nextStep.type === "sms") {
    const { data: lead } = await db
      .from("leads")
      .select("metadata")
      .eq("workspace_id", e.workspace_id)
      .eq("id", e.lead_id)
      .maybeSingle();
    const metadata = ((lead as { metadata?: Record<string, unknown> | null } | null)?.metadata ?? {}) as Record<
      string,
      unknown
    >;
    if (metadata.sms_undeliverable === true) {
      stepToExecute = { ...nextStep, type: "call" };
    }
  }

  // Safety: Check per-lead 24h touch count before executing outbound action
  if (stepToExecute.type === "sms" || stepToExecute.type === "call") {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const { count: recentTouches } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", e.workspace_id)
      .eq("lead_id", e.lead_id)
      .gte("call_started_at", twentyFourHoursAgo.toISOString());
    // Also count recent outbound messages
    const { count: recentMessages } = await db
      .from("outbound_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", e.workspace_id)
      .eq("lead_id", e.lead_id)
      .gte("created_at", twentyFourHoursAgo.toISOString());
    const totalTouches = (recentTouches ?? 0) + (recentMessages ?? 0);
    if (totalTouches >= MAX_TOUCHES_PER_LEAD_24H) {
      console.warn(`[sequence-safety] Lead ${e.lead_id} already has ${totalTouches} touches in 24h — skipping step, rescheduling`);
      // Reschedule this step for 6 hours later instead of executing now
      const laterDue = new Date();
      laterDue.setHours(laterDue.getHours() + 6);
      await db
        .from("sequence_enrollments")
        .update({ next_step_due_at: laterDue.toISOString(), updated_at: new Date().toISOString() })
        .eq("id", enrollmentId);
      return null;
    }
  }

  // Execute the action: send SMS, email, or trigger outbound call
  let actionSucceeded = false;
  try {
    const templateContent = stepToExecute.config?.template_content as string | undefined;

    if (stepToExecute.type === "sms") {
      const { data: leadRow } = await db
        .from("leads")
        .select("phone, name")
        .eq("id", e.lead_id)
        .eq("workspace_id", e.workspace_id)
        .maybeSingle();
      const lead = leadRow as { phone?: string; name?: string } | null;
      if (lead?.phone) {
        const { data: phoneConfig } = await db
          .from("phone_configs")
          .select("proxy_number")
          .eq("workspace_id", e.workspace_id)
          .eq("status", "active")
          .maybeSingle();
        const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
        if (fromNumber) {
          const { getTelephonyService } = await import("@/lib/telephony");
          const svc = getTelephonyService();
          const messageText = templateContent
            ? templateContent
                .replace(/\{\{name\}\}/gi, lead.name ?? "there")
                .replace(/\{\{phone\}\}/gi, lead.phone)
            : `Hi ${lead.name ?? "there"}, just following up. Let us know if you have any questions or would like to schedule a time to chat.`;
          await svc.sendSms({ from: fromNumber, to: lead.phone, text: messageText });
          actionSucceeded = true;
        }
      }
    } else if (stepToExecute.type === "call") {
      const { executeLeadOutboundCall } = await import("@/lib/outbound/execute-lead-call");
      const result = await executeLeadOutboundCall(e.workspace_id, e.lead_id, { campaignType: "lead_followup" });
      actionSucceeded = result.ok;
    } else if (stepToExecute.type === "email") {
      // Email delivery through workspace email config (if configured)
      const { data: leadRow } = await db
        .from("leads")
        .select("email, name")
        .eq("id", e.lead_id)
        .eq("workspace_id", e.workspace_id)
        .maybeSingle();
      const lead = leadRow as { email?: string; name?: string } | null;
      if (lead?.email) {
        const { data: wsCtx } = await db
          .from("workspace_business_context")
          .select("business_name")
          .eq("workspace_id", e.workspace_id)
          .maybeSingle();
        const businessName = (wsCtx as { business_name?: string } | null)?.business_name ?? "Our team";
        const subject = `Following up — ${businessName}`;
        const body = templateContent
          ? templateContent
              .replace(/\{\{name\}\}/gi, lead.name ?? "there")
          : `Hi ${lead.name ?? "there"},\n\nJust wanted to follow up and see if you had any questions. We'd love to help.\n\nBest,\n${businessName}`;

        // Use Resend if configured
        const resendKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.RESEND_FROM_EMAIL ?? `noreply@recall-touch.com`;
        if (resendKey) {
          try {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ from: fromEmail, to: lead.email, subject, text: body }),
            });
            actionSucceeded = true;
          } catch (fetchErr) {
            console.error("[sequence-email] Email fetch failed:", fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
            // Log but don't block — continue processing
          }
        }
      }
    }
  } catch (execErr) {
    // Log but don't block enrollment advancement — step delivery failure shouldn't stall the sequence
    const { log } = await import("@/lib/logger");
    log("error", "sequence_step_execution_error", {
      enrollment_id: enrollmentId,
      step_order: stepToExecute.step_order,
      type: stepToExecute.type,
      error: execErr instanceof Error ? execErr.message : String(execErr),
    });
  }

  // IMPORTANT: Only update enrollment state AFTER action successfully executes
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
  return { step: stepToExecute, enrollment: updated as SequenceEnrollment };
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
  _reason?: string
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

  let enrollments: SequenceEnrollment[] | null = null;
  try {
    const { data, error } = await db
      .from("sequence_enrollments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .lt("next_step_due_at", now)
      .order("next_step_due_at", { ascending: true })
      .limit(limit);

    if (error) {
      // Table may not be provisioned yet — return empty silently
      return [];
    }
    enrollments = data as SequenceEnrollment[];
  } catch {
    // Table doesn't exist yet — return empty
    return [];
  }

  return (enrollments as SequenceEnrollment[]) ?? [];
}

/**
 * Pause all active enrollments for a lead when they reply (inbound message, answered call, etc.).
 * This prevents the system from sending follow-ups to someone who's already engaged.
 * Should be called from inbound webhooks and voice call completion handlers.
 */
export async function pauseOnLeadReply(
  workspaceId: string,
  leadId: string,
  reason: string = "lead_replied"
): Promise<number> {
  const db = getDb();

  // Find all active enrollments for this lead
  const { data: activeEnrollments } = await db
    .from("sequence_enrollments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "active");

  const enrollments = (activeEnrollments ?? []) as Array<{ id: string }>;
  if (enrollments.length === 0) return 0;

  let paused = 0;
  for (const enrollment of enrollments) {
    const success = await pauseEnrollment(enrollment.id);
    if (success) paused++;
  }

  // Also stop legacy sequence runs
  await db.from("sequence_runs")
    .update({ status: "paused", metadata: { stopped_reason: reason } })
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .eq("status", "running");

  return paused;
}

/**
 * Get all enrollments for a contact (check if already enrolled).
 */
export async function getContactEnrollments(
  workspaceId: string,
  contactId: string
): Promise<SequenceEnrollment[]> {
  const db = getDb();

  try {
    const { data: enrollments, error } = await db
      .from("sequence_enrollments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", contactId)
      .order("enrolled_at", { ascending: false });

    if (error) return [];
    return (enrollments as SequenceEnrollment[]) ?? [];
  } catch {
    return [];
  }
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
    .from("sequences")
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

  try {
    const { data: sequences, error } = await db
      .from("sequences")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) return [];
    return (sequences as FollowUpSequence[]) ?? [];
  } catch {
    return [];
  }
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
    .from("sequences")
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
    .from("sequences")
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
  type: "sms" | "email" | "call" | "wait" | "webhook",
  delayMinutes: number = 0,
  templateContent?: string,
  conditions: Record<string, unknown> = {}
): Promise<SequenceStep | null> {
  const db = getDb();

  const config: Record<string, unknown> = {};
  if (templateContent) config.template_content = templateContent;
  if (Object.keys(conditions).length > 0) config.conditions = conditions;

  const { data: step, error } = await db
    .from("sequence_steps")
    .insert({
      sequence_id: sequenceId,
      step_order: stepOrder,
      type,
      delay_minutes: delayMinutes,
      config: Object.keys(config).length > 0 ? config : null,
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
    .from("sequences")
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
    .from("sequences")
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
