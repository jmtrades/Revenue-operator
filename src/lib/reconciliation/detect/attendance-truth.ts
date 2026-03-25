/**
 * Attendance truth: find appointments in window that have no AppointmentCompleted/Missed signal.
 * Use provider evidence (calendar status / zoom) to yield AppointmentCompleted or AppointmentMissed.
 * Read-only; no guess when evidence unavailable.
 */

import { getDb } from "@/lib/db/queries";
import { getCalendarProvider } from "../providers/calendar";

const PAST_HOURS = 6;
const FUTURE_HOURS = 1;

export interface AttendanceCandidate {
  type: "AppointmentCompleted" | "AppointmentMissed";
  workspace_id: string;
  lead_id: string;
  payload: Record<string, unknown>;
}

export async function detectAttendanceTruth(workspaceId: string): Promise<AttendanceCandidate[]> {
  const db = getDb();
  const provider = getCalendarProvider();
  const out: AttendanceCandidate[] = [];

  const from = new Date(Date.now() - PAST_HOURS * 60 * 60 * 1000).toISOString();
  const to = new Date(Date.now() + FUTURE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: sessions } = await db
    .from("call_sessions")
    .select("id, lead_id, external_event_id, started_at, call_started_at, show_status, call_ended_at")
    .eq("workspace_id", workspaceId)
    .not("lead_id", "is", null)
    .limit(100);

  if (!sessions?.length) return [];

  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  for (const row of sessions as { id: string; lead_id: string; external_event_id: string | null; started_at?: string; call_started_at?: string; show_status?: string; call_ended_at?: string | null }[]) {
    const rowStart = row.call_started_at ?? row.started_at;
    if (!row.lead_id || !rowStart) continue;
    const rowStartTime = new Date(rowStart).getTime();
    if (rowStartTime < fromTime || rowStartTime > toTime) continue;
    const { data: payloads } = await db
      .from("canonical_signals")
      .select("payload")
      .eq("workspace_id", workspaceId)
      .eq("lead_id", row.lead_id)
      .in("signal_type", ["AppointmentCompleted", "AppointmentMissed"])
      .gte("occurred_at", from)
      .limit(50);
    const alreadyHasProofForBooking = (payloads ?? []).some(
      (r: { payload?: { booking_id?: string } }) => (r.payload as { booking_id?: string })?.booking_id === row.id
    );
    if (alreadyHasProofForBooking) continue;

    const now = new Date();
    const scheduled = new Date(rowStart);
    if (scheduled > now) continue;

    const event = row.external_event_id ? await provider.getEvent({ workspaceId, external_event_id: row.external_event_id }) : { exists: false };
    const evidenceAttended = row.show_status === "showed" || !!row.call_ended_at || (event.exists && (event as { status?: string }).status === "completed");
    const evidenceMissed = row.show_status === "no_show" || (event.exists && (event as { status?: string }).status === "cancelled") || (!row.call_ended_at && scheduled.getTime() < now.getTime() - 30 * 60 * 1000);

    const completedAt = row.call_ended_at ?? (scheduled.getTime() < now.getTime() ? now.toISOString() : null);
    const missedAt = scheduled.getTime() < now.getTime() ? now.toISOString() : null;

    if (evidenceAttended && completedAt) {
      out.push({
        type: "AppointmentCompleted",
        workspace_id: workspaceId,
        lead_id: row.lead_id,
        payload: {
          provider: "calendar",
          booking_id: row.id,
          external_event_id: row.external_event_id ?? undefined,
          completed_at: completedAt,
          discovered_at: new Date().toISOString(),
          evidence: row.call_ended_at ? "join_logs" : "attendance_flag",
          source: "reconciliation",
          schema_version: 1,
        },
      });
    } else if (evidenceMissed && missedAt) {
      out.push({
        type: "AppointmentMissed",
        workspace_id: workspaceId,
        lead_id: row.lead_id,
        payload: {
          provider: "calendar",
          booking_id: row.id,
          external_event_id: row.external_event_id ?? undefined,
          missed_at: missedAt,
          discovered_at: new Date().toISOString(),
          evidence: !row.call_ended_at ? "no_join" : "no_show_flag",
          source: "reconciliation",
          schema_version: 1,
        },
      });
    }
  }
  return out;
}
