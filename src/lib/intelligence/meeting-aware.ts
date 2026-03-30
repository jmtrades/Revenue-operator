/**
 * Meeting-Aware Execution Layer
 * Triggers autonomous actions based on calendar events, meeting outcomes, and appointment lifecycle.
 * Deterministic, rule-based scheduling and recovery flows.
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { triggerAutoFollowUp } from "@/lib/intelligence/auto-followup";
import type { LeadIntelligence } from "@/lib/intelligence/lead-brain";
import { computeLeadIntelligence } from "@/lib/intelligence/lead-brain";

export type MeetingPhase =
  | "pre_meeting"
  | "meeting_active"
  | "post_meeting"
  | "no_show"
  | "cancelled"
  | "rescheduled";

export type MeetingAction =
  | "send_reminder"
  | "send_prep_materials"
  | "send_confirmation"
  | "detect_no_show"
  | "trigger_post_meeting_followup"
  | "trigger_no_show_recovery"
  | "trigger_reschedule_request"
  | "trigger_cancellation_recovery"
  | "update_lead_state"
  | "none";

export interface MeetingContext {
  lead_id: string;
  workspace_id: string;
  meeting_id?: string;
  scheduled_at: string;
  duration_minutes?: number;
  meeting_type?: "call" | "video" | "in_person";
  attendee_name?: string;
  attendee_email?: string;
  attendee_phone?: string;
}

export interface MeetingDecision {
  phase: MeetingPhase;
  action: MeetingAction;
  timing: "immediate" | "scheduled";
  scheduled_for?: string;
  channel: "sms" | "email" | "call";
  template_key: string;
  reason: string;
}

/**
 * Detect current meeting phase from scheduled_at and duration.
 * Pure function — no I/O.
 */
export function detectMeetingPhase(context: MeetingContext): MeetingPhase {
  const now = new Date();
  const scheduledAt = new Date(context.scheduled_at);
  const durationMs = (context.duration_minutes ?? 30) * 60 * 1000;
  const meetingEndTime = new Date(scheduledAt.getTime() + durationMs);

  // Past end time → either post_meeting or no_show
  if (now > meetingEndTime) {
    // TODO: check attendance flag from call_sessions or zoom logs
    // For now, classify as post_meeting; no_show detection happens in followup
    return "post_meeting";
  }

  // Within meeting window
  if (now >= scheduledAt && now < meetingEndTime) {
    return "meeting_active";
  }

  // Before meeting
  if (now < scheduledAt) {
    return "pre_meeting";
  }

  return "pre_meeting";
}

/**
 * Decide action based on phase and context.
 * Pure function — no I/O.
 */
export function decideMeetingAction(
  phase: MeetingPhase,
  context: MeetingContext,
  intelligence?: LeadIntelligence | null
): MeetingDecision {
  const now = new Date();
  const scheduledAt = new Date(context.scheduled_at);
  const hoursUntilMeeting = (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Pre-meeting phase: schedule reminders/prep based on time delta
  if (phase === "pre_meeting") {
    // >24h: send confirmation
    if (hoursUntilMeeting > 24) {
      return {
        phase,
        action: "send_confirmation",
        timing: "scheduled",
        scheduled_for: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1h from now
        channel: "email",
        template_key: "meeting_confirmation",
        reason: "Confirmation email for upcoming meeting",
      };
    }

    // 2-4h: send SMS reminder
    if (hoursUntilMeeting >= 2 && hoursUntilMeeting <= 4) {
      return {
        phase,
        action: "send_reminder",
        timing: "immediate",
        channel: "sms",
        template_key: "meeting_reminder_sms",
        reason: "2-4 hour pre-meeting reminder",
      };
    }

    // 30min-2h: send prep materials
    if (hoursUntilMeeting > 0.5 && hoursUntilMeeting < 2) {
      return {
        phase,
        action: "send_prep_materials",
        timing: "immediate",
        channel: "email",
        template_key: "meeting_prep_materials",
        reason: "Last-minute prep materials",
      };
    }

    return {
      phase,
      action: "none",
      timing: "scheduled",
      channel: "email",
      template_key: "none",
      reason: "No action needed in this time window",
    };
  }

  // Active meeting: no action (meeting in progress)
  if (phase === "meeting_active") {
    return {
      phase,
      action: "none",
      timing: "scheduled",
      channel: "email",
      template_key: "none",
      reason: "Meeting is active",
    };
  }

  // Post-meeting: trigger follow-up
  if (phase === "post_meeting") {
    return {
      phase,
      action: "trigger_post_meeting_followup",
      timing: "scheduled",
      scheduled_for: new Date(now.getTime() + 30 * 60 * 1000).toISOString(), // 30 min after
      channel: "email",
      template_key: "post_meeting_followup",
      reason: "Post-meeting follow-up (30 min after meeting end)",
    };
  }

  // No-show: immediate recovery
  if (phase === "no_show") {
    return {
      phase,
      action: "trigger_no_show_recovery",
      timing: "immediate",
      channel: "sms",
      template_key: "no_show_recovery",
      reason: "Lead did not attend scheduled meeting — immediate recovery",
    };
  }

  // Cancelled/Rescheduled: recovery flows
  if (phase === "cancelled") {
    return {
      phase,
      action: "trigger_cancellation_recovery",
      timing: "scheduled",
      scheduled_for: new Date(now.getTime() + 60 * 60 * 1000).toISOString(), // 1h after cancellation
      channel: "sms",
      template_key: "cancellation_recovery",
      reason: "Lead cancelled meeting — recovery flow",
    };
  }

  if (phase === "rescheduled") {
    return {
      phase,
      action: "send_confirmation",
      timing: "immediate",
      channel: "sms",
      template_key: "reschedule_confirmation",
      reason: "Confirm rescheduled meeting time",
    };
  }

  return {
    phase,
    action: "none",
    timing: "scheduled",
    channel: "email",
    template_key: "none",
    reason: "Unknown phase",
  };
}

/**
 * Execute the decided meeting action.
 * Handles SMS, email, and state updates.
 */
export async function executeMeetingAction(
  decision: MeetingDecision,
  context: MeetingContext
): Promise<{ success: boolean; details: string }> {
  const db = getDb();

  try {
    // Fetch lead contact info
    const { data: leadRow } = await db
      .from("leads")
      .select("phone, email, name")
      .eq("id", context.lead_id)
      .maybeSingle();

    const lead = leadRow as { phone?: string; email?: string; name?: string } | null;
    if (!lead) {
      return { success: false, details: "Lead not found" };
    }

    // SMS actions
    if (decision.channel === "sms" && lead.phone) {
      const { data: phoneConfig } = await db
        .from("phone_configs")
        .select("proxy_number")
        .eq("workspace_id", context.workspace_id)
        .eq("status", "active")
        .maybeSingle();

      const fromNumber = (phoneConfig as { proxy_number?: string } | null)?.proxy_number;
      if (!fromNumber) {
        return { success: false, details: "No active phone config" };
      }

      // Build SMS body from template
      const smsBody = buildSmsTemplate(decision.template_key, {
        name: lead.name ?? context.attendee_name,
        meeting_type: context.meeting_type,
        scheduled_at: context.scheduled_at,
      });

      const { getTelephonyService } = await import("@/lib/telephony");
      const svc = getTelephonyService();
      await svc.sendSms({ from: fromNumber, to: lead.phone, text: smsBody });

      return { success: true, details: `SMS sent to ${lead.phone}` };
    }

    // Email actions
    if (decision.channel === "email" && lead.email) {
      const emailBody = buildEmailTemplate(decision.template_key, {
        name: lead.name ?? context.attendee_name,
        meeting_type: context.meeting_type,
        scheduled_at: context.scheduled_at,
      });

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return { success: false, details: "Resend API key not configured" };
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
          subject: buildEmailSubject(decision.template_key),
          text: emailBody,
        }),
      });

      if (!res.ok) {
        return { success: false, details: `Email send failed: ${res.statusText}` };
      }

      return { success: true, details: `Email sent to ${lead.email}` };
    }

    // State updates (for post_meeting, no_show, etc.)
    if (decision.action === "update_lead_state") {
      await db
        .from("leads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", context.lead_id);
      return { success: true, details: "Lead state updated" };
    }

    return { success: true, details: `Action ${decision.action} handled` };
  } catch (err) {
    return {
      success: false,
      details: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Periodic check: scan all upcoming meetings and execute due actions.
 * Triggered by cron or event.
 */
export async function runMeetingAwareCheck(workspaceId: string): Promise<{ checked: number; actions: number }> {
  const db = getDb();
  let checked = 0;
  let actionsExecuted = 0;

  try {
    // Query upcoming call_sessions
    const now = new Date();
    const futureWindow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const { data: callSessions } = await db
      .from("call_sessions")
      .select("id, lead_id, scheduled_for, duration_seconds")
      .eq("workspace_id", workspaceId)
      .gte("scheduled_for", now.toISOString())
      .lte("scheduled_for", futureWindow.toISOString())
      .is("call_ended_at", null);

    const sessions = (callSessions ?? []) as Array<{
      id: string;
      lead_id: string;
      scheduled_for?: string;
      duration_seconds?: number;
    }>;

    checked += sessions.length;

    for (const session of sessions) {
      if (!session.scheduled_for || !session.lead_id) continue;

      const context: MeetingContext = {
        lead_id: session.lead_id,
        workspace_id: workspaceId,
        meeting_id: session.id,
        scheduled_at: session.scheduled_for,
        duration_minutes: (session.duration_seconds ?? 30 * 60) / 60,
        meeting_type: "call",
      };

      const phase = detectMeetingPhase(context);
      const decision = decideMeetingAction(phase, context);

      if (decision.action !== "none") {
        // For scheduled actions, enqueue them; for immediate, execute directly
        if (decision.timing === "immediate") {
          const result = await executeMeetingAction(decision, context);
          if (result.success) actionsExecuted++;
        } else if (decision.scheduled_for) {
          // Enqueue as a scheduled job
          await enqueue({
            type: "no_show_reminder",
            leadId: session.lead_id,
          });
          actionsExecuted++;
        }
      }
    }

    // Query Google Calendar events (optional integration)
    // Assumes google_calendar_tokens table with workspace_id, calendar_id, refresh_token
    const { data: calTokens } = await db
      .from("google_calendar_tokens")
      .select("id, calendar_id, workspace_id")
      .eq("workspace_id", workspaceId)
      .limit(5);

    const tokens = (calTokens ?? []) as Array<{ id: string; calendar_id?: string; workspace_id: string }>;
    for (const token of tokens) {
      // TODO: fetch events from Google Calendar API
      // For now, skip Google Calendar integration
    }

    return { checked, actions: actionsExecuted };
  } catch (err) {
    console.error(
      "[meeting-aware] runMeetingAwareCheck error:",
      err instanceof Error ? err.message : String(err)
    );
    return { checked, actions: actionsExecuted };
  }
}

/**
 * Template builders — deterministic, no AI.
 */
function buildSmsTemplate(
  key: string,
  data: { name?: string; meeting_type?: string; scheduled_at?: string }
): string {
  const date = data.scheduled_at ? new Date(data.scheduled_at).toLocaleString() : "soon";
  const name = data.name ?? "there";

  switch (key) {
    case "meeting_confirmation":
      return `Hi ${name}, confirming your ${data.meeting_type ?? "call"} scheduled for ${date}. Reply STOP to cancel.`;
    case "meeting_reminder_sms":
      return `${name}, reminder: your ${data.meeting_type ?? "call"} is coming up at ${date}. Talk soon!`;
    case "meeting_prep_materials":
      return `${name}, here are your prep materials for the call at ${date}. Check email for details.`;
    case "no_show_recovery":
      return `Hi ${name}, we missed you on our call. Let's reschedule — reply with your availability.`;
    case "cancellation_recovery":
      return `${name}, sorry to see you had to cancel. When works better for you?`;
    case "reschedule_confirmation":
      return `${name}, your call is now scheduled for ${date}. See you then!`;
    default:
      return `Hi ${name}, we have an update about your meeting.`;
  }
}

function buildEmailTemplate(
  key: string,
  data: { name?: string; meeting_type?: string; scheduled_at?: string }
): string {
  const date = data.scheduled_at ? new Date(data.scheduled_at).toLocaleString() : "soon";
  const name = data.name ?? "there";

  switch (key) {
    case "meeting_confirmation":
      return `Hi ${name},\n\nThis is to confirm your ${data.meeting_type ?? "call"} scheduled for ${date}.\n\nLooking forward to speaking with you.\n\nBest regards`;
    case "meeting_prep_materials":
      return `Hi ${name},\n\nHere are the materials to help you prepare for our call at ${date}.\n\nPlease review before we connect.\n\nBest regards`;
    case "post_meeting_followup":
      return `Hi ${name},\n\nThank you for taking the time to meet with us. We'll follow up soon with next steps.\n\nBest regards`;
    case "no_show_recovery":
      return `Hi ${name},\n\nWe missed you on our scheduled call. We'd still love to connect — please let us know your availability.\n\nBest regards`;
    default:
      return `Hi ${name},\n\nWe have an update about your meeting. Please check your email or SMS for details.\n\nBest regards`;
  }
}

function buildEmailSubject(key: string): string {
  switch (key) {
    case "meeting_confirmation":
      return "Confirming Your Upcoming Call";
    case "meeting_reminder_sms":
      return "Quick Reminder: Your Call is Today";
    case "meeting_prep_materials":
      return "Prep Materials for Your Call";
    case "post_meeting_followup":
      return "Thank You for Meeting With Us";
    case "no_show_recovery":
      return "Let's Reschedule";
    case "cancellation_recovery":
      return "When Can We Connect?";
    case "reschedule_confirmation":
      return "Your New Meeting Time";
    default:
      return "Meeting Update";
  }
}
