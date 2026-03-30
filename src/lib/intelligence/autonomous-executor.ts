/**
 * Autonomous Executor — Takes LeadIntelligence and autonomously executes the recommended action.
 * Safety-first: checks confidence, risk flags, and daily limits before taking any action.
 */

import { getDb } from "@/lib/db/queries";
import type { LeadIntelligence } from "./lead-brain";
import { getTelephonyService } from "@/lib/telephony";
import { getDefaultFollowUpTemplate } from "./outcome-followup-router";
import { selectAdaptiveStrategy, buildAdaptiveFollowUpPlan, type AdaptiveStrategy } from "./adaptive-followup";
import { enqueue } from "@/lib/queue";

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
        .update({ status: "CLOSED", updated_at: executedAt })
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

    // 4. Map next_best_action to AutonomousActionType and execute
    const result = await executeBasedOnAction(intelligence, executedAt);
    // Don't log dedup skips — they're noise (every 2min cron cycle)
    if (result.reason !== "already_enrolled") {
      await logAutonomousAction(result);
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
 */
async function scheduleFollowupAction(
  intelligence: LeadIntelligence,
  lead: { phone?: string; email?: string; name?: string; workspace_id: string },
  executedAt: string
): Promise<AutonomousActionResult> {
  try {
    const db = getDb();
    const { enrollContact, createSequence } = await import("@/lib/sequences/follow-up-engine");

    // Use adaptive follow-up system to choose the right strategy
    let strategy: AdaptiveStrategy | null = null;
    let adaptivePlan = null;
    let chosenStrategyDetails = "";

    try {
      strategy = selectAdaptiveStrategy(intelligence);
      adaptivePlan = buildAdaptiveFollowUpPlan(strategy, intelligence);
      chosenStrategyDetails = `Adaptive strategy: ${strategy}`;
      console.log(
        `[autonomous-executor] Selected adaptive strategy for lead ${intelligence.lead_id}: ${strategy}`
      );
    } catch (strategyErr) {
      // Non-blocking: fall back to default sequence enrollment
      console.warn(
        `[autonomous-executor] Adaptive strategy selection failed, falling back to default:`,
        strategyErr instanceof Error ? strategyErr.message : String(strategyErr)
      );
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
      console.log(
        `[autonomous-executor] Lead ${intelligence.lead_id} already enrolled in sequence ${enrollmentData.sequence_id} — skipping duplicate enrollment`
      );
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

    const enrollment = await enrollContact(intelligence.workspace_id, sequenceId, intelligence.lead_id);

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
              await svc.sendSms({ from: fromNumber, to: lead.phone, text: template.sms });
              console.log(`[autonomous-executor] Immediate SMS sent to lead ${intelligence.lead_id} (adaptive first step)`);
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
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                  from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
                  to: lead.email,
                  subject: template.email_subject ?? "Following up",
                  text: template.email_body,
                }),
              });
              console.log(`[autonomous-executor] Immediate email sent to lead ${intelligence.lead_id} (adaptive first step)`);
            }
          }
        }
      } catch (stepErr) {
        // Non-blocking: sequence enrollment is the safety net
        console.warn(`[autonomous-executor] Immediate first step failed, sequence will pick up:`, stepErr instanceof Error ? stepErr.message : String(stepErr));
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
  } catch {
    // Non-blocking: table may not exist yet
  }
}
