/**
 * Autonomous Executor — Takes LeadIntelligence and autonomously executes the recommended action.
 * Safety-first: checks confidence, risk flags, and daily limits before taking any action.
 * Integrates with Recovery Profile for customizable persistence levels.
 */

import { getDb } from "@/lib/db/queries";
import { log } from "@/lib/logger";
import type { LeadIntelligence } from "./lead-brain";
import { getTelephonyService } from "@/lib/telephony";
import { getDefaultFollowUpTemplate } from "./outcome-followup-router";
import { selectAdaptiveStrategy, buildAdaptiveFollowUpPlan, type AdaptiveStrategy } from "./adaptive-followup";
import { getRecoveryProfile, type RecoveryProfile } from "@/lib/recovery-profile";
import { enqueue } from "@/lib/queue";
import { notifyWorkspace } from "@/lib/notifications/dispatcher";
import { shouldSimulateOnly, shouldRequireApproval } from "@/lib/autonomy";

export type AutonomousActionType =
  | "send_sms"
  | "send_email"
  | "enroll_sequence"
  | "schedule_call"
  | "schedule_callback"
  | "book_appointment"
  | "escalate_human"
  | "reactivate"
  | "pause"
  | "update_lead_state"
  | "score_lead"
  | "monitor_sequence"
  | "change_channel"
  | "no_action";

export interface AutonomousActionResult {
  action_type: AutonomousActionType;
  success: boolean;
  details: string;
  executed_at: string;
  lead_id: string;
  workspace_id: string;
  confidence: number;
  reason: string;
}

const MAX_AUTONOMOUS_ACTIONS_PER_LEAD_PER_DAY = 5;
const CONFIDENCE_THRESHOLD = 0.3;

/**
 * Main entry point: Execute autonomous action based on LeadIntelligence.
 * Always returns an AutonomousActionResult, even on no-action.
 */
export async function executeAutonomousAction(
  intelligence: LeadIntelligence
): Promise<AutonomousActionResult> {
  const db = getDb();
  const executedAt = new Date().toISOString();

  try {
    // 1. SAFETY FIRST — check risk flags before confidence gate
    // Opt-out and anger/hostile flags always execute regardless of confidence
    if (intelligence.risk_flags.includes("opt_out_signal")) {
      await logAutonomousAction({
        action_type: "pause",
        success: true,
        details: "Opt-out signal detected",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "opt_out_signal",
      });
      // Pause all automation for this lead
      await db
        .from("leads")
        .update({ state: "CLOSED", updated_at: executedAt })
        .eq("id", intelligence.lead_id);

      return {
        action_type: "pause",
        success: true,
        details: "Lead paused due to opt-out signal",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "opt_out_signal",
      };
    }

    if (intelligence.risk_flags.includes("anger") || intelligence.risk_flags.includes("hostile")) {
      await logAutonomousAction({
        action_type: "escalate_human",
        success: true,
        details: "Anger/hostile flag detected",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "anger_or_hostile",
      });
      // Create escalation entry
      try {
        await db.from("escalation_logs").insert({
          lead_id: intelligence.lead_id,
          workspace_id: intelligence.workspace_id,
          reason: "anger_or_hostile",
          created_at: executedAt,
        });
      } catch {
        // Table may not exist yet
      }

      return {
        action_type: "escalate_human",
        success: true,
        details: "Human escalation due to anger/hostile signal",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "anger_or_hostile",
      };
    }

    // 2. Check confidence threshold (after safety flags, so safety always fires)
    if (intelligence.action_confidence < CONFIDENCE_THRESHOLD) {
      await logAutonomousAction({
        action_type: "no_action",
        success: true,
        details: "Confidence below threshold",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "confidence_too_low",
      });
      return {
        action_type: "no_action",
        success: true,
        details: "Confidence below threshold",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "confidence_too_low",
      };
    }

    // 3. Check daily action limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: actionCount } = await db
      .from("autonomous_actions")
      .select("*", { count: "exact", head: true })
      .eq("lead_id", intelligence.lead_id)
      .gte("executed_at", today.toISOString());

    if ((actionCount ?? 0) >= MAX_AUTONOMOUS_ACTIONS_PER_LEAD_PER_DAY) {
      await logAutonomousAction({
        action_type: "no_action",
        success: true,
        details: `Daily limit reached (${MAX_AUTONOMOUS_ACTIONS_PER_LEAD_PER_DAY})`,
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "daily_limit_exceeded",
      });
      return {
        action_type: "no_action",
        success: true,
        details: `Daily limit reached (${MAX_AUTONOMOUS_ACTIONS_PER_LEAD_PER_DAY})`,
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "daily_limit_exceeded",
      };
    }

    // 4. AUTONOMY MODE ENFORCEMENT — respect observe/assist/act
    const simulateOnly = await shouldSimulateOnly(intelligence.workspace_id);
    if (simulateOnly) {
      const simResult: AutonomousActionResult = {
        action_type: intelligence.next_best_action as AutonomousActionType ?? "no_action",
        success: true,
        details: `[OBSERVE MODE] Would execute: ${intelligence.next_best_action} — simulated only`,
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "observe_mode_simulated",
      };
      await logAutonomousAction(simResult);
      return simResult;
    }

    // Check if assist mode requires approval for this action
    const isSensitive = ["book_appointment", "escalate_human", "schedule_call"].includes(intelligence.next_best_action);
    const needsApproval = await shouldRequireApproval(intelligence.workspace_id, intelligence.next_best_action, {
      isSensitive,
    });
    if (needsApproval) {
      // Create approval request instead of executing immediately
      try {
        await db.from("action_intents").insert({
          workspace_id: intelligence.workspace_id,
          intent_type: intelligence.next_best_action,
          payload_json: {
            lead_id: intelligence.lead_id,
            confidence: intelligence.action_confidence,
            reason: intelligence.action_reason,
            risk_flags: intelligence.risk_flags,
            requires_approval: true,
          },
          dedupe_key: `approval:${intelligence.workspace_id}:${intelligence.lead_id}:${intelligence.next_best_action}`,
        });
      } catch {
        // action_intents table may not exist
      }
      const approvalResult: AutonomousActionResult = {
        action_type: intelligence.next_best_action as AutonomousActionType ?? "no_action",
        success: true,
        details: `[ASSIST MODE] Queued for approval: ${intelligence.next_best_action}`,
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "approval_required",
      };
      await logAutonomousAction(approvalResult);
      return approvalResult;
    }

    // 5. Execute the action (mode is "act" or "assist" with non-sensitive action)
    const result = await executeBasedOnAction(intelligence, executedAt);
    await logAutonomousAction(result);

    // 6. AUTO-ADVANCE LEAD STATUS based on successful action
    if (result.success && result.action_type !== "no_action") {
      await autoAdvanceLeadStatus(intelligence, result);
    }

    // 7. Send Slack notification for successful actions (non-blocking, fire-and-forget)
    if (result.success && result.action_type !== "no_action") {
      void notifyWorkspace(intelligence.workspace_id, "autonomous_action", {
        autonomous_action: {
          action: result.action_type,
          leadName: intelligence.lead_id,
          leadId: intelligence.lead_id,
          result: {
            success: result.success,
            details: result.details,
            confidence: intelligence.action_confidence,
          },
        },
      }).catch(() => {
        // Notification error does not affect flow
      });
    }

    return result;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const result: AutonomousActionResult = {
      action_type: "no_action",
      success: false,
      details: `Execution error: ${errMsg}`,
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "execution_error",
    };
    await logAutonomousAction(result);
    return result;
  }
}

/**
 * Execute the specific action based on next_best_action string.
 */
async function executeBasedOnAction(
  intelligence: LeadIntelligence,
  executedAt: string
): Promise<AutonomousActionResult> {
  const db = getDb();
  const action = intelligence.next_best_action;

  // Fetch lead record for contact info
  const { data: leadRow } = await db
    .from("leads")
    .select("phone, email, name, workspace_id")
    .eq("id", intelligence.lead_id)
    .maybeSingle();

  const lead = leadRow as {
    phone?: string;
    email?: string;
    name?: string;
    workspace_id: string;
  } | null;

  if (!lead) {
    return {
      action_type: "no_action",
      success: false,
      details: "Lead not found",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "lead_not_found",
    };
  }

  // SAFETY: Hard opt-out check before any outbound communication
  const outboundActions = ["ask_clarification", "send_proof", "reframe_value", "send_email", "send_sms", "change_channel"];
  if (outboundActions.includes(action)) {
    try {
      const { isOptedOut } = await import("@/lib/lead-opt-out");
      if (await isOptedOut(intelligence.workspace_id, `lead:${intelligence.lead_id}`)) {
        return {
          action_type: action as AutonomousActionType,
          success: false,
          details: "Lead is opted out — action blocked",
          executed_at: executedAt,
          lead_id: intelligence.lead_id,
          workspace_id: intelligence.workspace_id,
          confidence: intelligence.action_confidence,
          reason: "opted_out",
        };
      }
    } catch {
      // opt-out table may not exist — proceed cautiously
    }
  }

  // Map action to execution
  if (action === "ask_clarification") {
    return sendSmsAction(intelligence, lead, executedAt, "ask_clarification");
  }

  if (action === "send_proof") {
    return sendEmailAction(intelligence, lead, executedAt, "send_proof");
  }

  if (action === "reframe_value") {
    return sendSmsAction(intelligence, lead, executedAt, "reframe_value");
  }

  if (action === "book_call" || action === "schedule_call") {
    return scheduleCallAction(intelligence, lead, executedAt);
  }

  if (action === "schedule_followup") {
    return scheduleFollowupAction(intelligence, lead, executedAt);
  }

  if (action === "reactivate_later") {
    return reactivateAction(intelligence, executedAt);
  }

  if (action === "escalate_human") {
    return escalateHumanAction(intelligence, lead, executedAt);
  }

  if (action === "send_email") {
    return sendEmailAction(intelligence, lead, executedAt, "outreach");
  }

  if (action === "send_sms") {
    return sendSmsAction(intelligence, lead, executedAt, "outreach");
  }

  if (action === "monitor_sequence") {
    // Brain decided to let the sequence continue — this is a deliberate decision, not "no_action"
    return {
      action_type: "monitor_sequence",
      success: true,
      details: `Monitoring active sequence — ${intelligence.action_reason}`,
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "sequence_active",
    };
  }

  if (action === "change_channel") {
    // Lead isn't responding on current channel — try a different one
    if (lead.phone) {
      return sendSmsAction(intelligence, lead, executedAt, "channel_switch");
    }
    if (lead.email) {
      return sendEmailAction(intelligence, lead, executedAt, "channel_switch");
    }
    return {
      action_type: "change_channel",
      success: false,
      details: "No alternative channel available (no phone or email)",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "no_channel",
    };
  }

  // Default: no action
  return {
    action_type: "no_action",
    success: true,
    details: `No handler for action: ${action}`,
    executed_at: executedAt,
    lead_id: intelligence.lead_id,
    workspace_id: intelligence.workspace_id,
    confidence: intelligence.action_confidence,
    reason: "unknown_action",
  };
}

/**
 * Send SMS with clarification or reframe template.
 */
async function sendSmsAction(
  intelligence: LeadIntelligence,
  lead: { phone?: string; email?: string; name?: string; workspace_id: string },
  executedAt: string,
  templateKey: string
): Promise<AutonomousActionResult> {
  if (!lead.phone) {
    return {
      action_type: "send_sms",
      success: false,
      details: "No phone number available",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "no_phone",
    };
  }

  try {
    const db = getDb();
    const { data: phoneConfig } = await db
      .from("phone_configs")
      .select("proxy_number")
      .eq("workspace_id", intelligence.workspace_id)
      .eq("status", "active")
      .maybeSingle();

    const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
    if (!fromNumber) {
      return {
        action_type: "send_sms",
        success: false,
        details: "No phone config found",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "no_phone_config",
      };
    }

    const template = getDefaultFollowUpTemplate(templateKey, {
      contact_name: lead.name,
      business_name: "Our team",
    });

    if (!template.sms) {
      return {
        action_type: "send_sms",
        success: false,
        details: "No SMS template found",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "no_template",
      };
    }

    const svc = getTelephonyService();
    const smsResult = await svc.sendSms({
      from: fromNumber,
      to: lead.phone,
      text: template.sms,
    });

    const success = !("error" in smsResult);
    return {
      action_type: "send_sms",
      success,
      details: success ? `SMS sent to ${lead.phone}` : `SMS failed: ${smsResult.error}`,
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: success ? "sent" : "send_failed",
    };
  } catch (err) {
    return {
      action_type: "send_sms",
      success: false,
      details: err instanceof Error ? err.message : "SMS send error",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "exception",
    };
  }
}

/**
 * Send email with proof/value template.
 */
async function sendEmailAction(
  intelligence: LeadIntelligence,
  lead: { phone?: string; email?: string; name?: string; workspace_id: string },
  executedAt: string,
  templateKey: string
): Promise<AutonomousActionResult> {
  if (!lead.email) {
    return {
      action_type: "send_email",
      success: false,
      details: "No email address available",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "no_email",
    };
  }

  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return {
        action_type: "send_email",
        success: false,
        details: "Resend API key not configured",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "no_api_key",
      };
    }

    const template = getDefaultFollowUpTemplate(templateKey, {
      contact_name: lead.name,
      business_name: "Our team",
    });

    if (!template.email_body) {
      return {
        action_type: "send_email",
        success: false,
        details: "No email template found",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "no_template",
      };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
        to: lead.email,
        subject: template.email_subject ?? "Following up",
        text: template.email_body,
      }),
    });

    const success = res.ok;
    return {
      action_type: "send_email",
      success,
      details: success ? `Email sent to ${lead.email}` : `Email send failed: ${res.statusText}`,
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: success ? "sent" : "send_failed",
    };
  } catch (err) {
    return {
      action_type: "send_email",
      success: false,
      details: err instanceof Error ? err.message : "Email send error",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "exception",
    };
  }
}

/**
 * Schedule a call (sets lead plan with schedule_call action).
 */
async function scheduleCallAction(
  intelligence: LeadIntelligence,
  lead: { phone?: string; email?: string; name?: string; workspace_id: string },
  executedAt: string
): Promise<AutonomousActionResult> {
  try {
    const { setLeadPlan } = await import("@/lib/plans/lead-plan");
    const callAt = new Date();
    callAt.setHours(callAt.getHours() + 2); // Schedule 2 hours from now

    await setLeadPlan(intelligence.workspace_id, intelligence.lead_id, {
      next_action_type: "schedule_call",
      next_action_at: callAt.toISOString(),
    });

    return {
      action_type: "schedule_call",
      success: true,
      details: `Call scheduled for ${callAt.toISOString()}`,
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "scheduled",
    };
  } catch (err) {
    return {
      action_type: "schedule_call",
      success: false,
      details: err instanceof Error ? err.message : "Schedule error",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "exception",
    };
  }
}

/**
 * Schedule followup via sequence enrollment or SMS.
 * Uses adaptive follow-up strategy to choose the right approach.
 * Respects recovery profile settings for persistence level customization.
 */
async function scheduleFollowupAction(
  intelligence: LeadIntelligence,
  lead: { phone?: string; email?: string; name?: string; workspace_id: string },
  executedAt: string
): Promise<AutonomousActionResult> {
  try {
    const db = getDb();
    const { enrollContact, createSequence, addSequenceStep } = await import("@/lib/sequences/follow-up-engine");

    // Fetch recovery profile for this workspace
    let recoveryProfile: RecoveryProfile | null = null;
    try {
      recoveryProfile = await getRecoveryProfile(lead.workspace_id);
    } catch (profileErr) {
      // Could not fetch recovery profile, using default (error details omitted to protect PII)
    }

    // Use adaptive follow-up system to choose the right strategy
    let strategy: AdaptiveStrategy | null = null;
    let adaptivePlan = null;
    let chosenStrategyDetails = "";

    try {
      strategy = selectAdaptiveStrategy(intelligence, recoveryProfile ?? undefined);
      adaptivePlan = buildAdaptiveFollowUpPlan(strategy, intelligence, recoveryProfile ?? undefined);
      chosenStrategyDetails = `Adaptive strategy: ${strategy}${recoveryProfile ? ` (${recoveryProfile} recovery)` : ""}`;
      // Adaptive strategy selected (logging omitted to protect PII)
    } catch (strategyErr) {
      // Non-blocking: fall back to default sequence enrollment
      // Adaptive strategy selection failed, falling back to default (error details omitted to protect PII)
    }

    // DEDUP: Check if lead already has an active sequence enrollment
    const { data: activeEnrollment } = await db
      .from("sequence_enrollments")
      .select("id, sequence_id")
      .eq("lead_id", intelligence.lead_id)
      .eq("workspace_id", intelligence.workspace_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (activeEnrollment) {
      const enrollmentData = activeEnrollment as { id: string; sequence_id: string };
      // Lead already enrolled in sequence — skipping duplicate enrollment (logging omitted to protect PII)
      return {
        action_type: "enroll_sequence",
        success: true,
        details: `Already enrolled in sequence ${enrollmentData.sequence_id} — skipped duplicate`,
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "already_enrolled",
      };
    }

    // Find or create a default followup sequence
    const { data: existingSeq } = await db
      .from("sequences")
      .select("id")
      .eq("workspace_id", intelligence.workspace_id)
      .eq("trigger_type", "manual")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    let sequenceId = (existingSeq as { id: string } | null)?.id;

    if (!sequenceId) {
      const newSeq = await createSequence(intelligence.workspace_id, "Auto Followup", "manual");
      sequenceId = newSeq?.id;
    }

    if (!sequenceId) {
      return {
        action_type: "enroll_sequence",
        success: false,
        details: "Could not find or create sequence",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "no_sequence",
      };
    }

    // Ensure sequence has steps — populate from adaptive plan if empty
    const { count: stepCount } = await db
      .from("sequence_steps")
      .select("*", { count: "exact", head: true })
      .eq("sequence_id", sequenceId);

    if ((stepCount ?? 0) === 0 && adaptivePlan && adaptivePlan.steps.length > 0) {
      // Sequence has 0 steps — populating from adaptive plan (logging omitted to protect PII)
      for (const step of adaptivePlan.steps) {
        const channelType = step.channel === "voicemail_drop" ? "call" : step.channel;
        const template = getDefaultFollowUpTemplate(step.template_key ?? "schedule_followup", {
          contact_name: lead.name,
          business_name: "Our team",
        });
        const content = channelType === "email" ? template.email_body : template.sms;
        try {
          await addSequenceStep(
            sequenceId,
            step.order,
            channelType as "sms" | "email" | "call",
            step.delay_minutes,
            content ?? undefined,
            step.condition ? { condition: step.condition } : {}
          );
        } catch {
          // Non-blocking per step
        }
      }
    }

    // Guard: don't enroll in a sequence with zero steps — it creates dead enrollments
    const { count: finalStepCount } = await db
      .from("sequence_steps")
      .select("*", { count: "exact", head: true })
      .eq("sequence_id", sequenceId);

    if ((finalStepCount ?? 0) === 0) {
      log("warn", "autonomous.empty_sequence_skipped", {
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        sequence_id: sequenceId,
      });
      return {
        action_type: "enroll_sequence",
        success: false,
        details: "Sequence has no steps — skipped enrollment to avoid dead sequence",
        executed_at: executedAt,
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        confidence: intelligence.action_confidence,
        reason: "empty_sequence",
      };
    }

    const enrollment = await enrollContact(intelligence.workspace_id, sequenceId, intelligence.lead_id);

    // Safety net: if enrollment was created but next_step_due_at is null (steps weren't
    // readable at enrollment time), set it to NOW so process-sequences picks it up
    if (enrollment) {
      const enrollmentData = enrollment as { id: string; next_step_due_at?: string | null };
      if (!enrollmentData.next_step_due_at) {
        await db
          .from("sequence_enrollments")
          .update({ next_step_due_at: new Date().toISOString() })
          .eq("id", enrollmentData.id);
        // Set next_step_due_at=NOW for enrollment (logging omitted to protect PII)
      }
    }

    // Execute the first adaptive step immediately (don't wait for cron)
    if (adaptivePlan && adaptivePlan.steps && adaptivePlan.steps.length > 0) {
      const firstStep = adaptivePlan.steps[0];
      try {
        if (firstStep.channel === "sms" && lead.phone) {
          const { data: phoneConfig } = await db
            .from("phone_configs")
            .select("proxy_number")
            .eq("workspace_id", intelligence.workspace_id)
            .eq("status", "active")
            .maybeSingle();
          const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
          if (fromNumber) {
            const svc = getTelephonyService();
            const template = getDefaultFollowUpTemplate(firstStep.template_key ?? "schedule_followup", {
              contact_name: lead.name,
              business_name: "Our team",
            });
            if (template.sms) {
              const immSmsResult = await svc.sendSms({ from: fromNumber, to: lead.phone, text: template.sms });
              if ("error" in immSmsResult) {
                log("warn", "autonomous.immediate_sms_failed", { lead_id: intelligence.lead_id, error: immSmsResult.error });
              }
            }
          }
        } else if (firstStep.channel === "email" && lead.email) {
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            const template = getDefaultFollowUpTemplate(firstStep.template_key ?? "schedule_followup", {
              contact_name: lead.name,
              business_name: "Our team",
            });
            if (template.email_body) {
              const immEmailRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
                  to: lead.email,
                  subject: template.email_subject ?? "Following up",
                  text: template.email_body,
                }),
              });
              if (!immEmailRes.ok) {
                log("warn", "autonomous.immediate_email_failed", { lead_id: intelligence.lead_id, status: immEmailRes.status });
              }
            }
          }
        }
      } catch (stepErr) {
        // Non-blocking: sequence enrollment is the safety net
        // Immediate first step failed, sequence will pick up (logging omitted to protect PII)
      }
    }

    return {
      action_type: "enroll_sequence",
      success: !!enrollment,
      details: enrollment
        ? `Enrolled in sequence ${sequenceId}. ${chosenStrategyDetails}`
        : "Enrollment failed",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: enrollment ? "enrolled" : "enrollment_failed",
    };
  } catch (err) {
    return {
      action_type: "enroll_sequence",
      success: false,
      details: err instanceof Error ? err.message : "Enrollment error",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "exception",
    };
  }
}

/**
 * Enqueue reactivation job.
 */
async function reactivateAction(
  intelligence: LeadIntelligence,
  executedAt: string
): Promise<AutonomousActionResult> {
  try {
    await enqueue({
      type: "reactivation",
      leadId: intelligence.lead_id,
    });

    return {
      action_type: "reactivate",
      success: true,
      details: "Reactivation job enqueued",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "enqueued",
    };
  } catch (err) {
    return {
      action_type: "reactivate",
      success: false,
      details: err instanceof Error ? err.message : "Enqueue error",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "exception",
    };
  }
}

/**
 * Escalate to human team member.
 */
async function escalateHumanAction(
  intelligence: LeadIntelligence,
  lead: { phone?: string; email?: string; name?: string; workspace_id: string },
  executedAt: string
): Promise<AutonomousActionResult> {
  try {
    const db = getDb();

    // Create escalation log entry
    try {
      await db.from("escalation_logs").insert({
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        reason: intelligence.action_reason,
        created_at: executedAt,
      });
    } catch {
      // Table may not exist
    }

    // Send notification to workspace owner
    try {
      const { data: ws } = await db
        .from("workspaces")
        .select("owner_id")
        .eq("id", intelligence.workspace_id)
        .maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (ownerId) {
        const { data: user } = await db
          .from("users")
          .select("email")
          .eq("id", ownerId)
          .maybeSingle();
        const ownerEmail = (user as { email?: string } | null)?.email;
        if (ownerEmail) {
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
                to: ownerEmail,
                subject: `[Escalation] ${lead.name ?? "Unknown"} requires attention`,
                text: `Lead: ${lead.name ?? "Unknown"}\nPhone: ${lead.phone ?? "N/A"}\nEmail: ${lead.email ?? "N/A"}\nReason: ${intelligence.action_reason}`,
              }),
            });
          }
        }
      }
    } catch {
      // Non-blocking
    }

    return {
      action_type: "escalate_human",
      success: true,
      details: "Escalation created and owner notified",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "escalated",
    };
  } catch (err) {
    return {
      action_type: "escalate_human",
      success: false,
      details: err instanceof Error ? err.message : "Escalation error",
      executed_at: executedAt,
      lead_id: intelligence.lead_id,
      workspace_id: intelligence.workspace_id,
      confidence: intelligence.action_confidence,
      reason: "exception",
    };
  }
}

/**
 * Auto-advance lead status based on the action the brain just took.
 * This closes the gap where the brain sends SMS/email but the lead stays "NEW".
 *
 * Status progression:
 *   NEW → CONTACTED (after first outreach: sms, email, call)
 *   CONTACTED → ENGAGED (after sequence enrollment or followup)
 *   Any → QUALIFIED (if intent score > 60)
 *   Any → REACTIVATE (on reactivation action)
 *
 * Does NOT downgrade status (e.g., won't move QUALIFIED back to CONTACTED).
 */
async function autoAdvanceLeadStatus(
  intelligence: LeadIntelligence,
  result: AutonomousActionResult
): Promise<void> {
  try {
    const db = getDb();

    // Fetch current lead state
    const { data: leadRow } = await db
      .from("leads")
      .select("state")
      .eq("id", intelligence.lead_id)
      .eq("workspace_id", intelligence.workspace_id)
      .maybeSingle();

    const currentStatus = (leadRow as { state?: string } | null)?.state;
    if (!currentStatus) return;

    // Define status hierarchy (higher index = more advanced)
    const statusOrder = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "BOOKED", "SHOWED", "WON"];
    const currentIdx = statusOrder.indexOf(currentStatus);

    let newStatus: string | null = null;

    // Determine new status based on action
    if (["send_sms", "send_email", "schedule_call"].includes(result.action_type)) {
      // First outreach → CONTACTED
      if (currentStatus === "NEW") {
        newStatus = "CONTACTED";
      }
    }

    if (["enroll_sequence", "schedule_callback"].includes(result.action_type)) {
      // Active followup engagement → ENGAGED
      if (currentIdx < statusOrder.indexOf("ENGAGED")) {
        newStatus = "ENGAGED";
      }
    }

    if (result.action_type === "book_appointment") {
      // Booking action → BOOKED
      if (currentIdx < statusOrder.indexOf("BOOKED")) {
        newStatus = "BOOKED";
      }
    }

    if (result.action_type === "reactivate") {
      // Reactivation → REACTIVATE (special status, not in hierarchy)
      if (["LOST", "CLOSED"].includes(currentStatus)) {
        newStatus = "REACTIVATE";
      }
    }

    // Score-based qualification: if intent > 60, advance to QUALIFIED
    if (
      intelligence.intent_score > 60 &&
      currentIdx < statusOrder.indexOf("QUALIFIED") &&
      currentIdx >= 0
    ) {
      newStatus = "QUALIFIED";
    }

    // Only advance if there's a new status to set
    if (newStatus && newStatus !== currentStatus) {
      await db
        .from("leads")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", intelligence.lead_id)
        .eq("workspace_id", intelligence.workspace_id);

      log("info", "autonomous.lead_status_advanced", {
        lead_id: intelligence.lead_id,
        workspace_id: intelligence.workspace_id,
        from: currentStatus,
        to: newStatus,
        trigger_action: result.action_type,
      });
    }
  } catch (err) {
    // Non-fatal — status advancement is best-effort
    log("warn", "autonomous.status_advance_failed", {
      lead_id: intelligence.lead_id,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

/**
 * Log autonomous action to database (non-blocking).
 */
export async function logAutonomousAction(result: AutonomousActionResult): Promise<void> {
  try {
    const db = getDb();
    await db.from("autonomous_actions").insert({
      lead_id: result.lead_id,
      workspace_id: result.workspace_id,
      action_type: result.action_type,
      success: result.success,
      details: result.details,
      confidence: result.confidence,
      reason: result.reason,
      executed_at: result.executed_at,
    });
  } catch (err) {
    log("error", "autonomous.log_failed", { lead_id: result.lead_id, action_type: result.action_type, error: (err as Error)?.message ?? String(err) });
  }
}
