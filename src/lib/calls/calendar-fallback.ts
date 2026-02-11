/**
 * Calendar-only post-call fallback: create call_session from calendar event,
 * match lead, then run conservative follow-up when no transcript exists.
 */

import { getDb } from "@/lib/db/queries";
import { matchCallToLead } from "@/lib/zoom/call-to-lead";

export interface CalendarEventPayload {
  workspace_id: string;
  external_event_id: string;
  title?: string;
  start_at: string;
  end_at: string;
  status?: string;
  attendees?: Array<{ email?: string; name?: string }>;
  meeting_link?: string;
  meeting_link_domain?: string;
}

function meetingLinkDomain(link: string | undefined): string | undefined {
  if (!link) return undefined;
  try {
    const u = new URL(link);
    return u.hostname;
  } catch {
    return undefined;
  }
}

/**
 * Create or get call_session for a calendar event. Idempotent by (workspace_id, external_event_id).
 */
export async function ensureCallSessionFromCalendarEvent(
  payload: CalendarEventPayload
): Promise<{ call_session_id: string; lead_id: string | null }> {
  const db = getDb();
  const domain = payload.meeting_link_domain ?? meetingLinkDomain(payload.meeting_link);
  const attendeeEmails = (payload.attendees ?? []).map((a) => a.email).filter((e): e is string => Boolean(e));
  const attendeeNames = (payload.attendees ?? []).map((a) => a.name).filter((n): n is string => Boolean(n));

  const match = await matchCallToLead(payload.workspace_id, {
    participantEmails: attendeeEmails,
    participantNames: attendeeNames,
  });

  const { data: existing } = await db
    .from("call_sessions")
    .select("id, lead_id, matched_lead_id")
    .eq("workspace_id", payload.workspace_id)
    .eq("external_event_id", payload.external_event_id)
    .single();

  if (existing) {
    const row = existing as { id: string; lead_id?: string | null; matched_lead_id?: string | null };
    return {
      call_session_id: row.id,
      lead_id: row.lead_id ?? row.matched_lead_id ?? match.lead_id,
    };
  }

  const leadId = match.lead_id ?? null;
  const { data: inserted } = await db
    .from("call_sessions")
    .insert({
      workspace_id: payload.workspace_id,
      lead_id: leadId,
      external_event_id: payload.external_event_id,
      provider: "calendar",
      matched_lead_id: match.lead_id,
      matched_confidence: match.confidence,
      call_started_at: payload.start_at,
      call_ended_at: payload.end_at,
      show_status: "unknown",
      show_confidence: 0.3,
      show_reason: "calendar_fallback_no_signal",
      metadata: {
        title: payload.title,
        start_at: payload.start_at,
        end_at: payload.end_at,
        attendees: payload.attendees,
        meeting_link_domain: domain,
      },
      outcome: null,
      transcript: [],
    })
    .select("id")
    .single();

  const id = (inserted as { id: string } | null)?.id;
  if (!id) throw new Error("Failed to create call_session");

  return { call_session_id: id, lead_id: leadId };
}
