/**
 * Structured server-side logging for revenue lifecycle events.
 * Output is JSON so log aggregators can index by event type and workspace_id.
 * No PII in logs; use opaque ids only.
 */

export type RevenueEvent =
  | { event: "lead_created"; workspace_id: string; lead_id: string; source?: string }
  | { event: "appointment_booked"; workspace_id: string; appointment_id?: string; source?: string }
  | { event: "call_ended"; workspace_id: string; call_id: string; outcome?: string };

function logEvent(payload: RevenueEvent): void {
  try {
    console.log(JSON.stringify({ ...payload, ts: new Date().toISOString() }));
  } catch {
    // avoid logging failures breaking the request
  }
}

export function logLeadCreated(workspaceId: string, leadId: string, source?: string): void {
  logEvent({ event: "lead_created", workspace_id: workspaceId, lead_id: leadId, source: source ?? "app" });
}

export function logAppointmentBooked(workspaceId: string, appointmentId?: string, source?: string): void {
  logEvent({ event: "appointment_booked", workspace_id: workspaceId, appointment_id: appointmentId, source: source ?? "app" });
}

export function logCallEnded(workspaceId: string, callId: string, outcome?: string): void {
  logEvent({ event: "call_ended", workspace_id: workspaceId, call_id: callId, outcome });
}
