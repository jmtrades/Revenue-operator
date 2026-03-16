/**
 * Signal Layer — Single canonical signal consumer (enforcement wall).
 * processed_at is set only after reducer + persistence complete. Lead lock failure leaves signal unprocessed and retryable.
 * Guarantees: no lead without state, bounded reality drift, demonstrable correctness.
 */

import { getDb } from "@/lib/db/queries";
import { getSignalById, setSignalProcessed, hasEarlierUnprocessedSignal } from "./store";
import { acquireLeadLock, releaseLeadLock } from "./lead-lock";
import { reduceLeadState } from "@/lib/state/reducer";
import { leadStateToLifecycle, lifecycleToLeadState } from "@/lib/state/types";
import { getOperatorsForState } from "@/lib/operators/contracts";
import { selectAllowedActions } from "@/lib/state-machine";
import { enqueue, enqueueDecision } from "@/lib/queue";
import { recordProof } from "@/lib/proof/record";
import { createCommitment, resolveCommitmentsBySubject } from "@/lib/commitment-recovery";
import { updateOnCustomerMessage, onCustomerReply } from "@/lib/opportunity-recovery";
import { ensureSharedTransactionForSubject, updateCounterpartyReliance } from "@/lib/shared-transaction-assurance";
import type { CanonicalSignalType } from "./types";

/** Thrown when lead lock cannot be acquired; signal remains unprocessed and job should fail so retry runs. */
export class LeadLockedRetryError extends Error {
  constructor(public readonly signalId: string) {
    super("lead_locked_retry");
    this.name = "LeadLockedRetryError";
  }
}

/** Thrown when an earlier unprocessed signal exists for the same lead; strict occurred_at order required. */
export class EarlierSignalPendingError extends Error {
  constructor(public readonly signalId: string) {
    super("earlier_signal_pending");
    this.name = "EarlierSignalPendingError";
  }
}

/**
 * Process one canonical signal: acquire lead lock → state reducer → persist → set processed_at at end.
 * If processed_at already set, skip. If lead lock fails, re-enqueue process_signal and throw so job is retried.
 */
export async function processCanonicalSignal(signalId: string): Promise<{ ok: boolean; reason?: string }> {
  const row = await getSignalById(signalId);
  if (!row) {
    return { ok: false, reason: "signal_not_found" };
  }
  if (row.processed_at) {
    return { ok: true, reason: "already_processed" };
  }
  if (row.failure_reason != null) {
    await setSignalProcessed(signalId);
    return { ok: true, reason: "irrecoverable" };
  }

  const db = getDb();
  const { workspace_id, lead_id, signal_type, payload, occurred_at } = row;

  const locked = await acquireLeadLock(lead_id);
  if (!locked) {
    await enqueue({ type: "process_signal", signalId });
    throw new LeadLockedRetryError(signalId);
  }

  const earlierExists = await hasEarlierUnprocessedSignal(workspace_id, lead_id, occurred_at);
  if (earlierExists) {
    await enqueue({ type: "process_signal", signalId });
    throw new EarlierSignalPendingError(signalId);
  }

  try {
    const { data: lead } = await db
      .from("leads")
      .select("id, state")
      .eq("id", lead_id)
      .eq("workspace_id", workspace_id)
      .maybeSingle();
    if (!lead) {
      try {
        const { toFailedJobAndEscalate } = await import("@/lib/delivery-assurance/dlq-handoff");
        await toFailedJobAndEscalate({
          workspaceId: workspace_id,
          leadId: null,
          jobType: "process_signal",
          payload: { signalId, signal_type, payload },
          errorMessage: "lead_not_found",
          stage: "signal",
        });
      } catch {
        // non-blocking
      }
      return { ok: false, reason: "lead_not_found" };
    }

    if (signal_type === "InboundMessageDiscovered") {
      const p = (payload ?? {}) as { conversation_id?: string; provider_message_id?: string; body?: string; received_at?: string };
      const { data: conv } = await db.from("conversations").select("id").eq("lead_id", lead_id).limit(1).maybeSingle();
      if (conv) {
        const convId = (conv as { id: string }).id;
        const { data: existing } = await db
          .from("messages")
          .select("id")
          .eq("conversation_id", convId)
          .eq("metadata->>external_id", p.provider_message_id ?? "")
          .maybeSingle();
        if (!existing) {
          await db.from("messages").insert({
            conversation_id: convId,
            role: "user",
            content: p.body ?? "",
            created_at: p.received_at ?? occurred_at,
            metadata: { external_id: p.provider_message_id, source: "reconciliation" },
          });
        }
      }
    }

    if (signal_type === "HumanReplyDiscovered") {
      const p = (payload ?? {}) as { conversation_id?: string; provider_message_id?: string; body?: string; sent_at?: string };
      const { data: conv } = await db.from("conversations").select("id").eq("lead_id", lead_id).limit(1).maybeSingle();
      if (conv) {
        const convId = (conv as { id: string }).id;
        const { data: existing } = await db
          .from("messages")
          .select("id")
          .eq("conversation_id", convId)
          .eq("metadata->>external_id", p.provider_message_id ?? "")
          .maybeSingle();
        if (existing) {
          await db.from("messages").update({ approved_by_human: true }).eq("id", (existing as { id: string }).id);
        } else {
          await db.from("messages").insert({
            conversation_id: convId,
            role: "assistant",
            content: p.body ?? "",
            created_at: p.sent_at ?? occurred_at,
            metadata: { external_id: p.provider_message_id, source: "reconciliation" },
            approved_by_human: true,
          });
        }
        const { data: escalations } = await db
          .from("escalation_logs")
          .select("id")
          .eq("lead_id", lead_id)
          .lt("created_at", p.sent_at ?? occurred_at);
        const { recordHandoffAcknowledgement } = await import("@/lib/delivery-assurance/handoff-ack");
        for (const e of escalations ?? []) {
          await recordHandoffAcknowledgement((e as { id: string }).id, "human_reply");
        }
      }
    }

    const currentLifecycle = leadStateToLifecycle((lead as { state: string }).state);
    const signalForReducer = { signal_type, payload: payload ?? {}, occurred_at };
    const nextLifecycle = reduceLeadState(currentLifecycle, signalForReducer);
    const leadStatePersisted = lifecycleToLeadState(nextLifecycle);

    await db
      .from("leads")
      .update({
        state: leadStatePersisted,
        last_activity_at: occurred_at,
        last_signal_occurred_at: occurred_at,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead_id)
      .eq("workspace_id", workspace_id);

  const allowedActions = selectAllowedActions(leadStatePersisted as import("@/lib/types").LeadState);
  await db.from("automation_states").upsert(
    {
      lead_id,
      state: leadStatePersisted,
      allowed_actions: allowedActions,
      last_event_type: mapSignalToEventType(signal_type),
      last_event_at: occurred_at,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "lead_id" }
  );

  try {
    const { syncFromLeadState } = await import("@/lib/revenue-lifecycle/sync");
    await syncFromLeadState(lead_id, workspace_id, leadStatePersisted as import("@/lib/types").LeadState);
  } catch {
    // Non-blocking
  }

  if (signal_type === "InboundMessageReceived" || signal_type === "CustomerReplied" || signal_type === "InboundMessageDiscovered") {
    if (currentLifecycle === "NEW" && nextLifecycle === "ENGAGED") {
      await recordProof({
        workspace_id,
        lead_id,
        proof_type: "LeadReceived",
        operator_id: "CAPTURE_OPERATOR",
        signal_id: signalId,
        state_before: "NEW",
        state_after: "ENGAGED",
      });
    }
    const { data: leadContact } = await db.from("leads").select("email, phone").eq("id", lead_id).eq("workspace_id", workspace_id).maybeSingle();
    const counterpartyId = (leadContact as { email?: string | null; phone?: string | null } | null)?.email
      ?? (leadContact as { phone?: string | null } | null)?.phone;
    if (counterpartyId) {
      updateCounterpartyReliance(workspace_id, counterpartyId, "interaction").catch(() => {});
    }
    const { data: convRow } = await db.from("conversations").select("id").eq("lead_id", lead_id).limit(1).maybeSingle();
    if (convRow) {
      const convId = (convRow as { id: string }).id;
      await resolveCommitmentsBySubject(workspace_id, "conversation", convId, "completed");
      updateOnCustomerMessage(workspace_id, convId).catch(() => {});
      onCustomerReply(workspace_id, convId).catch(() => {});
    }
    const allowed = getOperatorsForState(leadStatePersisted as import("@/lib/types").LeadState);
    if (allowed.length > 0) {
      await enqueueDecision(lead_id, workspace_id, signalId);
    }
  }

  if (nextLifecycle === "BOOKED" && currentLifecycle !== "BOOKED") {
    await db.from("events").insert({
      workspace_id,
      event_type: "booking_created",
      entity_type: "lead",
      entity_id: lead_id,
      payload: (payload ?? {}) as Record<string, unknown>,
      trigger_source: "signal",
    });
    const { notifyBookingOwnership, notifyBookingShortly } = await import("@/lib/operational-transfer/notify");
    const { data: leadRow } = await db.from("leads").select("name, email, phone").eq("id", lead_id).maybeSingle();
    const leadName = (leadRow as { name?: string } | null)?.name ?? undefined;
    const slotAt = (payload as { slot_at?: string; start_at?: string } | undefined)?.slot_at ?? (payload as { start_at?: string })?.start_at;
    notifyBookingOwnership(workspace_id, lead_id, { leadName, slotAt }).catch(() => {});
    if (slotAt) {
      const slotTime = new Date(slotAt).getTime();
      const twoHoursFromNow = Date.now() + 2 * 60 * 60 * 1000;
      if (slotTime <= twoHoursFromNow && slotTime >= Date.now()) {
        notifyBookingShortly(workspace_id).catch(() => {});
      }
      createCommitment(workspace_id, "booking", lead_id, new Date(slotAt)).catch(() => {});
      const counterparty = (leadRow as { email?: string | null; phone?: string | null } | null)?.email
        ?? (leadRow as { phone?: string | null } | null)?.phone
        ?? "";
      if (counterparty) {
        const { data: convRow } = await db.from("conversations").select("id").eq("lead_id", lead_id).limit(1).maybeSingle();
        ensureSharedTransactionForSubject({
          workspaceId: workspace_id,
          subjectType: "booking",
          subjectId: lead_id,
          counterpartyIdentifier: counterparty,
          deadlineAt: new Date(slotTime),
          initiatedBy: "business",
          leadId: lead_id,
          conversationId: (convRow as { id: string } | null)?.id ?? undefined,
        }).catch(() => {});
      }
    }
  }

  if (nextLifecycle === "ATTENDED" && (currentLifecycle === "BOOKED" || currentLifecycle === "SCHEDULED")) {
    await recordProof({
      workspace_id,
      lead_id,
      proof_type: currentLifecycle === "BOOKED" ? "NewBooking" : "RepeatVisit",
      operator_id: "ATTENDANCE_OPERATOR",
      signal_id: signalId,
      state_before: currentLifecycle,
      state_after: "ATTENDED",
    });
    await resolveCommitmentsBySubject(workspace_id, "booking", lead_id, "completed");
  }

  if (signal_type === "AppointmentMissed") {
    await resolveCommitmentsBySubject(workspace_id, "booking", lead_id, "failed");
  }
  if (signal_type === "BookingCancelled") {
    await resolveCommitmentsBySubject(workspace_id, "booking", lead_id, "cancelled");
  }

  await setSignalProcessed(signalId);
  const { assertPostSignalInvariants } = await import("@/lib/integrity/post-signal-invariants");
  await assertPostSignalInvariants(signalId);
  return { ok: true };
  } finally {
    await releaseLeadLock(lead_id);
  }
}

function mapSignalToEventType(s: CanonicalSignalType): string {
  const m: Record<string, string> = {
    InboundMessageReceived: "message_received",
    CustomerReplied: "message_received",
    CustomerInactiveTimeout: "no_reply_timeout",
    BookingCreated: "booking_created",
    AppointmentCompleted: "call_completed",
    AppointmentMissed: "no_show_reminder",
    PaymentCaptured: "payment_detected",
    InboundMessageDiscovered: "message_received",
    BookingModified: "booking_created",
    HumanReplyDiscovered: "message_received",
    RefundIssued: "payment_detected",
  };
  return m[s] ?? "message_received";
}
