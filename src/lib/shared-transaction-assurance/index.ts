/**
 * Shared Transaction Assurance — operational record between two parties.
 * Sits above commitments, opportunities, payments. Transaction is real only when both acknowledge.
 * Do NOT modify existing engines; they may read from this layer via getAcknowledgedTransaction.
 */

import { createHash, randomBytes } from "crypto";
import { getDb } from "@/lib/db/queries";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { enqueueSendMessage } from "@/lib/action-queue/send-message";
import { upsertParticipationFromIncomingEntry, insertOperationalDependency } from "@/lib/counterparty-participation";
import { upsertParticipation as upsertEconomicParticipation } from "@/lib/economic-participation";

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export type SharedSubjectType = "booking" | "job" | "payment" | "delivery" | "agreement";
export type InitiatedBy = "business" | "counterparty";
export type SharedTransactionState =
  | "pending_acknowledgement"
  | "acknowledged"
  | "disputed"
  | "expired";

const EXTENSION_HOURS = 24;
const MAX_REMINDERS_BEFORE_ESCALATE = 1;

export interface SharedTransactionRow {
  id: string;
  workspace_id: string;
  counterparty_identifier: string;
  subject_type: string;
  subject_id: string;
  initiated_by: string;
  state: string;
  acknowledgement_required: boolean;
  acknowledgement_deadline: string | null;
  acknowledged_at: string | null;
  dispute_reason: string | null;
  authority_required: boolean;
  reminder_sent_count: number;
  lead_id: string | null;
  conversation_id: string | null;
  external_ref: string;
  created_at: string;
  updated_at: string;
}

const PROTOCOL_EVENT_TYPES = ["created", "token_issued", "acknowledged", "rescheduled", "disputed", "expired", "mirrored", "network_pressure"] as const;

async function appendProtocolEvent(
  externalRef: string,
  workspaceId: string | null,
  eventType: (typeof PROTOCOL_EVENT_TYPES)[number],
  payload: Record<string, unknown> = {}
): Promise<void> {
  const db = getDb();
  await db.from("protocol_events").insert({
    external_ref: externalRef,
    workspace_id: workspaceId ?? null,
    event_type: eventType,
    payload,
  });
}

export interface CreateSharedTransactionInput {
  workspaceId: string;
  counterpartyIdentifier: string;
  subjectType: SharedSubjectType;
  subjectId: string;
  initiatedBy: InitiatedBy;
  acknowledgementDeadline: Date;
  leadId?: string | null;
  conversationId?: string | null;
}

/**
 * Upsert counterparty edge (observed). Called when a shared transaction is created.
 */
export async function upsertCounterpartyEdge(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("counterparty_edges")
    .select("id, first_seen_at")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .maybeSingle();
  if (existing) {
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("counterparty_edges")
        .update({ last_seen_at: now })
        .eq("workspace_id", workspaceId)
        .eq("counterparty_identifier", counterpartyIdentifier);
    });
    return;
  }
  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2.from("counterparty_edges").insert({
      workspace_id: workspaceId,
      counterparty_identifier: counterpartyIdentifier,
      first_seen_at: now,
      last_seen_at: now,
      status: "observed",
    });
  });
}

/**
 * Create a shared transaction. Call when: booking confirmed, payment request sent, job scheduled, service completed, agreement proposed.
 * Sets external_ref and appends protocol_events "created".
 */
export async function createSharedTransaction(
  input: CreateSharedTransactionInput
): Promise<string> {
  const externalRef = randomBytes(16).toString("hex");
  const id = await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    const { data } = await db
      .from("shared_transactions")
      .insert({
        workspace_id: input.workspaceId,
        counterparty_identifier: input.counterpartyIdentifier,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        initiated_by: input.initiatedBy,
        state: "pending_acknowledgement",
        acknowledgement_required: true,
        acknowledgement_deadline: input.acknowledgementDeadline.toISOString(),
        external_ref: externalRef,
        ...(input.leadId && { lead_id: input.leadId }),
        ...(input.conversationId && { conversation_id: input.conversationId }),
      })
      .select("id")
      .single();
    return (data as { id: string })?.id ?? "";
  });
  if (id) {
    await appendProtocolEvent(externalRef, input.workspaceId, "created", {
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      deadline: input.acknowledgementDeadline.toISOString(),
    });
    const { recordReciprocalEvent } = await import("@/lib/reciprocal-events");
    const { onReciprocalEvent } = await import("@/lib/operational-responsibilities");
    const eventId = await recordReciprocalEvent({
      threadId: id,
      actorRole: "originator",
      operationalAction: "created",
    }).catch(() => null);
    if (eventId) onReciprocalEvent(id, eventId, "originator", "created").catch(() => {});
    const { detectAndAttachReference } = await import("@/lib/thread-reference-memory");
    await detectAndAttachReference({
      workspaceId: input.workspaceId,
      referenceContextType: "shared_transaction",
      referenceContextId: id,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      leadId: input.leadId ?? null,
      conversationId: input.conversationId ?? null,
    }).catch(() => {});
    const db = getDb();
    const { data: refCheck } = await db
      .from("thread_reference_memory")
      .select("id")
      .eq("workspace_id", input.workspaceId)
      .eq("reference_context_type", "shared_transaction")
      .eq("reference_context_id", id)
      .limit(1)
      .maybeSingle();
    const { hasReturnGravity } = await import("@/lib/reality-signals/return-gravity");
    if (await hasReturnGravity(id)) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(input.workspaceId, "This activity follows a prior confirmed outcome.").catch(() => {});
    }
    if (!refCheck) {
      const { hasExternalActivityForSubject } = await import("@/lib/reality-signals/external-activity");
      if (await hasExternalActivityForSubject(input.workspaceId, input.subjectType, input.subjectId, id)) {
        const { recordOrientationStatement } = await import("@/lib/orientation/records");
        await recordOrientationStatement(input.workspaceId, "Related activity occurred outside this record.").catch(() => {});
      }
      const { detectAndRecordParallelReality } = await import("@/lib/operational-ambiguity/parallel-reality");
      await detectAndRecordParallelReality(input.workspaceId, input.subjectType, input.subjectId, input.acknowledgementDeadline).catch(() => {});
    }
    await upsertCounterpartyEdge(input.workspaceId, input.counterpartyIdentifier);
    updateCounterpartyReliance(input.workspaceId, input.counterpartyIdentifier, "shared_entry").catch(() => {});
    maybeIssueCounterpartyInvite(input.workspaceId, input.counterpartyIdentifier).catch(() => {});
    const { emitSendPublicRecordLink } = await import("@/lib/action-intents/emit");
    await emitSendPublicRecordLink(input.workspaceId, id, {
      external_ref: externalRef,
      subject_type: input.subjectType,
      subject_id: input.subjectId,
    }).catch(() => {});
  }
  return id;
}

const DEFAULT_TOKEN_TTL_HOURS = 168; // 7 days

/**
 * Create a one-time acknowledgement token (no login). Returns raw token only once; store only hash.
 * Appends protocol_events "token_issued" (no raw token in payload).
 */
export async function createAcknowledgementToken(
  sharedTransactionId: string,
  ttlHours: number = DEFAULT_TOKEN_TTL_HOURS
): Promise<{ rawToken: string }> {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    await db.from("shared_transaction_tokens").insert({
      shared_transaction_id: sharedTransactionId,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });
  });
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("external_ref, workspace_id")
    .eq("id", sharedTransactionId)
    .single();
  if (row) {
    const r = row as { external_ref: string; workspace_id: string };
    await appendProtocolEvent(r.external_ref, r.workspace_id, "token_issued", {});
  }
  return { rawToken };
}

/**
 * Build public acknowledgement link (page with token in query). Use APP_URL from env or relative.
 */
export function buildPublicAckLink(rawToken: string): string {
  const base = typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.length > 0
    ? process.env.NEXT_PUBLIC_APP_URL
    : "";
  const path = "/public/ack";
  const q = `token=${encodeURIComponent(rawToken)}`;
  return base ? `${base}${path}?${q}` : `${path}?${q}`;
}

/**
 * Build public record link by external_ref. For pairing with ack link in messages.
 */
export function buildPublicRecordLink(externalRef: string): string {
  const base = typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.length > 0
    ? process.env.NEXT_PUBLIC_APP_URL
    : "";
  const path = `/api/public/record/${encodeURIComponent(externalRef)}`;
  return base ? `${base}${path}` : path;
}

/**
 * Build public environment activate link (token in query). For counterparty onboarding when participation is reliant.
 */
export function buildEnvironmentActivateLink(rawToken: string, counterpartyIdentifier: string): string {
  const base = typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.length > 0
    ? process.env.NEXT_PUBLIC_APP_URL
    : "";
  const path = `/api/public/environment/${encodeURIComponent(counterpartyIdentifier)}/activate`;
  const q = `token=${encodeURIComponent(rawToken)}`;
  return base ? `${base}${path}?${q}` : `${path}?${q}`;
}

/**
 * Validate token: by hash, not expired, not used. Returns shared_transaction_id or null.
 * If already used: returns { transactionId, alreadyUsed: true } so caller can return ok without re-running ack.
 */
export async function validateTokenAndGetTransactionId(
  rawToken: string
): Promise<{ transactionId: string } | { alreadyUsed: true } | null> {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const { data: row } = await db
    .from("shared_transaction_tokens")
    .select("shared_transaction_id, used_at, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!row) return null;
  const r = row as { shared_transaction_id: string; used_at: string | null; expires_at: string };
  if (r.used_at) return { alreadyUsed: true };
  if (r.expires_at < now) return null;
  return { transactionId: r.shared_transaction_id };
}

/**
 * Mark token as used (idempotent: if already used, no-op).
 */
export async function markTokenUsed(rawToken: string): Promise<void> {
  const db = getDb();
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  await db
    .from("shared_transaction_tokens")
    .update({ used_at: now })
    .eq("token_hash", tokenHash)
    .is("used_at", null);
}

export type AcknowledgementAction = "confirm" | "reschedule" | "dispute";

export interface AcknowledgementResult {
  ok: boolean;
  error?: string;
  externalRef?: string;
  counterpartyIdentifier?: string;
}

/**
 * Counterparty acknowledges: confirm → acknowledged; reschedule → new deadline; dispute → disputed + authority_required.
 * Appends protocol_events (acknowledged | rescheduled | disputed). Returns externalRef and counterpartyIdentifier for mirroring.
 */
export async function acknowledgeSharedTransaction(
  transactionId: string,
  action: AcknowledgementAction,
  payload?: { newDeadline?: Date; disputeReason?: string }
): Promise<AcknowledgementResult> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("id, state, external_ref, counterparty_identifier, workspace_id, reminder_sent_count, acknowledged_at")
    .eq("id", transactionId)
    .single();
  if (!row) return { ok: false, error: "Transaction not found" };
  const r = row as { id: string; state: string; external_ref: string; counterparty_identifier: string; workspace_id: string; reminder_sent_count?: number; acknowledged_at?: string | null };
  
  if (r.state === "acknowledged" && action === "confirm") {
    return { ok: true, externalRef: r.external_ref, counterpartyIdentifier: r.counterparty_identifier };
  }
  
  if (r.state !== "pending_acknowledgement") return { ok: false, error: "Transaction not pending acknowledgement" };

  const now = new Date().toISOString();
  const { removeOperationalExpectation } = await import("@/lib/operability-anchor");
  removeOperationalExpectation(r.workspace_id, "awaiting_counterparty", transactionId).catch(() => {});
  if (action === "confirm") {
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      const { data: checkRow } = await db2
        .from("shared_transactions")
        .select("state")
        .eq("id", transactionId)
        .single();
      if (!checkRow || (checkRow as { state: string }).state !== "pending_acknowledgement") {
        return;
      }
      await db2
        .from("shared_transactions")
        .update({
          state: "acknowledged",
          acknowledged_at: now,
          updated_at: now,
        })
        .eq("id", transactionId)
        .eq("state", "pending_acknowledgement");
    });
    await appendProtocolEvent(r.external_ref, r.workspace_id, "acknowledged", { at: now });
    const { recordReciprocalEvent } = await import("@/lib/reciprocal-events");
    const { onReciprocalEvent } = await import("@/lib/operational-responsibilities");
    const eventId = await recordReciprocalEvent({
      threadId: transactionId,
      actorRole: "counterparty",
      operationalAction: "acknowledged",
      authorityTransfer: true,
    }).catch(() => null);
    if (eventId) onReciprocalEvent(transactionId, eventId, "counterparty", "acknowledged").catch(() => {});
    const { refreshTemporalStabilityForWorkspace } = await import("@/lib/temporal-stability");
    refreshTemporalStabilityForWorkspace(r.workspace_id).catch(() => {});
    const { recordCompletionResolution } = await import("@/lib/operational-ambiguity/completion-decay");
    await recordCompletionResolution(transactionId, r.workspace_id).catch(() => {});
    const { checkAndConfirmInstallation } = await import("@/lib/installation/confirm");
    await checkAndConfirmInstallation(r.workspace_id).catch(() => {});
    const { data: onboardingCheck } = await db
      .from("orientation_records")
      .select("id")
      .eq("workspace_id", r.workspace_id)
      .eq("text", "Confirmation is pending.")
      .limit(1)
      .maybeSingle();
    if (onboardingCheck) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(r.workspace_id, "Another party confirmed the outcome.");
      await recordOrientationStatement(r.workspace_id, "The record is now complete.");
      await recordOrientationStatement(r.workspace_id, "The outcome now exists independently of this conversation.");
      const { data: hookCheck } = await db
        .from("orientation_records")
        .select("id")
        .eq("workspace_id", r.workspace_id)
        .eq("text", "Future work referencing this will attach to this record.")
        .limit(1)
        .maybeSingle();
      if (!hookCheck) {
        await recordOrientationStatement(r.workspace_id, "Future work referencing this will attach to this record.");
      }
    }
    const { data: wasDisputed } = await db
      .from("protocol_events")
      .select("id")
      .eq("external_ref", r.external_ref)
      .eq("event_type", "disputed")
      .limit(1)
      .maybeSingle();
    if (wasDisputed) {
      const { recordOrientationStatement } = await import("@/lib/orientation/records");
      await recordOrientationStatement(r.workspace_id, "Agreement restored the shared record.").catch(() => {});
    }
    updateCounterpartyReliance(r.workspace_id, r.counterparty_identifier, "acknowledgement", { acknowledged: true }).catch(() => {});
    const { upsertRelationshipState } = await import("@/lib/relationship-continuity");
    await upsertRelationshipState(r.workspace_id, r.counterparty_identifier, {
      completion_reliability: "high",
      response_reciprocity: "high",
    }).catch(() => {});
    const { recordEconomicEvent } = await import("@/lib/economic-events");
    recordEconomicEvent({
      workspaceId: r.workspace_id,
      eventType: "dispute_prevented",
      subjectType: "shared_transaction",
      subjectId: transactionId,
      valueAmount: 0,
    }).catch(() => {});
    const reminderCount = r.reminder_sent_count ?? 0;
    if (reminderCount > 0) {
      const { recordCausalChain } = await import("@/lib/causality-engine");
      recordCausalChain({
        workspace_id: r.workspace_id,
        subject_type: "shared_transaction",
        subject_id: transactionId,
        baseline_expected_outcome: "unacknowledged",
        intervention_type: "shared_transaction_ack",
        observed_outcome: "acknowledged",
        dependency_established: true,
      }).catch(() => {});
      const { recordOperationalAssumption } = await import("@/lib/assumption-engine");
      recordOperationalAssumption(r.workspace_id, "outcome_presumed", `shared:${transactionId}`).catch(() => {});
      const { markExposureResolved } = await import("@/lib/exposure-engine");
      markExposureResolved(r.workspace_id, "counterparty_unconfirmed_risk", "shared_transaction", transactionId, "resolved_after_intervention").catch(() => {});
      const { recordContinuationStopped } = await import("@/lib/continuation-engine");
      recordContinuationStopped(r.workspace_id, "shared_transaction", transactionId, "unaligned", 0).catch(() => {});
      const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
      recordCoordinationDisplacement(r.workspace_id, "counterparty", "responsibility", true).catch(() => {});
      const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
      recordResponsibilityMoment({
        workspaceId: r.workspace_id,
        subjectType: "shared_transaction",
        subjectId: transactionId,
        authorityHolder: "environment",
        determinedFrom: "intervention",
      }).catch(() => {});
      const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
      recordNonParticipationIfApplicable(
        r.workspace_id,
        `shared_transaction:${transactionId}`,
        "shared_transaction"
      ).catch(() => {});
    } else {
      const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
      recordCoordinationDisplacement(r.workspace_id, "counterparty", "confirmation", false).catch(() => {});
      const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
      recordResponsibilityMoment({
        workspaceId: r.workspace_id,
        subjectType: "shared_transaction",
        subjectId: transactionId,
        authorityHolder: "environment",
        determinedFrom: "acknowledgement",
      }).catch(() => {});
      const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
      recordNonParticipationIfApplicable(
        r.workspace_id,
        `shared_transaction:${transactionId}`,
        "shared_transaction"
      ).catch(() => {});
    }
    const { recordReliefEvent } = await import("@/lib/awareness-timing/relief-events");
    recordReliefEvent(r.workspace_id, "The agreement did not remain unconfirmed.").catch(() => {});
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    recordOrientationStatement(r.workspace_id, "The agreement was acknowledged after request.").catch(() => {});
    const counterpartyWorkspaceId = await resolveWorkspaceByCounterparty(r.counterparty_identifier);
    if (counterpartyWorkspaceId) {
      recordOrientationStatement(counterpartyWorkspaceId, "The record was confirmed by another party.").catch(() => {});
    }
    const { touchDependencyMemory } = await import("@/lib/operational-dependency-memory");
    touchDependencyMemory(r.workspace_id, "shared_confirmation").catch(() => {});
    const { refreshSharedEnvironmentDensity } = await import("@/lib/shared-environment-density");
    refreshSharedEnvironmentDensity(r.workspace_id).catch(() => {});
    const { refreshEnvironmentRecognition } = await import("@/lib/environment-recognition");
    refreshEnvironmentRecognition(r.workspace_id).catch(() => {});
    const { recordStaffRelianceEvent } = await import("@/lib/staff-reliance");
    recordStaffRelianceEvent(r.workspace_id).catch(() => {});
    return { ok: true, externalRef: r.external_ref, counterpartyIdentifier: r.counterparty_identifier };
  }
  const newDeadline = payload?.newDeadline;
  if (action === "reschedule" && newDeadline) {
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("shared_transactions")
        .update({
          acknowledgement_deadline: newDeadline.toISOString(),
          updated_at: now,
        })
        .eq("id", transactionId);
    });
    await appendProtocolEvent(r.external_ref, r.workspace_id, "rescheduled", { at: now, new_deadline: newDeadline.toISOString() });
    const { recordReciprocalEvent } = await import("@/lib/reciprocal-events");
    const { onReciprocalEvent } = await import("@/lib/operational-responsibilities");
    const reschedEventId = await recordReciprocalEvent({
      threadId: transactionId,
      actorRole: "counterparty",
      operationalAction: "rescheduled",
      dependencyCreated: "confirmation_required",
    }).catch(() => null);
    if (reschedEventId) onReciprocalEvent(transactionId, reschedEventId, "counterparty", "rescheduled").catch(() => {});
    await insertOperationalDependency(r.workspace_id, r.external_ref, "confirmation_required").catch(() => {});
    updateCounterpartyReliance(r.workspace_id, r.counterparty_identifier, "acknowledgement", { acknowledged: false }).catch(() => {});
    const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
    recordResponsibilityMoment({
      workspaceId: r.workspace_id,
      subjectType: "shared_transaction",
      subjectId: transactionId,
      authorityHolder: "shared",
      determinedFrom: "acknowledgement",
    }).catch(() => {});
    return { ok: true, externalRef: r.external_ref, counterpartyIdentifier: r.counterparty_identifier };
  }
  if (action === "dispute") {
    const { threadIsReliedUpon, recordThreadAmendment } = await import("@/lib/institutional-auditability");
    const reliedBefore = await threadIsReliedUpon(transactionId).catch(() => false);
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("shared_transactions")
        .update({
          state: "disputed",
          dispute_reason: payload?.disputeReason ?? null,
          authority_required: true,
          updated_at: now,
        })
        .eq("id", transactionId);
    });
    await appendProtocolEvent(r.external_ref, r.workspace_id, "disputed", { at: now });
    const { recordReciprocalEvent } = await import("@/lib/reciprocal-events");
    const { onReciprocalEvent } = await import("@/lib/operational-responsibilities");
    const disputeEventId = await recordReciprocalEvent({
      threadId: transactionId,
      actorRole: "counterparty",
      operationalAction: "disputed",
      dependencyCreated: "coordination_required",
    }).catch(() => null);
    if (disputeEventId) onReciprocalEvent(transactionId, disputeEventId, "counterparty", "disputed").catch(() => {});
    if (reliedBefore && disputeEventId) {
      recordThreadAmendment(transactionId, "state_change", "State changed.", disputeEventId).catch(() => {});
    }
    const { detectAndAttachReference } = await import("@/lib/thread-reference-memory");
    detectAndAttachReference({
      workspaceId: r.workspace_id,
      referenceContextType: "shared_transaction",
      referenceContextId: transactionId,
      threadId: transactionId,
      state: "disputed",
    }).catch(() => {});
    await insertOperationalDependency(r.workspace_id, r.external_ref, "coordination_required").catch(() => {});
    updateCounterpartyReliance(r.workspace_id, r.counterparty_identifier, "acknowledgement", { acknowledged: false }).catch(() => {});
    const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
    recordResponsibilityMoment({
      workspaceId: r.workspace_id,
      subjectType: "shared_transaction",
      subjectId: transactionId,
      authorityHolder: "shared",
      determinedFrom: "dispute",
    }).catch(() => {});
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    recordOrientationStatement(r.workspace_id, "The agreement was disputed.").catch(() => {});
    const { detectAndRecordConflictedMemory } = await import("@/lib/operational-ambiguity/conflicted-memory");
    await detectAndRecordConflictedMemory(transactionId, r.workspace_id).catch(() => {});
    return { ok: true, externalRef: r.external_ref, counterpartyIdentifier: r.counterparty_identifier };
  }
  return { ok: false, error: "Invalid action or payload" };
}

/**
 * Get overdue pending_acknowledgement transactions (deadline passed). For recovery cron.
 */
export async function getOverduePendingAcknowledgements(limit: number): Promise<SharedTransactionRow[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db
    .from("shared_transactions")
    .select("*")
    .eq("state", "pending_acknowledgement")
    .eq("authority_required", false)
    .lt("acknowledgement_deadline", now)
    .order("acknowledgement_deadline", { ascending: true })
    .limit(limit);
  return (data ?? []) as SharedTransactionRow[];
}

/**
 * Recovery: send reminder and extend deadline once; then escalate to authority_required.
 */
export async function runRecoveryForSharedTransaction(
  tx: SharedTransactionRow
): Promise<{ ok: boolean; escalated: boolean }> {
  const now = new Date();
  const extendedDeadline = new Date(now.getTime() + EXTENSION_HOURS * 60 * 60 * 1000).toISOString();

  if (tx.reminder_sent_count >= MAX_REMINDERS_BEFORE_ESCALATE) {
    await runWithWriteContextAsync("delivery", async () => {
      const db = getDb();
      await db
        .from("shared_transactions")
        .update({
          state: "expired",
          authority_required: true,
          updated_at: now.toISOString(),
        })
        .eq("id", tx.id);
    });
    await appendProtocolEvent(tx.external_ref, tx.workspace_id, "expired", { at: now.toISOString() });
    return { ok: true, escalated: true };
  }

  if (tx.conversation_id && tx.lead_id) {
    const db = getDb();
    const { data: conv } = await db
      .from("conversations")
      .select("id, lead_id, channel")
      .eq("id", tx.conversation_id)
      .single();
    if (conv) {
      const c = conv as { id: string; lead_id: string; channel: string };
      const { shouldSuppressOutbound } = await import("@/lib/outbound-suppression");
      if (await shouldSuppressOutbound(tx.workspace_id, `lead:${c.lead_id}`, "daily_nudge", 24 * 60)) {
        return { ok: true, escalated: false };
      }
      const { rawToken } = await createAcknowledgementToken(tx.id);
      const recordLink = buildPublicRecordLink(tx.external_ref);
      const ackLink = buildPublicAckLink(rawToken);
      const reminderContent = `Record available: ${recordLink} Acknowledgement: ${ackLink}`;
      const dedupKey = `shared-tx-reminder:${tx.id}:${tx.reminder_sent_count}`;
      await enqueueSendMessage(
        tx.workspace_id,
        c.lead_id,
        c.id,
        c.channel || "sms",
        reminderContent,
        dedupKey,
        { action_type: "shared_transaction_reminder" }
      );
    }
  }

  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2
      .from("shared_transactions")
      .update({
        reminder_sent_count: tx.reminder_sent_count + 1,
        acknowledgement_deadline: extendedDeadline,
        updated_at: now.toISOString(),
      })
      .eq("id", tx.id);
  });
  return { ok: true, escalated: false };
}

/**
 * Disputed or expired with authority_required (for GET /api/responsibility).
 */
export async function getSharedTransactionsRequiringAuthority(
  workspaceId: string
): Promise<SharedTransactionRow[]> {
  const db = getDb();
  const { data } = await db
    .from("shared_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("authority_required", true)
    .in("state", ["disputed", "expired"])
    .order("created_at", { ascending: false });
  return (data ?? []) as SharedTransactionRow[];
}

/**
 * Resolve counterparty identifier (email/phone) to workspace_id if linked in counterparty_identities.
 */
export async function resolveWorkspaceByCounterparty(identifier: string): Promise<string | null> {
  if (!identifier || typeof identifier !== "string") return null;
  const trimmed = identifier.trim().toLowerCase();
  const db = getDb();
  for (const identifierType of ["email", "phone", "other"] as const) {
    const { data } = await db
      .from("counterparty_identities")
      .select("workspace_id")
      .eq("identifier_type", identifierType)
      .eq("identifier", trimmed)
      .limit(1)
      .maybeSingle();
    if (data) return (data as { workspace_id: string }).workspace_id;
  }
  return null;
}

export type RelianceEventType = "shared_entry" | "acknowledgement" | "interaction";

/**
 * Update counterparty reliance: upsert row, apply event, recompute reliance_state from stored counters and shared_transactions only.
 */
export async function updateCounterpartyReliance(
  workspaceId: string,
  identifier: string,
  eventType: RelianceEventType,
  options?: { acknowledged?: boolean }
): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const idn = identifier.trim().toLowerCase();
  if (!idn) return;

  const { data: row } = await db
    .from("counterparty_reliance")
    .select("id, interaction_count, shared_entries_count, acknowledged_count, last_interaction_at")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .maybeSingle();

  if (!row) {
    await db.from("counterparty_reliance").insert({
      workspace_id: workspaceId,
      counterparty_identifier: idn,
      interaction_count: eventType === "interaction" || eventType === "acknowledgement" ? 1 : 0,
      shared_entries_count: eventType === "shared_entry" ? 1 : 0,
      acknowledged_count: eventType === "acknowledgement" && options?.acknowledged ? 1 : 0,
      last_interaction_at: now,
      reliance_state: "observed",
    });
  } else {
    const r = row as {
      interaction_count: number;
      shared_entries_count: number;
      acknowledged_count: number;
      last_interaction_at: string;
    };
    const inc = {
      interaction_count: r.interaction_count + (eventType === "interaction" || eventType === "acknowledgement" ? 1 : 0),
      shared_entries_count: r.shared_entries_count + (eventType === "shared_entry" ? 1 : 0),
      acknowledged_count: r.acknowledged_count + (eventType === "acknowledgement" && options?.acknowledged ? 1 : 0),
      last_interaction_at: now,
    };
    await db
      .from("counterparty_reliance")
      .update(inc)
      .eq("workspace_id", workspaceId)
      .eq("counterparty_identifier", idn);
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rel } = await db
    .from("counterparty_reliance")
    .select("interaction_count, shared_entries_count, acknowledged_count, last_interaction_at")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .single();
  if (!rel) return;
  const rr = rel as { interaction_count: number; shared_entries_count: number; acknowledged_count: number; last_interaction_at: string };

  const { count: txCount30 } = await db
    .from("shared_transactions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .gte("created_at", since30d);
  const { data: disputeRow } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .in("state", ["disputed", "expired"])
    .limit(1)
    .maybeSingle();

  const critical = (txCount30 ?? 0) >= 3 || !!disputeRow;
  const dependent = rr.acknowledged_count >= 1;
  const recurring = rr.interaction_count >= 2 && rr.last_interaction_at >= since14d;
  const newState = critical ? "critical" : dependent ? "dependent" : recurring ? "recurring" : "observed";
  await db
    .from("counterparty_reliance")
    .update({ reliance_state: newState })
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn);
}

export type IncomingEntryState = "normal" | "outside_authority" | "beyond_scope" | "exposure";

/**
 * Mirror protocol event into counterparty workspace: append mirrored protocol_event and upsert incoming_entries.
 * If originWorkspaceId provided: update counterparty reliance (interaction), and if state becomes critical insert network_pressure event.
 * No-op if counterpartyWorkspaceId is null.
 */
export async function mirrorProtocolEventToCounterpartyWorkspace(
  externalRef: string,
  counterpartyWorkspaceId: string | null,
  eventType: string,
  payload: Record<string, unknown>,
  originWorkspaceId?: string | null
): Promise<void> {
  if (!counterpartyWorkspaceId) return;
  const db = getDb();
  await db.from("protocol_events").insert({
    external_ref: externalRef,
    workspace_id: counterpartyWorkspaceId,
    event_type: "mirrored",
    payload: { original_event_type: eventType, external_ref: externalRef },
  });

  const incomingState: IncomingEntryState =
    eventType === "disputed" ? "outside_authority"
    : eventType === "expired" ? "exposure"
    : "normal";
  const now = new Date().toISOString();
  const upsertPayload: {
    workspace_id: string;
    external_ref: string;
    state: string;
    last_event_at: string;
    origin_workspace_id?: string;
  } = {
    workspace_id: counterpartyWorkspaceId,
    external_ref: externalRef,
    state: incomingState,
    last_event_at: now,
  };
  if (originWorkspaceId) upsertPayload.origin_workspace_id = originWorkspaceId;
  await db.from("incoming_entries").upsert(upsertPayload, { onConflict: "workspace_id,external_ref" });

  if (originWorkspaceId) {
    const originId = String(originWorkspaceId);
    await upsertParticipationFromIncomingEntry(counterpartyWorkspaceId, `workspace:${originId}`, now).catch(() => {});
    await upsertEconomicParticipation(counterpartyWorkspaceId, "coordination_dependency", now).catch(() => {});
    await updateCounterpartyReliance(counterpartyWorkspaceId, `workspace:${originId}`, "interaction");
    const { data: rel } = await db
      .from("counterparty_reliance")
      .select("reliance_state")
      .eq("workspace_id", counterpartyWorkspaceId)
      .eq("counterparty_identifier", `workspace:${originId}`)
      .single();
    if ((rel as { reliance_state: string } | null)?.reliance_state === "critical") {
      await appendProtocolEvent(externalRef, counterpartyWorkspaceId, "network_pressure", {});
    }
  }
  if (incomingState === "exposure") {
    await insertOperationalDependency(counterpartyWorkspaceId, externalRef, "outcome_required").catch(() => {});
  }
}

/**
 * Public attestation: minimal entry state by external_ref (no internal ids, no counts, no history).
 */
export interface PublicEntryAttestation {
  external_ref: string;
  subject_type: string;
  state: string;
  last_event_type: string;
  last_event_at: string;
}

export async function getPublicEntryByExternalRef(
  externalRef: string
): Promise<PublicEntryAttestation | null> {
  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("external_ref, subject_type, state, authority_required, acknowledgement_deadline, created_at")
    .eq("external_ref", externalRef)
    .single();
  if (!tx) return null;
  const t = tx as {
    external_ref: string;
    subject_type: string;
    state: string;
    authority_required: boolean;
    acknowledgement_deadline: string | null;
    created_at: string;
  };
  const now = new Date().toISOString();
  let state = t.state;
  if (t.state === "pending_acknowledgement" && t.acknowledgement_deadline && t.acknowledgement_deadline < now) {
    state = "expired";
  }
  if (t.authority_required && (t.state === "disputed" || t.state === "expired")) {
    state = t.state;
  }

  const { data: events } = await db
    .from("protocol_events")
    .select("event_type, created_at")
    .eq("external_ref", externalRef)
    .order("created_at", { ascending: false })
    .limit(1);
  const last = events?.[0] as { event_type: string; created_at: string } | undefined;
  return {
    external_ref: t.external_ref,
    subject_type: t.subject_type,
    state,
    last_event_type: last?.event_type ?? "created",
    last_event_at: last?.created_at ?? t.created_at,
  };
}

/**
 * Resolve workspace_id by external_ref for internal use (e.g. record reference). Do not expose.
 */
export async function getWorkspaceIdByExternalRef(externalRef: string): Promise<string | null> {
  const db = getDb();
  const { data: tx } = await db
    .from("shared_transactions")
    .select("workspace_id")
    .eq("external_ref", externalRef)
    .maybeSingle();
  if (tx) return (tx as { workspace_id: string }).workspace_id;
  const { data: inc } = await db
    .from("incoming_entries")
    .select("workspace_id")
    .eq("external_ref", externalRef)
    .maybeSingle();
  return inc ? (inc as { workspace_id: string }).workspace_id : null;
}

/**
 * Resolve transaction id by external_ref only when state is pending_acknowledgement.
 * For use by public respond adapter only. Never expose id to client.
 */
export async function getPendingTransactionIdByExternalRef(externalRef: string): Promise<string | null> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("id")
    .eq("external_ref", externalRef)
    .eq("state", "pending_acknowledgement")
    .maybeSingle();
  return (row as { id: string } | null)?.id ?? null;
}

/**
 * Resolve transaction id (thread_id) by external_ref in any state. For reciprocal events only. Never expose to client.
 */
export async function getTransactionIdByExternalRef(externalRef: string): Promise<string | null> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("id")
    .eq("external_ref", externalRef)
    .maybeSingle();
  return (row as { id: string } | null)?.id ?? null;
}

/**
 * Resolve transaction id by external_ref when state is acknowledged. For post-confirmation counterparty actions.
 */
export async function getAcknowledgedTransactionIdByExternalRef(externalRef: string): Promise<string | null> {
  const db = getDb();
  const { data: row } = await db
    .from("shared_transactions")
    .select("id")
    .eq("external_ref", externalRef)
    .eq("state", "acknowledged")
    .maybeSingle();
  return (row as { id: string } | null)?.id ?? null;
}

/** incoming_entries where state != normal (for GET /api/responsibility). */
export async function getIncomingEntriesRequiringAttention(
  workspaceId: string
): Promise<{ external_ref: string; state: string; last_event_at: string }[]> {
  const db = getDb();
  const { data } = await db
    .from("incoming_entries")
    .select("external_ref, state, last_event_at")
    .eq("workspace_id", workspaceId)
    .neq("state", "normal")
    .order("last_event_at", { ascending: false });
  return (data ?? []) as { external_ref: string; state: string; last_event_at: string }[];
}

/** network_entries: incoming_entries where state != normal and counterparty_reliance.reliance_state = critical for origin. */
export async function getNetworkEntriesRequiringAttention(
  workspaceId: string
): Promise<{ external_ref: string; state: string; last_event_at: string }[]> {
  const db = getDb();
  const { data: rows } = await db
    .from("incoming_entries")
    .select("external_ref, state, last_event_at, origin_workspace_id")
    .eq("workspace_id", workspaceId)
    .neq("state", "normal")
    .not("origin_workspace_id", "is", null);
  if (!rows?.length) return [];
  const out: { external_ref: string; state: string; last_event_at: string }[] = [];
  for (const row of rows as { external_ref: string; state: string; last_event_at: string; origin_workspace_id: string }[]) {
    const { data: rel } = await db
      .from("counterparty_reliance")
      .select("reliance_state")
      .eq("workspace_id", workspaceId)
      .eq("counterparty_identifier", `workspace:${row.origin_workspace_id}`)
      .eq("reliance_state", "critical")
      .maybeSingle();
    if (rel) out.push({ external_ref: row.external_ref, state: row.state, last_event_at: row.last_event_at });
  }
  return out.sort((a, b) => (b.last_event_at > a.last_event_at ? 1 : -1));
}

/**
 * For other engines (commitments, opportunities, payments): read-only.
 * Acknowledged transactions become authoritative expected outcomes; call this from callers if needed.
 */
export async function getAcknowledgedTransaction(
  workspaceId: string,
  subjectType: string,
  subjectId: string
): Promise<SharedTransactionRow | null> {
  const db = getDb();
  const { data } = await db
    .from("shared_transactions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .eq("state", "acknowledged")
    .order("acknowledged_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SharedTransactionRow | null) ?? null;
}

export interface EnsureSharedTransactionInput {
  workspaceId: string;
  subjectType: SharedSubjectType;
  subjectId: string;
  counterpartyIdentifier: string;
  deadlineAt: Date;
  initiatedBy: InitiatedBy;
  leadId?: string | null;
  conversationId?: string | null;
}

/**
 * Idempotent shared transaction for subject. If open (pending_acknowledgement or acknowledged) exists, do not create.
 * If disputed/expired with authority_required, do not create. If disputed/expired without authority_required, allow new one with new deadline.
 */
export async function ensureSharedTransactionForSubject(
  input: EnsureSharedTransactionInput
): Promise<string> {
  const db = getDb();
  const { data: existing } = await db
    .from("shared_transactions")
    .select("id, state, authority_required")
    .eq("workspace_id", input.workspaceId)
    .eq("subject_type", input.subjectType)
    .eq("subject_id", input.subjectId)
    .in("state", ["pending_acknowledgement", "acknowledged"])
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data: disputed } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("subject_type", input.subjectType)
    .eq("subject_id", input.subjectId)
    .in("state", ["disputed", "expired"])
    .eq("authority_required", true)
    .maybeSingle();
  if (disputed) return "";

  return createSharedTransaction({
    workspaceId: input.workspaceId,
    counterpartyIdentifier: input.counterpartyIdentifier,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    initiatedBy: input.initiatedBy,
    acknowledgementDeadline: input.deadlineAt,
    leadId: input.leadId,
    conversationId: input.conversationId,
  });
}

const INVITE_ELIGIBILITY_TX_COUNT = 2;
const INVITE_ELIGIBILITY_DAYS = 30;
const CONNECT_PATH = "/connect";

/**
 * Issue counterparty invite when: edge is observed, >=2 shared transactions in 30 days, no unresolved authority for this counterparty.
 * Network wedge: only when institutional_state is institutional or assumed, normalized_operation true. One invite max.
 */
export async function maybeIssueCounterpartyInvite(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<{ invited: boolean }> {
  const db = getDb();
  const { data: edge } = await db
    .from("counterparty_edges")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .single();
  if (!edge || (edge as { status: string }).status !== "observed") return { invited: false };

  const { getInstitutionalState } = await import("@/lib/institutional-state");
  const { normalizationEstablished } = await import("@/lib/normalization-engine");
  const [instState, normalized] = await Promise.all([
    getInstitutionalState(workspaceId),
    normalizationEstablished(workspaceId),
  ]);
  const instOk = instState === "institutional" || instState === "assumed";
  if (!instOk || !normalized) return { invited: false };

  const since = new Date(Date.now() - INVITE_ELIGIBILITY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { count: txCount } = await db
    .from("shared_transactions")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .gte("created_at", since);
  if ((txCount ?? 0) < INVITE_ELIGIBILITY_TX_COUNT) return { invited: false };

  const { data: authorityRow } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", counterpartyIdentifier)
    .eq("authority_required", true)
    .in("state", ["disputed", "expired"])
    .limit(1)
    .maybeSingle();
  if (authorityRow) return { invited: false };

  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2
      .from("counterparty_edges")
      .update({ status: "invited" })
      .eq("workspace_id", workspaceId)
      .eq("counterparty_identifier", counterpartyIdentifier);
  });

  const base = typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.length > 0
    ? process.env.NEXT_PUBLIC_APP_URL
    : "";
  const link = base ? `${base}${CONNECT_PATH}` : CONNECT_PATH;
  const inviteContent = `Access: ${link}`;

  const { data: byEmail } = await db.from("leads").select("id").eq("workspace_id", workspaceId).eq("email", counterpartyIdentifier).limit(1).maybeSingle();
  let leadId: string | null = (byEmail as { id: string } | null)?.id ?? null;
  if (!leadId) {
    const { data: byPhone } = await db.from("leads").select("id").eq("workspace_id", workspaceId).eq("phone", counterpartyIdentifier).limit(1).maybeSingle();
    leadId = (byPhone as { id: string } | null)?.id ?? null;
  }
  if (leadId) {
    const { data: conv } = await db
      .from("conversations")
      .select("id, channel")
      .eq("lead_id", leadId)
      .limit(1)
      .maybeSingle();
    if (conv) {
      const c = conv as { id: string; channel: string };
      await enqueueSendMessage(workspaceId, leadId, c.id, c.channel || "sms", inviteContent, `counterparty-invite:${workspaceId}:${counterpartyIdentifier}`);
    }
  }
  return { invited: true };
}

/**
 * When participation_state is reliant and invite not issued: send one message "Environment access available: {link}".
 * Uses counterparty_edges (observed -> invited). Link is token-gated activate route.
 */
export async function sendEnvironmentInviteWhenReliant(
  workspaceId: string,
  counterpartyIdentifier: string
): Promise<{ sent: boolean }> {
  const db = getDb();
  const idn = counterpartyIdentifier.trim().toLowerCase();
  if (!idn) return { sent: false };

  let { data: edge } = await db
    .from("counterparty_edges")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .maybeSingle();
  if (!edge) {
    await upsertCounterpartyEdge(workspaceId, idn);
    const res = await db
      .from("counterparty_edges")
      .select("id, status")
      .eq("workspace_id", workspaceId)
      .eq("counterparty_identifier", idn)
      .maybeSingle();
    edge = res.data ?? null;
  }
  if (!edge || (edge as { status: string }).status !== "observed") return { sent: false };

  const { getInstitutionalState } = await import("@/lib/institutional-state");
  const { normalizationEstablished } = await import("@/lib/normalization-engine");
  const [instState, normalized] = await Promise.all([
    getInstitutionalState(workspaceId),
    normalizationEstablished(workspaceId),
  ]);
  const instOk = instState === "institutional" || instState === "assumed";
  if (!instOk || !normalized) return { sent: false };

  const { data: authorityRow } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .eq("authority_required", true)
    .in("state", ["disputed", "expired"])
    .limit(1)
    .maybeSingle();
  if (authorityRow) return { sent: false };

  let txId: string | null = null;
  const { data: existingTx } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .limit(1)
    .maybeSingle();
  if (existingTx) {
    txId = (existingTx as { id: string }).id;
  } else {
    const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    txId = await createSharedTransaction({
      workspaceId,
      counterpartyIdentifier: idn,
      subjectType: "agreement",
      subjectId: "environment",
      initiatedBy: "business",
      acknowledgementDeadline: deadline,
    });
  }
  if (!txId) return { sent: false };

  const { rawToken } = await createAcknowledgementToken(txId);
  const link = buildEnvironmentActivateLink(rawToken, idn);
  const messageText = `Environment access available: ${link}`;

  const { data: byEmail } = await db.from("leads").select("id").eq("workspace_id", workspaceId).eq("email", idn).limit(1).maybeSingle();
  let leadId: string | null = (byEmail as { id: string } | null)?.id ?? null;
  if (!leadId) {
    const { data: byPhone } = await db.from("leads").select("id").eq("workspace_id", workspaceId).eq("phone", idn).limit(1).maybeSingle();
    leadId = (byPhone as { id: string } | null)?.id ?? null;
  }
  let sent = false;
  if (leadId) {
    const { data: conv } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).maybeSingle();
    if (conv) {
      const c = conv as { id: string; channel: string };
      await enqueueSendMessage(
        workspaceId,
        leadId,
        c.id,
        c.channel || "sms",
        messageText,
        `environment-invite:${workspaceId}:${idn}`
      );
      sent = true;
    }
  }

  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2
      .from("counterparty_edges")
      .upsert(
        {
          workspace_id: workspaceId,
          counterparty_identifier: idn,
          status: "invited",
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "workspace_id,counterparty_identifier" }
      );
  });
  return { sent };
}

const PROTOCOL_PARTICIPATION_DEADLINE_DAYS = 30;

/**
 * Issue protocol participation invite: one shared_transaction (agreement/environment), one message with link.
 * Sets invite_issued_at so it is never sent again. Neutral operational wording only.
 */
export async function issueProtocolParticipation(
  workspaceId: string,
  identifier: string
): Promise<{ ok: boolean; sent: boolean }> {
  const db = getDb();
  const idn = identifier.trim().toLowerCase();
  if (!idn) return { ok: false, sent: false };

  const { getInstitutionalState } = await import("@/lib/institutional-state");
  const { normalizationEstablished } = await import("@/lib/normalization-engine");
  const [instState, normalized] = await Promise.all([
    getInstitutionalState(workspaceId),
    normalizationEstablished(workspaceId),
  ]);
  const instOk = instState === "institutional" || instState === "assumed";
  if (!instOk || !normalized) return { ok: true, sent: false };

  const { data: rel } = await db
    .from("counterparty_reliance")
    .select("id, invite_issued_at")
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn)
    .single();
  if (!rel || (rel as { invite_issued_at: string | null }).invite_issued_at) {
    return { ok: true, sent: false };
  }

  const { data: byEmail } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("email", idn)
    .limit(1)
    .maybeSingle();
  let leadId: string | null = (byEmail as { id: string } | null)?.id ?? null;
  if (!leadId) {
    const { data: byPhone } = await db.from("leads").select("id").eq("workspace_id", workspaceId).eq("phone", idn).limit(1).maybeSingle();
    leadId = (byPhone as { id: string } | null)?.id ?? null;
  }
  let conversationId: string | null = null;
  let convChannel = "sms";
  if (leadId) {
    const { data: conv } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).maybeSingle();
    if (conv) {
      conversationId = (conv as { id: string }).id;
      convChannel = (conv as { channel?: string }).channel ?? "sms";
    }
  }

  const deadline = new Date(Date.now() + PROTOCOL_PARTICIPATION_DEADLINE_DAYS * 24 * 60 * 60 * 1000);
  const txId = await createSharedTransaction({
    workspaceId,
    counterpartyIdentifier: idn,
    subjectType: "agreement",
    subjectId: "environment",
    initiatedBy: "business",
    acknowledgementDeadline: deadline,
    leadId: leadId ?? undefined,
    conversationId: conversationId ?? undefined,
  });
  if (!txId) return { ok: false, sent: false };

  const dbForRef = getDb();
  const { data: txRow } = await dbForRef.from("shared_transactions").select("external_ref").eq("id", txId).single();
  const externalRef = (txRow as { external_ref?: string } | null)?.external_ref ?? "";
  const { rawToken } = await createAcknowledgementToken(txId);
  const recordLink = buildPublicRecordLink(externalRef);
  const ackLink = buildPublicAckLink(rawToken);
  const messageText = `Record available: ${recordLink} Acknowledgement: ${ackLink}`;
  const dedupKey = `protocol-participation:${workspaceId}:${idn}`;
  if (leadId && conversationId) {
    await enqueueSendMessage(workspaceId, leadId, conversationId, convChannel, messageText, dedupKey);
  }

  const now = new Date().toISOString();
  await db
    .from("counterparty_reliance")
    .update({ invite_issued_at: now })
    .eq("workspace_id", workspaceId)
    .eq("counterparty_identifier", idn);
  return { ok: true, sent: !!leadId && !!conversationId };
}
