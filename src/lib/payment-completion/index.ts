/**
 * Payment Completion Engine — guarantee every owed payment reaches a financial outcome.
 * Reuses commitment/opportunity patterns: create obligation, transition states, recovery, resolve.
 * Terminal outcomes: paid, confirmed_pending, failed, written_off; or authority_required.
 */

import { getDb } from "@/lib/db/queries";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { enqueueSendMessage } from "@/lib/action-queue/send-message";
import { updateCounterpartyReliance } from "@/lib/shared-transaction-assurance";
import { insertOperationalDependency } from "@/lib/counterparty-participation";

export type PaymentSubjectType = "invoice" | "booking" | "subscription" | "custom";
export type PaymentState = "pending" | "overdue" | "recovering" | "resolved";
export type PaymentTerminalOutcome = "paid" | "confirmed_pending" | "failed" | "written_off";

const MAX_RECOVERY_ATTEMPTS = 4;

export interface PaymentObligationRow {
  id: string;
  workspace_id: string;
  subject_type: string;
  subject_id: string;
  amount: number;
  currency: string;
  due_at: string;
  state: string;
  terminal_outcome: string | null;
  recovery_attempts: number;
  authority_required: boolean;
  last_attempt_at: string | null;
  next_attempt_at: string | null;
  lead_id: string | null;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateObligationInput {
  workspaceId: string;
  subjectType: PaymentSubjectType;
  subjectId: string;
  amount: number;
  currency?: string;
  dueAt: Date;
  leadId?: string | null;
  conversationId?: string | null;
}

/**
 * Create a payment obligation. Call from: InvoiceCreated, BookingRequiresDeposit, SubscriptionPaymentFailed, ManualPaymentRequested.
 * Idempotent: if an unresolved obligation for same (workspace, subject_type, subject_id) exists, returns its id.
 */
export async function createPaymentObligation(input: CreateObligationInput): Promise<string> {
  const db = getDb();
  const { data: existing } = await db
    .from("payment_obligations")
    .select("id")
    .eq("workspace_id", input.workspaceId)
    .eq("subject_type", input.subjectType)
    .eq("subject_id", input.subjectId)
    .neq("state", "resolved")
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;
  const id = await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    const { data } = await db2
      .from("payment_obligations")
      .insert({
        workspace_id: input.workspaceId,
        subject_type: input.subjectType,
        subject_id: input.subjectId,
        amount: input.amount,
        currency: input.currency ?? "usd",
        due_at: input.dueAt.toISOString(),
        state: "pending",
        ...(input.leadId && { lead_id: input.leadId }),
        ...(input.conversationId && { conversation_id: input.conversationId }),
      })
      .select("id")
      .maybeSingle();
    return (data as { id: string })?.id ?? "";
  });
  if (id && input.leadId) {
    const { data: lead } = await db
      .from("leads")
      .select("email, phone")
      .eq("id", input.leadId)
      .eq("workspace_id", input.workspaceId)
      .maybeSingle();
    const identifier = (lead as { email?: string | null; phone?: string | null } | null)?.email
      ?? (lead as { phone?: string | null } | null)?.phone;
    if (identifier) {
      updateCounterpartyReliance(input.workspaceId, identifier, "interaction").catch(() => {});
    }
  }
  return id;
}

/**
 * Transition: pending & due_at passed → overdue; overdue → recovering.
 * Run every 10 minutes.
 */
export async function transitionPaymentObligations(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: pending } = await db
    .from("payment_obligations")
    .select("id, state, workspace_id")
    .eq("state", "pending")
    .lt("due_at", now);
  const pendingRows = (pending ?? []) as { id: string; state: string; workspace_id: string }[];
  let updated = 0;
  for (const row of pendingRows) {
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("payment_obligations")
        .update({ state: "overdue", updated_at: now })
        .eq("id", row.id);
    });
    await insertOperationalDependency(row.workspace_id, `payment:${row.id}`, "payment_required").catch(() => {});
    updated++;
  }
  const { data: overdue } = await db
    .from("payment_obligations")
    .select("id")
    .eq("state", "overdue");
  const overdueRows = (overdue ?? []) as { id: string }[];
  for (const row of overdueRows) {
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("payment_obligations")
        .update({ state: "recovering", updated_at: now })
        .eq("id", row.id);
    });
    updated++;
  }
  return updated;
}


/**
 * Load obligations needing recovery: state = recovering, recovery_attempts < 3, authority_required = false, next_attempt_at due or null.
 */
export async function getObligationsNeedingRecovery(limit: number): Promise<PaymentObligationRow[]> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data } = await db
    .from("payment_obligations")
    .select("*")
    .eq("state", "recovering")
    .eq("authority_required", false)
    .lt("recovery_attempts", MAX_RECOVERY_ATTEMPTS)
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("due_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as PaymentObligationRow[];
}

/**
 * Run one recovery: send message (attempt 1: friendly link, 2: reminder, 3: final notice); update attempts and next_attempt_at (12h).
 */
export async function runRecoveryForObligation(obligation: PaymentObligationRow): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  const now = new Date();
  try {
    if (obligation.conversation_id && obligation.lead_id) {
      const { data: conv } = await db
        .from("conversations")
        .select("id, lead_id, channel")
        .eq("id", obligation.conversation_id)
        .maybeSingle();
      if (conv) {
        const c = conv as { id: string; lead_id: string; channel: string };
        const { compileMessage } = await import("@/lib/message-compiler");
        const content = compileMessage("payment_reminder", {
          channel: (c.channel || "sms") as "sms" | "email" | "web",
          tone: obligation.recovery_attempts >= 2 ? "firm" : "neutral",
        });
        const dedupKey = `payment-recovery:${obligation.id}:${obligation.recovery_attempts}`;
        const { shouldSuppressOutbound } = await import("@/lib/outbound-suppression");
        if (await shouldSuppressOutbound(obligation.workspace_id, `lead:${c.lead_id}`, "payment_nudge", 12 * 60)) {
          return { ok: true };
        }
        const { hasExecutedActionType, setPendingPreview } = await import("@/lib/adoption-acceleration/previews");
        if (!(await hasExecutedActionType(obligation.workspace_id, "payment_recovery"))) {
          await setPendingPreview(obligation.workspace_id, "payment_recovery", "If no reply occurs, a payment reminder will be sent.").catch(() => {});
        }
        await enqueueSendMessage(
          obligation.workspace_id,
          c.lead_id,
          c.id,
          c.channel || "sms",
          content,
          dedupKey,
          { action_type: "payment_recovery" }
        );
      }
    }
    const { getRecoveryTimingsForWorkspace } = await import("@/lib/recovery-profile");
    const timings = await getRecoveryTimingsForWorkspace(obligation.workspace_id);
    const nextAttemptAt = new Date(now.getTime() + timings.paymentSpacingHours * 60 * 60 * 1000).toISOString();
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("payment_obligations")
        .update({
          recovery_attempts: obligation.recovery_attempts + 1,
          last_attempt_at: now.toISOString(),
          next_attempt_at: nextAttemptAt,
          updated_at: now.toISOString(),
        })
        .eq("id", obligation.id);
    });
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, error: err };
  }
}

/** After 3 attempts: set authority_required. */
export async function escalateObligationToAuthority(obligationId: string): Promise<void> {
  const now = new Date().toISOString();
  await runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    await db
      .from("payment_obligations")
      .update({ authority_required: true, updated_at: now })
      .eq("id", obligationId);
  });
}

/**
 * Resolve obligation with terminal outcome. Call from: PaymentSucceeded (paid), PaymentProcessing (confirmed_pending), PaymentCancelled (written_off).
 */
export async function resolvePaymentObligation(
  obligationId: string,
  terminalOutcome: PaymentTerminalOutcome
): Promise<void> {
  const db = getDb();
  const { data: beforeRow } = await db
    .from("payment_obligations")
    .select("workspace_id, state, amount, currency, subject_type, subject_id, recovery_attempts")
    .eq("id", obligationId)
    .maybeSingle();
  const before = beforeRow as { workspace_id: string; state: string; amount: number; currency: string; subject_type: string; subject_id: string; recovery_attempts?: number } | null;
  let obligationSnapshot: { workspace_id: string; amount: number; currency: string; subject_type: string; subject_id: string } | null = null;
  if (terminalOutcome === "paid" && before) {
    obligationSnapshot = {
      workspace_id: before.workspace_id,
      amount: before.amount,
      currency: before.currency,
      subject_type: before.subject_type,
      subject_id: before.subject_id,
    };
  }
  const now = new Date().toISOString();
  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2
      .from("payment_obligations")
      .update({
        state: "resolved",
        terminal_outcome: terminalOutcome,
        updated_at: now,
      })
      .eq("id", obligationId);
  });
  if (terminalOutcome === "paid" && obligationSnapshot) {
    const { recordEconomicEvent } = await import("@/lib/economic-events");
    recordEconomicEvent({
      workspaceId: obligationSnapshot.workspace_id,
      eventType: "payment_recovered",
      subjectType: obligationSnapshot.subject_type,
      subjectId: obligationSnapshot.subject_id,
      valueAmount: obligationSnapshot.amount,
      valueCurrency: obligationSnapshot.currency,
    }).catch(() => {});
    if (before?.state === "overdue") {
      const { recordCausalChain } = await import("@/lib/causality-engine");
      recordCausalChain({
        workspace_id: obligationSnapshot.workspace_id,
        subject_type: obligationSnapshot.subject_type,
        subject_id: obligationSnapshot.subject_id,
        baseline_expected_outcome: "unpaid",
        intervention_type: "payment_recovery",
        observed_outcome: "paid",
        dependency_established: true,
      }).catch(() => {});
      const { recordOperationalAssumption } = await import("@/lib/assumption-engine");
      recordOperationalAssumption(obligationSnapshot.workspace_id, "outcome_presumed", `payment:${obligationId}`).catch(() => {});
      const { markExposureResolved } = await import("@/lib/exposure-engine");
      markExposureResolved(obligationSnapshot.workspace_id, "payment_stall_risk", "payment_obligation", obligationId, "resolved_after_intervention").catch(() => {});
      const { recordContinuationStopped } = await import("@/lib/continuation-engine");
      recordContinuationStopped(
        obligationSnapshot.workspace_id,
        obligationSnapshot.subject_type,
        obligationSnapshot.subject_id,
        "unpaid",
        0
      ).catch(() => {});
      const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
      recordCoordinationDisplacement(obligationSnapshot.workspace_id, "staff", "payment", true).catch(() => {});
      const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
      recordResponsibilityMoment({
        workspaceId: obligationSnapshot.workspace_id,
        subjectType: "payment",
        subjectId: obligationId,
        authorityHolder: "environment",
        determinedFrom: "intervention",
      }).catch(() => {});
      const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
      recordNonParticipationIfApplicable(
        obligationSnapshot.workspace_id,
        `payment:${obligationId}`,
        "payment"
      ).catch(() => {});
      const { recordReliefEvent } = await import("@/lib/awareness-timing/relief-events");
      recordReliefEvent(obligationSnapshot.workspace_id, "The payment did not remain outstanding.").catch(() => {});
      const { touchDependencyMemory } = await import("@/lib/operational-dependency-memory");
      touchDependencyMemory(obligationSnapshot.workspace_id, "payment_followthrough").catch(() => {});
      const { recordMemoryReplacementEvent } = await import("@/lib/memory-replacement");
      recordMemoryReplacementEvent(obligationSnapshot.workspace_id, "payment_recovered").catch(() => {});
    }
    const paidWithoutRecovery =
      before && terminalOutcome === "paid" && (before.state === "pending" || (before.recovery_attempts ?? 0) === 0);
    if (paidWithoutRecovery && obligationSnapshot) {
      const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
      recordCoordinationDisplacement(obligationSnapshot.workspace_id, "staff", "payment", false).catch(() => {});
      const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
      recordResponsibilityMoment({
        workspaceId: obligationSnapshot.workspace_id,
        subjectType: "payment",
        subjectId: obligationId,
        authorityHolder: "environment",
        determinedFrom: "timeout",
      }).catch(() => {});
      const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
      recordNonParticipationIfApplicable(
        obligationSnapshot.workspace_id,
        `payment:${obligationId}`,
        "payment"
      ).catch(() => {});
    }
  }
  const paymentFollowedReminder = before?.state === "overdue" && terminalOutcome === "paid";
  if (before) {
    const { removeOperationalExpectation } = await import("@/lib/operability-anchor");
    removeOperationalExpectation(before.workspace_id, "awaiting_payment", obligationId).catch(() => {});
    const orientationText: Record<PaymentTerminalOutcome, string> = {
      paid: paymentFollowedReminder ? "The payment completed after reminder." : "The payment was completed.",
      confirmed_pending: "The payment was confirmed pending.",
      failed: "The payment did not complete.",
      written_off: "The obligation was written off.",
    };
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    recordOrientationStatement(before.workspace_id, orientationText[terminalOutcome]).catch(() => {});
    const { recordStaffRelianceEvent } = await import("@/lib/staff-reliance");
    recordStaffRelianceEvent(before.workspace_id).catch(() => {});
    if (terminalOutcome === "paid" || terminalOutcome === "confirmed_pending") {
      const { touchDependencyMemory } = await import("@/lib/operational-dependency-memory");
      touchDependencyMemory(before.workspace_id, "payment_followthrough").catch(() => {});
    }
  }
}

/**
 * Resolve by subject (e.g. invoice paid → find obligation by subject_type + subject_id, resolve as paid).
 */
export async function resolvePaymentObligationsBySubject(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  terminalOutcome: PaymentTerminalOutcome
): Promise<number> {
  const db = getDb();
  const { data: rows } = await db
    .from("payment_obligations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .neq("state", "resolved");
  const list = (rows ?? []) as { id: string }[];
  for (const r of list) {
    await resolvePaymentObligation(r.id, terminalOutcome);
  }
  return list.length;
}

/** Unresolved obligations requiring authority (for GET /api/responsibility). */
export async function getPaymentObligationsRequiringAuthority(
  workspaceId: string
): Promise<PaymentObligationRow[]> {
  const db = getDb();
  const { data } = await db
    .from("payment_obligations")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("authority_required", true)
    .neq("state", "resolved")
    .order("due_at", { ascending: true });
  return (data ?? []) as PaymentObligationRow[];
}
