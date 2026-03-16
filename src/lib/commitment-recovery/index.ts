/**
 * Commitment Recovery Engine
 * Detects stalled commitments, runs recovery, escalates when authority required.
 * No UI; behavior only. Terminal outcomes: completed, rescheduled, cancelled, failed, reassigned.
 */

import { getDb } from "@/lib/db/queries";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
import { enqueue } from "@/lib/queue";
import { persistActionCommand } from "@/lib/action-queue/persist";

export type CommitmentSubjectType = "lead" | "conversation" | "invoice" | "booking" | "task";
export type CommitmentState =
  | "pending"
  | "awaiting_response"
  | "awaiting_confirmation"
  | "overdue"
  | "recovery_required"
  | "resolved";
export type TerminalOutcome = "completed" | "rescheduled" | "cancelled" | "failed" | "reassigned";

const MAX_RECOVERY_ATTEMPTS = 2;

export interface CommitmentRow {
  id: string;
  workspace_id: string;
  subject_type: string;
  subject_id: string;
  expected_at: string;
  state: string;
  terminal_outcome: string | null;
  authority_required: boolean;
  recovery_attempts: number;
  created_at: string;
  updated_at: string;
}

/**
 * Create a commitment record. Call when: new conversation, booking created, invoice issued, follow-up required, missed call.
 */
export async function createCommitment(
  workspaceId: string,
  subjectType: CommitmentSubjectType,
  subjectId: string,
  expectedAt: Date,
): Promise<string> {
  return runWithWriteContextAsync("delivery", async () => {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: awaiting } = await db
      .from("commitments")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", subjectType)
      .eq("subject_id", subjectId)
      .in("state", ["overdue", "recovery_required", "awaiting_response"])
      .gte("updated_at", cutoff)
      .limit(1);
    const hadAwaiting = (awaiting?.length ?? 0) > 0;

    const { data } = await db
      .from("commitments")
      .insert({
        workspace_id: workspaceId,
        subject_type: subjectType,
        subject_id: subjectId,
        expected_at: expectedAt.toISOString(),
        state: "pending",
      })
      .select("id")
      .maybeSingle();
    const id = (data as { id: string })?.id;
    if (id) {
      await db.from("commitment_events").insert({
        commitment_id: id,
        event_type: "created",
        payload: { subject_type: subjectType, subject_id: subjectId, expected_at: expectedAt.toISOString() },
      });
      if (hadAwaiting) {
        const { recordOperationalAssumption } = await import("@/lib/assumption-engine");
        recordOperationalAssumption(workspaceId, "dependency_action_taken", `commitment:${id}`).catch(() => {});
      }
      const { detectAndRecordParallelReality } = await import("@/lib/operational-ambiguity/parallel-reality");
      await detectAndRecordParallelReality(workspaceId, subjectType, subjectId, expectedAt).catch(() => {});
    }
    return id ?? "";
  });
}

/** Record event on a commitment. */
export async function recordCommitmentEvent(
  commitmentId: string,
  eventType: "created" | "reminder_sent" | "escalated" | "auto_resolved" | "user_resolved" | "recovery_attempt",
  payload: Record<string, unknown> = {}
): Promise<void> {
  const db = getDb();
  await db.from("commitment_events").insert({
    commitment_id: commitmentId,
    event_type: eventType,
    payload,
  });
}

/**
 * Transition stale commitments (expected_at < now): pending→awaiting_response, awaiting_response→overdue, overdue→recovery_required.
 */
export async function transitionStaleCommitments(): Promise<number> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: stale } = await db
    .from("commitments")
    .select("id, state")
    .neq("state", "resolved")
    .lt("expected_at", now);
  const rows = (stale ?? []) as { id: string; state: string }[];
  let updated = 0;
  const nextState: Record<string, string> = {
    pending: "awaiting_response",
    awaiting_response: "overdue",
    overdue: "recovery_required",
    awaiting_confirmation: "overdue",
    recovery_required: "recovery_required",
  };
  for (const row of rows) {
    const next = nextState[row.state];
    if (!next) continue;
    if (next === row.state) continue;
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("commitments")
        .update({ state: next, updated_at: now })
        .eq("id", row.id);
    });
    updated++;
  }
  return updated;
}

/**
 * Load commitments that need recovery: state in (overdue, recovery_required), not authority_required, recovery_attempts < MAX.
 */
export async function loadCommitmentsNeedingRecovery(limit: number): Promise<CommitmentRow[]> {
  const db = getDb();
  const { data } = await db
    .from("commitments")
    .select("id, workspace_id, subject_type, subject_id, state, recovery_attempts, updated_at")
    .in("state", ["overdue", "recovery_required"])
    .eq("authority_required", false)
    .lt("recovery_attempts", MAX_RECOVERY_ATTEMPTS)
    .order("expected_at", { ascending: true })
    .limit(limit * 2);
  const rows = (data ?? []) as (CommitmentRow & { updated_at?: string })[];
  const { getRecoveryTimingsForWorkspace } = await import("@/lib/recovery-profile");
  const now = Date.now();
  const filtered: CommitmentRow[] = [];
  for (const row of rows) {
    const timings = await getRecoveryTimingsForWorkspace(row.workspace_id);
    const hoursMs = timings.commitmentReminderHours * 60 * 60 * 1000;
    const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    if (now - updatedAt < hoursMs && row.recovery_attempts > 0) continue;
    filtered.push(row);
    if (filtered.length >= limit) break;
  }
  return filtered;
}

/**
 * Run recovery for one commitment: conversation→follow-up message, booking→confirmation, invoice→payment notice, task→reassign.
 */
export async function runRecoveryForCommitment(c: CommitmentRow): Promise<{ ok: boolean; error?: string }> {
  const db = getDb();
  try {
    if (c.subject_type === "conversation") {
      const { data: conv } = await db
        .from("conversations")
        .select("id, lead_id, channel")
        .eq("id", c.subject_id)
        .maybeSingle();
      if (!conv) return { ok: false, error: "Conversation not found" };
      const convRow = conv as { id: string; lead_id: string; channel: string };
      const { data: lead } = await db.from("leads").select("workspace_id").eq("id", convRow.lead_id).maybeSingle();
      if (!lead) return { ok: false, error: "Lead not found" };
      const workspaceId = (lead as { workspace_id: string }).workspace_id;
      const { shouldSuppressOutbound } = await import("@/lib/outbound-suppression");
      if (await shouldSuppressOutbound(workspaceId, `lead:${convRow.lead_id}`, "daily_nudge", 24 * 60)) return { ok: true };
      const dedupKey = `commitment-recovery:${c.id}:${c.recovery_attempts}`;
      const { hasExecutedActionType, setPendingPreview } = await import("@/lib/adoption-acceleration/previews");
      if (!(await hasExecutedActionType(workspaceId, "commitment_recovery"))) {
        await setPendingPreview(workspaceId, "commitment_recovery", "If no reply occurs, a confirmation message will be sent.").catch(() => {});
      }
      const { compileMessage } = await import("@/lib/message-compiler");
      const content = compileMessage("follow_up", { channel: (convRow.channel || "sms") as "sms" | "email" | "web" });
      const cmd = {
        type: "SendMessage" as const,
        workspace_id: workspaceId,
        lead_id: convRow.lead_id,
        payload: {
          conversation_id: convRow.id,
          channel: convRow.channel || "sms",
          content,
          action_type: "commitment_recovery",
        },
        dedup_key: dedupKey,
      };
      const { id: actionId, isNew } = await persistActionCommand(cmd);
      if (isNew) {
        await enqueue({
          type: "action",
          action: cmd,
          action_command_id: actionId,
        });
      }
    }
    if (c.subject_type === "booking") {
      const { data: conv } = await db
        .from("conversations")
        .select("id, lead_id, channel")
        .eq("lead_id", (await getLeadIdForSubject(db, c)) ?? "")
        .limit(1)
        .maybeSingle();
      if (conv) {
        const convRow = conv as { id: string; lead_id: string; channel: string };
        const { data: lead } = await db.from("leads").select("workspace_id").eq("id", convRow.lead_id).maybeSingle();
        if (lead) {
          const workspaceId = (lead as { workspace_id: string }).workspace_id;
          const { shouldSuppressOutbound } = await import("@/lib/outbound-suppression");
          if (await shouldSuppressOutbound(workspaceId, `lead:${convRow.lead_id}`, "booking_confirm", 24 * 60)) return { ok: true };
          const dedupKey = `commitment-booking-confirm:${c.id}:${c.recovery_attempts}`;
          const { hasExecutedActionType, setPendingPreview } = await import("@/lib/adoption-acceleration/previews");
          if (!(await hasExecutedActionType(workspaceId, "commitment_recovery"))) {
            await setPendingPreview(workspaceId, "commitment_recovery", "If no reply occurs, a confirmation message will be sent.").catch(() => {});
          }
          const { compileMessage } = await import("@/lib/message-compiler");
          const content = compileMessage("confirm_booking", { channel: (convRow.channel || "sms") as "sms" | "email" | "web" });
          const cmd = {
            type: "SendMessage" as const,
            workspace_id: workspaceId,
            lead_id: convRow.lead_id,
            payload: {
              conversation_id: convRow.id,
              channel: convRow.channel || "sms",
              content,
              action_type: "commitment_recovery",
            },
            dedup_key: dedupKey,
          };
          const { id: actionId, isNew } = await persistActionCommand(cmd);
          if (isNew) {
            await enqueue({ type: "action", action: cmd, action_command_id: actionId });
          }
        }
      }
    }
    if (c.subject_type === "invoice") {
      const leadId = await getLeadIdForSubject(db, c);
      if (leadId) {
        const { data: conv } = await db
          .from("conversations")
          .select("id, lead_id, channel")
          .eq("lead_id", leadId)
          .limit(1)
          .maybeSingle();
        if (conv) {
          const convRow = conv as { id: string; lead_id: string; channel: string };
          const { data: lead } = await db.from("leads").select("workspace_id").eq("id", convRow.lead_id).maybeSingle();
          if (lead) {
            const workspaceId = (lead as { workspace_id: string }).workspace_id;
            const { shouldSuppressOutbound } = await import("@/lib/outbound-suppression");
            if (await shouldSuppressOutbound(workspaceId, `lead:${convRow.lead_id}`, "daily_nudge", 24 * 60)) return { ok: true };
            const dedupKey = `commitment-invoice-recovery:${c.id}:${c.recovery_attempts}`;
            const { hasExecutedActionType, setPendingPreview } = await import("@/lib/adoption-acceleration/previews");
            if (!(await hasExecutedActionType(workspaceId, "commitment_recovery"))) {
              await setPendingPreview(workspaceId, "commitment_recovery", "If no reply occurs, a confirmation message will be sent.").catch(() => {});
            }
            const { compileMessage } = await import("@/lib/message-compiler");
            const content = compileMessage("payment_reminder", { channel: (convRow.channel || "sms") as "sms" | "email" | "web" });
            const cmd = {
              type: "SendMessage" as const,
              workspace_id: workspaceId,
              lead_id: convRow.lead_id,
              payload: {
                conversation_id: convRow.id,
                channel: convRow.channel || "sms",
                content,
                action_type: "commitment_recovery",
              },
              dedup_key: dedupKey,
            };
            const { id: actionId, isNew } = await persistActionCommand(cmd);
            if (isNew) {
              await enqueue({ type: "action", action: cmd, action_command_id: actionId });
            }
          }
        }
      }
    }
    await runWithWriteContextAsync("delivery", async () => {
      const db2 = getDb();
      await db2
        .from("commitments")
        .update({
          recovery_attempts: c.recovery_attempts + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", c.id);
    });
    await recordCommitmentEvent(c.id, "recovery_attempt", { attempt: c.recovery_attempts + 1 });
    return { ok: true };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    return { ok: false, error: err };
  }
}

async function getLeadIdForSubject(db: ReturnType<typeof getDb>, c: CommitmentRow): Promise<string | null> {
  if (c.subject_type === "conversation") {
    const { data } = await db.from("conversations").select("lead_id").eq("id", c.subject_id).maybeSingle();
    return (data as { lead_id?: string })?.lead_id ?? null;
  }
  if (c.subject_type === "booking") {
    const { data } = await db.from("leads").select("id").eq("id", c.subject_id).maybeSingle();
    return (data as { id?: string })?.id ?? null;
  }
  return c.subject_id;
}

/**
 * After 2 recovery attempts fail: set authority_required = true, create entry, do not retry.
 * Unless memory/assumption says auto-reschedule: then reschedule and do not escalate.
 */
export async function escalateCommitmentToAuthority(commitmentId: string): Promise<{ escalated: boolean }> {
  const db = getDb();
  const { data: c } = await db
    .from("commitments")
    .select("id, workspace_id, subject_type, subject_id, expected_at")
    .eq("id", commitmentId)
    .maybeSingle();
  if (!c) return { escalated: false };
  const row = c as { workspace_id: string; subject_type: string; subject_id: string };
  const { getCommitmentBehaviorPattern } = await import("@/lib/operational-memory");
  const { getAssumedResolution } = await import("@/lib/decision-assumption");
  const pattern = await getCommitmentBehaviorPattern(row.workspace_id, row.subject_type, row.subject_id);
  const assumed = await getAssumedResolution(row.workspace_id, "commitment");
  const shouldAutoReschedule =
    pattern === "repeatedly_reschedules" || assumed === "reschedule";
  if (shouldAutoReschedule) {
    const newExpected = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await resolveCommitment(commitmentId, "rescheduled");
    await createCommitment(row.workspace_id, row.subject_type as CommitmentSubjectType, row.subject_id, newExpected);
    return { escalated: false };
  }
  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2
      .from("commitments")
      .update({ authority_required: true, updated_at: new Date().toISOString() })
      .eq("id", commitmentId);
  });
  await recordCommitmentEvent(commitmentId, "escalated", { reason: "recovery_attempts_exceeded" });
  const leadId = await getLeadIdFromCommitment(db, commitmentId);
  if (leadId && row.workspace_id) {
    const { logEscalation } = await import("@/lib/escalation");
    await logEscalation(
      row.workspace_id,
      leadId,
      "progress_stalled",
      "Commitment recovery required authority",
      "Commitment has stalled after recovery attempts. Human decision required.",
      undefined,
      undefined
    );
  }
  return { escalated: true };
}

async function getLeadIdFromCommitment(db: ReturnType<typeof getDb>, commitmentId: string): Promise<string | null> {
  const { data: c } = await db.from("commitments").select("subject_type, subject_id").eq("id", commitmentId).maybeSingle();
  if (!c) return null;
  const r = c as { subject_type: string; subject_id: string };
  if (r.subject_type === "conversation") {
    const { data: conv } = await db.from("conversations").select("lead_id").eq("id", r.subject_id).maybeSingle();
    return (conv as { lead_id?: string })?.lead_id ?? null;
  }
  if (r.subject_type === "lead" || r.subject_type === "booking") return r.subject_id;
  return null;
}

/**
 * Set terminal outcome and state = resolved. Call when: reply received, payment made, booking attended, explicit cancellation.
 */
export async function resolveCommitment(
  commitmentId: string,
  terminalOutcome: TerminalOutcome
): Promise<void> {
  const db = getDb();
  const { data: before } = await db
    .from("commitments")
    .select("workspace_id, state, recovery_attempts, subject_type, subject_id")
    .eq("id", commitmentId)
    .maybeSingle();
  const prev = before as { workspace_id: string; state: string; recovery_attempts: number; subject_type: string; subject_id: string } | null;
  await runWithWriteContextAsync("delivery", async () => {
    const db2 = getDb();
    await db2
      .from("commitments")
      .update({
        state: "resolved",
        terminal_outcome: terminalOutcome,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commitmentId);
  });
  await recordCommitmentEvent(commitmentId, "auto_resolved", { terminal_outcome: terminalOutcome });
  if (prev) {
    const { removeOperationalExpectation } = await import("@/lib/operability-anchor");
    removeOperationalExpectation(prev.workspace_id, "awaiting_confirmation", commitmentId).catch(() => {});
  }
  const outcomeFollowedIntervention =
    prev && (prev.state === "overdue" || prev.state === "recovery_required") && (terminalOutcome === "completed" || terminalOutcome === "rescheduled");
  if (outcomeFollowedIntervention && prev) {
    const { recordCausalChain } = await import("@/lib/causality-engine");
    recordCausalChain({
      workspace_id: prev.workspace_id,
      subject_type: prev.subject_type,
      subject_id: prev.subject_id,
      baseline_expected_outcome: "not_confirmed",
      intervention_type: "commitment_recovery",
      observed_outcome: "confirmed",
      dependency_established: true,
    }).catch(() => {});
    const { recordOperationalAssumption } = await import("@/lib/assumption-engine");
    recordOperationalAssumption(prev.workspace_id, "outcome_presumed", `commitment:${commitmentId}`).catch(() => {});
    const { markExposureResolved } = await import("@/lib/exposure-engine");
    markExposureResolved(prev.workspace_id, "attendance_uncertainty_risk", "commitment", commitmentId, "resolved_after_intervention").catch(() => {});
    markExposureResolved(prev.workspace_id, "commitment_outcome_uncertain", "commitment", commitmentId, "resolved_after_intervention").catch(() => {});
    const { recordContinuationStopped } = await import("@/lib/continuation-engine");
    recordContinuationStopped(prev.workspace_id, prev.subject_type, prev.subject_id, "uncertain_attendance", 0).catch(() => {});
    const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
    recordCoordinationDisplacement(prev.workspace_id, "staff", "attendance", true).catch(() => {});
    const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
    recordResponsibilityMoment({
      workspaceId: prev.workspace_id,
      subjectType: "commitment",
      subjectId: commitmentId,
      authorityHolder: "environment",
      determinedFrom: "intervention",
    }).catch(() => {});
    const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
    recordNonParticipationIfApplicable(prev.workspace_id, `commitment:${commitmentId}`, "commitment").catch(() => {});
  }
  const confirmedWithoutRecovery =
    prev && prev.recovery_attempts === 0 && (terminalOutcome === "completed" || terminalOutcome === "rescheduled");
  if (confirmedWithoutRecovery && prev) {
    const { recordCoordinationDisplacement } = await import("@/lib/coordination-displacement");
    recordCoordinationDisplacement(prev.workspace_id, "staff", "attendance", false).catch(() => {});
    const { recordResponsibilityMoment } = await import("@/lib/responsibility-moments");
    recordResponsibilityMoment({
      workspaceId: prev.workspace_id,
      subjectType: "commitment",
      subjectId: commitmentId,
      authorityHolder: "environment",
      determinedFrom: "timeout",
    }).catch(() => {});
    const { recordNonParticipationIfApplicable } = await import("@/lib/detachment");
    recordNonParticipationIfApplicable(prev.workspace_id, `commitment:${commitmentId}`, "commitment").catch(() => {});
  }
  if (prev) {
    const orientationText: Record<TerminalOutcome, string> = {
      completed: outcomeFollowedIntervention ? "The confirmation occurred after follow-up." : "The customer confirmed the time.",
      rescheduled: outcomeFollowedIntervention ? "The appointment was rescheduled after follow-up." : "The appointment was rescheduled.",
      cancelled: "The commitment was cancelled.",
      failed: "The appointment did not occur.",
      reassigned: "Responsibility was reassigned.",
    };
    const { recordOrientationStatement } = await import("@/lib/orientation/records");
    recordOrientationStatement(prev.workspace_id, orientationText[terminalOutcome]).catch(() => {});
    const { recordStaffRelianceEvent } = await import("@/lib/staff-reliance");
    recordStaffRelianceEvent(prev.workspace_id).catch(() => {});
  }
  if (prev && (prev.state === "overdue" || prev.state === "recovery_required") && (terminalOutcome === "completed" || terminalOutcome === "rescheduled")) {
    const { recordReliefEvent } = await import("@/lib/awareness-timing/relief-events");
    recordReliefEvent(prev.workspace_id, "A scheduled interaction reached confirmation after follow-up.").catch(() => {});
    const { touchDependencyMemory } = await import("@/lib/operational-dependency-memory");
    touchDependencyMemory(prev.workspace_id, "commitment_resolution").catch(() => {});
    const { recordMemoryReplacementEvent } = await import("@/lib/memory-replacement");
    recordMemoryReplacementEvent(prev.workspace_id, "outcome_confirmed").catch(() => {});
    recordMemoryReplacementEvent(prev.workspace_id, "followup").catch(() => {});
  }
  if (prev && prev.recovery_attempts > 0 && (prev.state === "overdue" || prev.state === "recovery_required")) {
    const { recordEconomicEvent } = await import("@/lib/economic-events");
    if (terminalOutcome === "completed") {
      recordEconomicEvent({
        workspaceId: prev.workspace_id,
        eventType: "commitment_saved",
        subjectType: prev.subject_type,
        subjectId: prev.subject_id,
        valueAmount: 0,
      }).catch(() => {});
    } else if (terminalOutcome === "rescheduled") {
      recordEconomicEvent({
        workspaceId: prev.workspace_id,
        eventType: "no_show_prevented",
        subjectType: prev.subject_type,
        subjectId: prev.subject_id,
        valueAmount: 0,
      }).catch(() => {});
      const { recordCommitmentBehavior } = await import("@/lib/operational-memory");
      const { recordResolutionPreference } = await import("@/lib/decision-assumption");
      await recordCommitmentBehavior(prev.workspace_id, prev.subject_type, prev.subject_id, "repeatedly_reschedules").catch(() => {});
      await recordResolutionPreference(prev.workspace_id, "commitment", "reschedule").catch(() => {});
    }
  }
}

/**
 * Resolve all open commitments for a subject (e.g. conversation reply received → completed).
 */
export async function resolveCommitmentsBySubject(
  workspaceId: string,
  subjectType: string,
  subjectId: string,
  terminalOutcome: TerminalOutcome
): Promise<number> {
  const db = getDb();
  const { data: rows } = await db
    .from("commitments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .neq("state", "resolved");
  const list = (rows ?? []) as { id: string }[];
  for (const r of list) {
    await resolveCommitment(r.id, terminalOutcome);
  }
  return list.length;
}

/**
 * Get commitments requiring human authority (for GET /api/responsibility).
 */
export async function getCommitmentsRequiringAuthority(workspaceId: string): Promise<CommitmentRow[]> {
  const db = getDb();
  const { data } = await db
    .from("commitments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("authority_required", true)
    .neq("state", "resolved")
    .order("expected_at", { ascending: true });
  return (data ?? []) as CommitmentRow[];
}
