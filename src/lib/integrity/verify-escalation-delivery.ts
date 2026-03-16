/**
 * Escalation delivery guarantee: ensure handoff is eventually notified.
 * If escalation has no acknowledgement and no repeat scheduled within retry window, enqueue handoff_notify again.
 */

import { getDb } from "@/lib/db/queries";
import { isHandoffAcknowledged } from "@/lib/delivery-assurance/handoff-ack";
import { enqueue } from "@/lib/queue";

const RETRY_WINDOW_MINUTES = 10;

/**
 * After notifyHandoff runs, verify the escalation will be retried if not acknowledged.
 * If no ack and no pending handoff_notify job for this escalation, enqueue one.
 */
export async function verifyEscalationDeliverable(escalationId: string): Promise<void> {
  if (await isHandoffAcknowledged(escalationId)) return;

  const db = getDb();
  const { data: esc } = await db
    .from("escalation_logs")
    .select("id, workspace_id, lead_id, escalation_reason, notified_at")
    .eq("id", escalationId)
    .maybeSingle();
  if (!esc) return;

  const { workspace_id, lead_id, escalation_reason } = esc as {
    id: string;
    workspace_id: string;
    lead_id: string;
    escalation_reason?: string;
  };

  const cutoff = new Date();
  cutoff.setMinutes(cutoff.getMinutes() - RETRY_WINDOW_MINUTES);
  const cutoffIso = cutoff.toISOString();

  const { data: pending } = await db
    .from("job_queue")
    .select("id, payload")
    .eq("job_type", "handoff_notify")
    .in("status", ["pending", "processing"])
    .gte("created_at", cutoffIso)
    .limit(100);

  const hasPendingForThisEscalation = (pending ?? []).some(
    (row: { payload?: { escalationId?: string } }) => (row.payload as { escalationId?: string })?.escalationId === escalationId
  );
  if (hasPendingForThisEscalation) return;

  await enqueue({
    type: "handoff_notify",
    escalationId,
    workspaceId: workspace_id,
    leadId: lead_id,
    decisionNeeded: escalation_reason ?? "Decision needed",
  });
}
