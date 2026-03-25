/**
 * Emit reconciliation-discovered signals. Idempotent insert + enqueue process_signal only.
 * No direct state mutation.
 */

import { insertSignal } from "@/lib/signals/store";
import { reconciliationIdempotencyKey } from "@/lib/signals/types";
import type { CanonicalSignalType } from "@/lib/signals/types";
import { enqueue } from "@/lib/queue";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";

const RECON_SOURCE = "reconciliation";
const RECON_SCHEMA_VERSION = 1;

function nowIso(): string {
  return new Date().toISOString();
}

function withReconMeta<T extends Record<string, unknown>>(payload: T): T & { source: string; schema_version: number; discovered_at: string } {
  return { ...payload, source: RECON_SOURCE, schema_version: RECON_SCHEMA_VERSION, discovered_at: nowIso() };
}

/**
 * Emit a discovered signal: insert canonical signal (idempotent), then enqueue process_signal.
 * Returns signalId. On duplicate insert we still enqueue so consumer can run (replay-safe).
 */
export async function emitDiscoveredSignal(
  workspaceId: string,
  leadId: string,
  signalType: "InboundMessageDiscovered" | "BookingModified" | "BookingCancelled" | "AppointmentCompleted" | "AppointmentMissed" | "HumanReplyDiscovered" | "PaymentCaptured" | "RefundIssued",
  payload: Record<string, unknown>
): Promise<string | null> {
  const withMeta = withReconMeta(payload);
  const idempotency_key = reconciliationIdempotencyKey(signalType, withMeta);
  const occurred_at = (payload.occurred_at ?? payload.received_at ?? payload.sent_at ?? payload.completed_at ?? payload.missed_at ?? payload.cancelled_at ?? payload.captured_at ?? payload.refunded_at ?? payload.new_start_at ?? nowIso()) as string;

  return runWithWriteContextAsync("reconciliation", async () => {
    const result = await insertSignal({
      workspace_id: workspaceId,
      lead_id: leadId,
      signal_type: signalType as CanonicalSignalType,
      idempotency_key,
      payload: withMeta,
      occurred_at,
    });

    if (result.inserted && result.id) {
      await enqueue({ type: "process_signal", signalId: result.id });
      return result.id;
    }
    if (!result.inserted) {
      const { getSignalByKey } = await import("@/lib/signals/store");
      const existing = await getSignalByKey(idempotency_key);
      if (existing) {
        if (existing.failure_reason != null) {
          return existing.id;
        }
        await enqueue({ type: "process_signal", signalId: existing.id });
      }
      return existing?.id ?? null;
    }
    return null;
  });
}
