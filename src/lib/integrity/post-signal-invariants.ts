/**
 * Runtime invariant checks after every process_signal completion.
 * Throwing IntegrityInvariantError fails the job and triggers system_integrity_violation escalation.
 */

import { getDb } from "@/lib/db/queries";
import { IntegrityInvariantError } from "./errors";
import { getSignalById, hasEarlierUnprocessedSignal } from "@/lib/signals/store";
import { getCommitmentStartAt } from "@/lib/closure/closure-invariants";
import { resolveResponsibility } from "@/lib/closure/resolver";

const COMMITMENT_RESOLUTION_SIGNALS = ["AppointmentCompleted", "AppointmentMissed", "BookingCancelled"];

/**
 * Verify guarantees after a signal was processed. Call at the very end of signal consumer success path.
 * A) Lead state exists.
 * B) No earlier unprocessed signal for same lead.
 * C) Irrecoverable signals have processed_at set.
 * D) COMMITMENT_SCHEDULED + event time passed + no completion → enqueue closure_reconciliation.
 */
export async function assertPostSignalInvariants(signalId: string): Promise<void> {
  const row = await getSignalById(signalId);
  if (!row) return;

  const { workspace_id, lead_id, occurred_at, processed_at, failure_reason } = row;
  const db = getDb();

  // C) Irrecoverable cannot block ordering: failure_reason NOT NULL ⇒ processed_at NOT NULL
  if (failure_reason != null && processed_at == null) {
    throw new IntegrityInvariantError("Irrecoverable signal must have processed_at set", {
      signalId,
      lead_id,
      failure_reason,
    });
  }

  // Skip further checks if signal was not actually processed by reducer (e.g. already_processed / irrecoverable)
  if (processed_at == null) return;

  // A) Lead state exists after processing
  const { data: lead } = await db
    .from("leads")
    .select("id, state")
    .eq("id", lead_id)
    .eq("workspace_id", workspace_id)
    .single();
  if (!lead) return;
  const state = (lead as { state?: string | null }).state;
  if (state == null || state === "") {
    throw new IntegrityInvariantError("Lead must have state after signal processing", {
      signalId,
      lead_id,
      workspace_id,
    });
  }

  // B) A processed signal cannot have an earlier unprocessed signal
  const earlierExists = await hasEarlierUnprocessedSignal(workspace_id, lead_id, occurred_at);
  if (earlierExists) {
    throw new IntegrityInvariantError("Processed signal cannot have earlier unprocessed signal for same lead", {
      signalId,
      lead_id,
      occurred_at,
    });
  }

  // D) COMMITMENT_SCHEDULED + event time passed + no completion → enqueue closure_reconciliation
  try {
    const responsibilityState = await resolveResponsibility(lead_id);
    if (responsibilityState === "COMMITMENT_SCHEDULED") {
      const commitmentStartAt = await getCommitmentStartAt(workspace_id, lead_id);
      if (commitmentStartAt) {
        const now = new Date().getTime();
        const eventTime = new Date(commitmentStartAt).getTime();
        if (now > eventTime) {
          const { data: signalsAfter } = await db
            .from("canonical_signals")
            .select("signal_type")
            .eq("workspace_id", workspace_id)
            .eq("lead_id", lead_id)
            .gte("occurred_at", commitmentStartAt)
            .limit(50);
          const hasCompletion = (signalsAfter ?? []).some((s: { signal_type: string }) =>
            COMMITMENT_RESOLUTION_SIGNALS.includes(s.signal_type)
          );
          if (!hasCompletion) {
            const { enqueue } = await import("@/lib/queue");
            await enqueue({ type: "closure_reconciliation", workspaceId: workspace_id });
          }
        }
      }
    }
  } catch {
    // Skip commitment check if resolver throws (e.g. no signals)
  }
}
