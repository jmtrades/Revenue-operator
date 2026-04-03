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
import { log } from "@/lib/logger";

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
    // Note: no_show detection is checked in runMeetingAwareCheck after querying appointments table
    // This function returns post_meeting; caller responsibility to refine based on appointment outcome
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

    // SAFETY: Check opt-out before any outbound communication to lead
    try {
      const { isOptedOut } = await import("@/lib/lead-opt-out");
      if (await isOptedOut(context.workspace_id, `lead:${context.lead_id}`)) {
        return { success: false, details: "Lead is opted out — meeting action blocked" };
      }
    } catch {
      // opt-out table may not exist — proceed cautiously
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
        signal: AbortSignal.timeout(10_000),
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

      let phase = detectMeetingPhase(context);

      // If meeting is past end time, check if there's a recorded outcome in appointments table
      if (phase === "post_meeting") {
        const { data: appointmentData } = await db
          .from("appointments")
          .select("metadata, status")
          .eq("workspace_id", workspaceId)
          .eq("lead_id", session.lead_id)
          .gte("start_time", new Date(new Date(session.scheduled_for).getTime() - 60 * 60 * 1000).toISOString())
          .lte("start_time", new Date(new Date(session.scheduled_for).getTime() + 60 * 60 * 1000).toISOString())
          .maybeSingle();

        const appointment = appointmentData as {
          metadata?: Record<string, unknown>;
          status?: string;
        } | null;

        // Check if outcome was recorded
        if (appointment?.metadata && typeof appointment.metadata === "object") {
          const outcomeKey = "outcome" in appointment.metadata ? appointment.metadata.outcome : null;
          if (outcomeKey === "no_show") {
            phase = "no_show";
          } else if (outcomeKey === "cancelled") {
            phase = "cancelled";
          } else if (outcomeKey === "rescheduled") {
            phase = "rescheduled";
          }
        } else if (appointment?.status === "no_show") {
          phase = "no_show";
        }
      }

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
    // Assumes google_calendar_tokens table with workspace_id, access_token, refresh_token
    const { data: calTokens } = await db
      .from("google_calendar_tokens")
      .select("id, access_token, refresh_token, expires_at, workspace_id")
      .eq("workspace_id", workspaceId)
      .limit(5);

    const tokens = (calTokens ?? []) as Array<{
      id: string;
      access_token?: string | null;
      refresh_token?: string | null;
      expires_at?: string | null;
      workspace_id: string;
    }>;

    for (const tokenRow of tokens) {
      // Skip if no access token
      if (!tokenRow.access_token) continue;

      // Check if token is expired (with 60s buffer)
      let accessToken = tokenRow.access_token;
      if (tokenRow.expires_at) {
        const expiresAt = new Date(tokenRow.expires_at).getTime();
        const now = Date.now();
        const bufferMs = 60 * 1000; // 60 seconds

        if (now >= expiresAt - bufferMs) {
          // Token expired — attempt refresh if we have refresh_token
          if (tokenRow.refresh_token) {
            try {
              const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
              const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

              if (clientId && clientSecret) {
                const body = new URLSearchParams({
                  client_id: clientId,
                  client_secret: clientSecret,
                  refresh_token: tokenRow.refresh_token,
                  grant_type: "refresh_token",
                });

                const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded" },
                  body: body.toString(),
                  signal: AbortSignal.timeout(15_000),
                });

                if (refreshRes.ok) {
                  const refreshData = (await refreshRes.json()) as {
                    access_token?: string;
                    expires_in?: number;
                  };

                  if (refreshData.access_token) {
                    accessToken = refreshData.access_token;
                    const newExpires = refreshData.expires_in
                      ? new Date(Date.now() + refreshData.expires_in * 1000).toISOString()
                      : null;

                    await db
                      .from("google_calendar_tokens")
                      .update({
                        access_token: accessToken,
                        expires_at: newExpires,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", tokenRow.id);
                  }
                }
              }
            } catch (err) {
              // Google Calendar token refresh error (details omitted to protect PII)
              // Continue with expired token — Google API will reject it
              continue;
            }
          } else {
            // No refresh token, skip this calendar
            continue;
          }
        }
      }

      // Fetch events from Google Calendar API
      try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const eventsRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events?" +
            new URLSearchParams({
              timeMin: now.toISOString(),
              timeMax: thirtyDaysFromNow.toISOString(),
              maxResults: "250",
              singleEvents: "true",
              orderBy: "startTime",
            }),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            signal: AbortSignal.timeout(15_000),
          }
        );

        if (eventsRes.status === 401 || eventsRes.status === 403) {
          // Token invalid/expired — skip and continue (details omitted to protect PII)
          continue;
        }

        if (!eventsRes.ok) {
          log("warn",
            `[meeting-aware] Google Calendar fetch failed: ${eventsRes.status}`,
            { detail: await eventsRes.text().catch(() => "") }
          );
          continue;
        }

        const eventsData = (await eventsRes.json()) as {
          items?: Array<{
            id?: string;
            summary?: string;
            start?: { dateTime?: string; date?: string };
            end?: { dateTime?: string; date?: string };
            status?: string;
            attendees?: Array<{ email?: string; displayName?: string }>;
          }>;
        };

        const events = eventsData.items ?? [];

        // Process each event for meeting-aware actions
        for (const event of events) {
          if (!event.id || !event.summary || event.status === "cancelled") continue;

          const startTime = event.start?.dateTime || event.start?.date;
          if (!startTime) continue;

          // Try to match event to a lead via attendees
          let eventLeadId: string | null = null;
          if (event.attendees && event.attendees.length > 0) {
            for (const attendee of event.attendees) {
              if (!attendee.email) continue;

              const { data: leadRow } = await db
                .from("leads")
                .select("id")
                .eq("workspace_id", workspaceId)
                .eq("email", attendee.email)
                .maybeSingle();

              if (leadRow) {
                eventLeadId = (leadRow as { id: string }).id;
                break;
              }
            }
          }

          if (!eventLeadId) continue; // Skip if we can't match to a lead

          // Build context from calendar event
          const eventContext: MeetingContext = {
            lead_id: eventLeadId,
            workspace_id: workspaceId,
            meeting_id: event.id,
            scheduled_at: startTime,
            duration_minutes: event.end
              ? Math.round(
                  (new Date(event.end.dateTime || event.end.date || startTime).getTime() -
                    new Date(startTime).getTime()) /
                    (60 * 1000)
                )
              : 30,
            meeting_type: "video",
            attendee_name: event.summary,
          };

          const eventPhase = detectMeetingPhase(eventContext);
          const eventDecision = decideMeetingAction(eventPhase, eventContext);

          if (eventDecision.action !== "none") {
            if (eventDecision.timing === "immediate") {
              const result = await executeMeetingAction(eventDecision, eventContext);
              if (result.success) actionsExecuted++;
            } else if (eventDecision.scheduled_for) {
              await enqueue({
                type: "no_show_reminder",
                leadId: eventLeadId,
              });
              actionsExecuted++;
            }
          }
        }
      } catch (err) {
        // Google Calendar fetch error for token (details omitted to protect PII)
        // Continue with next token — don't block the entire check
      }
    }

    return { checked, actions: actionsExecuted };
  } catch (err) {
    // Error in meeting-aware check (error details omitted to protect PII)
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
