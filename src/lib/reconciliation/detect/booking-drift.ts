/**
 * Booking drift: find calendar events that are cancelled or start_at changed.
 * Read-only; yields BookingCancelled / BookingModified candidates.
 */

import { getDb } from "@/lib/db/queries";
import { getCalendarProvider } from "../providers/calendar";

const START_DRIFT_MINUTES = 5;
const HORIZON_HOURS = 48;

export interface BookingDriftCandidate {
  type: "BookingCancelled" | "BookingModified";
  workspace_id: string;
  lead_id: string;
  payload: Record<string, unknown>;
}

export async function detectBookingDrift(workspaceId: string): Promise<BookingDriftCandidate[]> {
  const db = getDb();
  const provider = getCalendarProvider();
  const out: BookingDriftCandidate[] = [];

  const from = new Date().toISOString();
  const to = new Date(Date.now() + HORIZON_HOURS * 60 * 60 * 1000).toISOString();
  const { data: callSessions } = await db
    .from("call_sessions")
    .select("id, lead_id, workspace_id, external_event_id, started_at, call_started_at")
    .eq("workspace_id", workspaceId)
    .not("external_event_id", "is", null)
    .not("lead_id", "is", null)
    .limit(100);

  if (!callSessions?.length) return [];

  for (const row of callSessions as { id: string; lead_id: string; workspace_id: string; external_event_id: string; started_at?: string; call_started_at?: string }[]) {
    if (row.workspace_id !== workspaceId || !row.lead_id) continue;
    const event = await provider.getEvent({ workspaceId, external_event_id: row.external_event_id });
    if (!event.exists) {
      out.push({
        type: "BookingCancelled",
        workspace_id: workspaceId,
        lead_id: row.lead_id,
        payload: {
          provider: "calendar",
          booking_id: row.id,
          external_event_id: row.external_event_id,
          cancelled_at: new Date().toISOString(),
          discovered_at: new Date().toISOString(),
          source: "reconciliation",
          schema_version: 1,
        },
      });
      continue;
    }
    if (event.cancelled) {
      out.push({
        type: "BookingCancelled",
        workspace_id: workspaceId,
        lead_id: row.lead_id,
        payload: {
          provider: "calendar",
          booking_id: row.id,
          external_event_id: row.external_event_id,
          cancelled_at: event.updated_at ?? new Date().toISOString(),
          discovered_at: new Date().toISOString(),
          source: "reconciliation",
          schema_version: 1,
        },
      });
      continue;
    }
    const storedStart = row.call_started_at ?? row.started_at;
    if (event.start_at && storedStart) {
      const stored = new Date(storedStart).getTime();
      const actual = new Date(event.start_at).getTime();
      if (Math.abs(actual - stored) >= START_DRIFT_MINUTES * 60 * 1000) {
        out.push({
          type: "BookingModified",
          workspace_id: workspaceId,
          lead_id: row.lead_id,
          payload: {
            provider: "calendar",
            booking_id: row.id,
            external_event_id: row.external_event_id,
            previous_start_at: storedStart,
            new_start_at: event.start_at,
            discovered_at: new Date().toISOString(),
            source: "reconciliation",
            schema_version: 1,
          },
        });
      }
    }
  }
  return out;
}
