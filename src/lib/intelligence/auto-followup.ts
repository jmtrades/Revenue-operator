/**
 * Auto Follow-up Orchestrator
 * Triggered after every call ends. Reads the outcome, determines the follow-up,
 * and either enrolls in a sequence or triggers immediate action.
 *
 * This is the "zero manual intervention" brain.
 */

import { getDb } from "@/lib/db/queries";
import type { OutcomeType } from "@/lib/intelligence/outcome-taxonomy";
import { routeOutcomeToFollowUp, getDefaultFollowUpTemplate } from "@/lib/intelligence/outcome-followup-router";
import type { FollowUpRouting } from "@/lib/intelligence/outcome-followup-router";

export interface AutoFollowUpResult {
  action_taken: string;
  success: boolean;
  details?: string;
  enrollment_id?: string;
}

/**
 * Main entry point: process a completed call and trigger automatic follow-up.
 * Called from post-call webhook after outcome is determined.
 */
export async function triggerAutoFollowUp(params: {
  workspace_id: string;
  lead_id: string;
  call_session_id: string;
  outcome: OutcomeType;
  sentiment?: "positive" | "neutral" | "negative";
  duration_seconds?: number;
  appointment_time?: string;
  callback_requested_time?: string;
}): Promise<AutoFollowUpResult> {
  const db = getDb();

  try {
    // Check if auto-followup is enabled for this workspace (default: enabled)
    const { data: wsRow } = await db
      .from("workspaces")
      .select("auto_followup_enabled, name")
      .eq("id", params.workspace_id)
      .maybeSingle();

    const wsData = wsRow as { auto_followup_enabled?: boolean; name?: string } | null;
    // Default to enabled if column doesn't exist
    if (wsData?.auto_followup_enabled === false) {
      return { action_taken: "skipped", success: true, details: "Auto follow-up disabled for workspace" };
    }

    // Check if lead has opted out
    const { data: leadRow } = await db
      .from("leads")
      .select("state, phone, email, name, metadata")
      .eq("id", params.lead_id)
      .maybeSingle();

    const lead = leadRow as { state?: string; phone?: string; email?: string; name?: string; metadata?: Record<string, unknown> } | null;
    if (!lead) {
      return { action_taken: "skipped", success: false, details: "Lead not found" };
    }
    if (lead.state === "CLOSED" || lead.state === "LOST") {
      return { action_taken: "skipped", success: true, details: "Lead opted out — no follow-up" };
    }

    // BRAIN-FIRST: If fresh brain intelligence exists, let the autonomous executor handle it.
    // The brain was just recomputed in the post-call route, so intelligence should be fresh.
    try {
      const { getLeadIntelligence } = await import("@/lib/intelligence/lead-brain");
      const intel = await getLeadIntelligence(params.workspace_id, params.lead_id);
      if (intel && intel.action_confidence >= 0.5) {
        // Brain has a confident recommendation — execute autonomously
        const { executeAutonomousAction } = await import("@/lib/intelligence/autonomous-executor");
        await executeAutonomousAction(intel);
        return {
          action_taken: `brain:${intel.next_best_action}`,
          success: true,
          details: `Brain-driven: ${intel.next_best_action} (confidence ${(intel.action_confidence * 100).toFixed(0)}%, timing: ${intel.action_timing})`,
        };
      }
    } catch {
      // Brain unavailable — fall through to legacy routing
    }

    // LEGACY FALLBACK: Static outcome routing when brain has no confident recommendation
    const { count: previousCalls } = await db
      .from("call_sessions")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", params.workspace_id)
      .eq("lead_id", params.lead_id)
      .not("call_ended_at", "is", null);
    const isExisting = (previousCalls ?? 0) > 1;

    // Route the outcome
    const routing = routeOutcomeToFollowUp(params.outcome, {
      duration_seconds: params.duration_seconds,
      sentiment: params.sentiment,
      appointment_time: params.appointment_time,
      callback_requested_time: params.callback_requested_time,
      is_existing_customer: isExisting,
      attempt_count: previousCalls ?? 0,
    });

    // Execute the routing
    return await executeFollowUpRouting(params, routing, lead, wsData?.name ?? "Our team");
  } catch (err) {
    // Error in auto-followup (error details omitted to protect PII)
    return { action_taken: "error", success: false, details: "Auto-followup error" };
  }
}

async function executeFollowUpRouting(
  params: {
    workspace_id: string;
    lead_id: string;
    call_session_id: string;
    outcome: OutcomeType;
    appointment_time?: string;
    callback_requested_time?: string;
  },
  routing: FollowUpRouting,
  lead: { phone?: string; email?: string; name?: string; metadata?: Record<string, unknown> },
  businessName: string,
): Promise<AutoFollowUpResult> {
  const db = getDb();

  // Handle do_not_contact immediately
  if (routing.action === "do_not_contact") {
    await db
      .from("leads")
      .update({ state: "CLOSED", updated_at: new Date().toISOString() })
      .eq("id", params.lead_id);
    // Cancel all active enrollments
    const { pauseOnLeadReply } = await import("@/lib/sequences/follow-up-engine");
    await pauseOnLeadReply(params.workspace_id, params.lead_id, "opted_out");
    return { action_taken: "do_not_contact", success: true, details: "Lead removed from all sequences" };
  }

  // Handle none
  if (routing.action === "none") {
    return { action_taken: "none", success: true, details: "No follow-up needed" };
  }

  // Handle escalation
  if (routing.action === "escalate_to_human") {
    // Send notification email to workspace owner
    try {
      const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", params.workspace_id).maybeSingle();
      const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
      if (ownerId) {
        const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
        const ownerEmail = (user as { email?: string } | null)?.email;
        if (ownerEmail) {
          const templates = getDefaultFollowUpTemplate(routing.message_template_key, {
            business_name: businessName,
            contact_name: lead.name,
          });
          // Send alert email to owner
          const resendKey = process.env.RESEND_API_KEY;
          if (resendKey && templates.email_body) {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
                to: ownerEmail,
                subject: `[Action Required] ${routing.message_template_key.replace(/_/g, " ")} — ${lead.name ?? lead.phone ?? "Unknown"}`,
                text: `A call requires your attention.\n\nCaller: ${lead.name ?? "Unknown"} (${lead.phone ?? "no phone"})\nOutcome: ${params.outcome}\nPriority: ${routing.priority}\n\nNotes: ${routing.notes}`,
      signal: AbortSignal.timeout(10_000),
              }),
            });
          }
        }
      }
    } catch {
      // Non-blocking
    }
    return { action_taken: "escalate_to_human", success: true, details: "Human escalation triggered" };
  }

  // SAFETY: Check opt-out before any outbound lead communication
  const outboundActions = ["send_immediate_sms", "send_follow_up_email", "retry_call", "schedule_callback"];
  if (outboundActions.includes(routing.action) || routing.action.startsWith("enroll_")) {
    try {
      const { isOptedOut } = await import("@/lib/lead-opt-out");
      if (await isOptedOut(params.workspace_id, `lead:${params.lead_id}`)) {
        return { action_taken: "skipped", success: true, details: "Lead is opted out — outbound action blocked" };
      }
    } catch {
      // opt-out table may not exist — proceed cautiously
    }
  }

  // Handle immediate SMS
  if (routing.action === "send_immediate_sms" && lead.phone) {
    try {
      const template = getDefaultFollowUpTemplate(routing.message_template_key, {
        business_name: businessName,
        contact_name: lead.name,
        appointment_time: params.appointment_time,
      });
      if (template.sms) {
        const { data: phoneConfig } = await db
          .from("phone_configs")
          .select("proxy_number")
          .eq("workspace_id", params.workspace_id)
          .eq("status", "active")
          .maybeSingle();
        const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
        if (fromNumber) {
          const { getTelephonyService } = await import("@/lib/telephony");
          const svc = getTelephonyService();
          await svc.sendSms({ from: fromNumber, to: lead.phone, text: template.sms });
          return { action_taken: "send_immediate_sms", success: true, details: `SMS sent to ${lead.phone}` };
        }
      }
    } catch (err) {
      // Error sending SMS (error details omitted to protect PII)
    }
    return { action_taken: "send_immediate_sms", success: false, details: "SMS send failed" };
  }

  // Handle follow-up email
  if (routing.action === "send_follow_up_email" && lead.email) {
    try {
      const template = getDefaultFollowUpTemplate(routing.message_template_key, {
        business_name: businessName,
        contact_name: lead.name,
      });
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey && template.email_body) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL ?? "noreply@recall-touch.com",
            to: lead.email,
            subject: template.email_subject ?? `Following up — ${businessName}`,
            text: template.email_body,
          }),
        });
        if (res.ok) {
          return { action_taken: "send_follow_up_email", success: true, details: `Email sent to ${lead.email}` };
        }
      }
    } catch (err) {
      // Error sending email (error details omitted to protect PII)
    }
    return { action_taken: "send_follow_up_email", success: false, details: "Email send failed" };
  }

  // Handle retry call
  if (routing.action === "retry_call") {
    // Schedule a follow-up call by creating a lead plan entry
    try {
      const { setLeadPlan } = await import("@/lib/plans/lead-plan");
      const retryAt = new Date();
      retryAt.setMinutes(retryAt.getMinutes() + routing.delay_minutes);
      await setLeadPlan(params.workspace_id, params.lead_id, {
        next_action_type: "retry_call",
        next_action_at: retryAt.toISOString(),
      });
      // Also send a "we tried calling" SMS if they have a phone
      if (lead.phone) {
        try {
          const template = getDefaultFollowUpTemplate("retry_call", {
            business_name: businessName,
            contact_name: lead.name,
          });
          if (template.sms) {
            const { data: phoneConfig } = await db
              .from("phone_configs")
              .select("proxy_number")
              .eq("workspace_id", params.workspace_id)
              .eq("status", "active")
              .maybeSingle();
            const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
            if (fromNumber) {
              const { getTelephonyService } = await import("@/lib/telephony");
              const svc = getTelephonyService();
              await svc.sendSms({ from: fromNumber, to: lead.phone, text: template.sms });
            }
          }
        } catch {
          // Non-blocking
        }
      }
      return { action_taken: "retry_call", success: true, details: `Retry scheduled for ${retryAt.toISOString()}` };
    } catch {
      return { action_taken: "retry_call", success: false, details: "Failed to schedule retry" };
    }
  }

  // Handle schedule_callback
  if (routing.action === "schedule_callback") {
    try {
      const { setLeadPlan } = await import("@/lib/plans/lead-plan");
      const callbackAt = params.callback_requested_time
        ? new Date(params.callback_requested_time)
        : new Date(Date.now() + routing.delay_minutes * 60 * 1000);
      await setLeadPlan(params.workspace_id, params.lead_id, {
        next_action_type: "scheduled_callback",
        next_action_at: callbackAt.toISOString(),
      });
      // Send confirmation SMS
      if (lead.phone) {
        try {
          const template = getDefaultFollowUpTemplate("callback_scheduled", {
            business_name: businessName,
            contact_name: lead.name,
            callback_time: callbackAt.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
          });
          if (template.sms) {
            const { data: phoneConfig } = await db
              .from("phone_configs")
              .select("proxy_number")
              .eq("workspace_id", params.workspace_id)
              .eq("status", "active")
              .maybeSingle();
            const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
            if (fromNumber) {
              const { getTelephonyService } = await import("@/lib/telephony");
              const svc = getTelephonyService();
              await svc.sendSms({ from: fromNumber, to: lead.phone, text: template.sms });
            }
          }
        } catch {
          // Non-blocking
        }
      }
      return { action_taken: "schedule_callback", success: true, details: `Callback scheduled for ${callbackAt.toISOString()}` };
    } catch {
      return { action_taken: "schedule_callback", success: false, details: "Failed to schedule callback" };
    }
  }

  // Handle sequence enrollments (nurture, hot lead, revival, appointment reminder)
  if (routing.action.startsWith("enroll_")) {
    try {
      // Map action to sequence trigger type
      const triggerMap: Record<string, string> = {
        enroll_nurture_sequence: "new_lead",
        enroll_hot_lead_sequence: "new_lead",
        enroll_revival_sequence: "dormant_contact",
        enroll_appointment_reminder: "quote_sent",
      };
      const triggerType = triggerMap[routing.action] ?? "manual";

      // Find or create appropriate sequence
      const { data: existingSeq } = await db
        .from("follow_up_sequences")
        .select("id")
        .eq("workspace_id", params.workspace_id)
        .eq("trigger_type", triggerType)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      let sequenceId = (existingSeq as { id: string } | null)?.id;

      if (!sequenceId) {
        // Auto-create a default sequence for this trigger type
        const { createSequence, addSequenceStep } = await import("@/lib/sequences/follow-up-engine");
        const seqName = routing.action.replace("enroll_", "").replace(/_/g, " ");
        const newSeq = await createSequence(params.workspace_id, `Auto: ${seqName}`, triggerType);
        if (newSeq) {
          sequenceId = newSeq.id;
          // Add default steps based on routing
          if (routing.channel === "multi" || routing.channel === "sms") {
            await addSequenceStep(sequenceId, 1, "sms", routing.delay_minutes,
              getDefaultFollowUpTemplate(routing.message_template_key, { business_name: businessName, contact_name: lead.name }).sms);
          }
          if (routing.channel === "multi" || routing.channel === "email") {
            const emailTemplate = getDefaultFollowUpTemplate(routing.message_template_key, { business_name: businessName, contact_name: lead.name });
            await addSequenceStep(sequenceId, routing.channel === "multi" ? 2 : 1, "email",
              routing.channel === "multi" ? 1440 : routing.delay_minutes,
              emailTemplate.email_body);
          }
          // Add a final call step for multi-channel sequences
          if (routing.channel === "multi" && routing.max_attempts > 1) {
            await addSequenceStep(sequenceId, 3, "call", 2880); // Call after 48h
          }
        }
      }

      if (sequenceId) {
        const { enrollContact } = await import("@/lib/sequences/follow-up-engine");
        const enrollment = await enrollContact(params.workspace_id, sequenceId, params.lead_id);
        if (enrollment) {
          return {
            action_taken: routing.action,
            success: true,
            enrollment_id: enrollment.id,
            details: `Enrolled in sequence ${sequenceId}`,
          };
        }
      }

      return { action_taken: routing.action, success: false, details: "Could not find or create sequence" };
    } catch (err) {
      // Error in enrollment (error details omitted to protect PII)
      return { action_taken: routing.action, success: false, details: "Enrollment failed" };
    }
  }

  return { action_taken: "unknown", success: false, details: "Unhandled routing action" };
}
