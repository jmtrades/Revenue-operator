/**
 * System Integrity Layer — Run audit for a workspace: build snapshot, run checks, persist, escalate or prove.
 */

import { getDb } from "@/lib/db/queries";
import {
  runAllIntegrityChecks,
  type WorkspaceIntegritySnapshot,
  type IntegrityViolation,
} from "./integrity-checks";
import { getLastResponsibilityState } from "@/lib/closure/history";
import { getCommitmentStartAt } from "@/lib/closure/closure-invariants";

const TABLE = "system_integrity_history";
const RECON_TABLE = "workspace_reconciliation_last_run";
const SIGNAL_WINDOW_DAYS = 7;
const COMMITMENT_RESOLUTION_SIGNALS = ["AppointmentCompleted", "AppointmentMissed", "BookingCancelled"];

/** Build snapshot for workspace from DB. All reads; no writes. */
export async function buildIntegritySnapshot(workspaceId: string): Promise<WorkspaceIntegritySnapshot> {
  const db = getDb();

  const { data: activeLeads } = await db
    .from("leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .is("closure_dormant_at", null);
  const activeLeadIds = (activeLeads ?? []).map((r: { id: string }) => r.id);

  const lastResponsibilityByLead: Record<string, string | null> = {};
  const commitmentEndTimeByLead: Record<string, string | null> = {};
  const hasCompletionSignalAfterCommitment: Record<string, boolean> = {};
  for (const leadId of activeLeadIds) {
    lastResponsibilityByLead[leadId] = await getLastResponsibilityState(leadId);
    const startAt = await getCommitmentStartAt(workspaceId, leadId);
    commitmentEndTimeByLead[leadId] = startAt;
    hasCompletionSignalAfterCommitment[leadId] = false;
  }

  const since = new Date();
  since.setDate(since.getDate() - SIGNAL_WINDOW_DAYS);
  const sinceIso = since.toISOString();
  const { data: signals } = await db
    .from("canonical_signals")
    .select("id, lead_id, occurred_at, processed_at, signal_type, payload")
    .eq("workspace_id", workspaceId)
    .gte("occurred_at", sinceIso);
  const signalList = (signals ?? []) as Array<{
    id: string;
    lead_id: string;
    occurred_at: string;
    processed_at: string | null;
    signal_type: string;
    payload?: { start_at?: string; new_start_at?: string };
  }>;

  for (const leadId of activeLeadIds) {
    const endAt = commitmentEndTimeByLead[leadId];
    if (!endAt) continue;
    const leadSignals = signalList
      .filter((s) => s.lead_id === leadId && new Date(s.occurred_at) >= new Date(endAt))
      .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());
    hasCompletionSignalAfterCommitment[leadId] = leadSignals.some((s) =>
      COMMITMENT_RESOLUTION_SIGNALS.includes(s.signal_type)
    );
  }

  const { data: cmdRows } = await db
    .from("action_commands")
    .select("id, processed_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sinceIso);
  const commands = (cmdRows ?? []) as Array<{ id: string; processed_at: string | null }>;
  const actionCommandIds = new Set(commands.map((c) => c.id));

  const { data: attemptRows } = await db
    .from("action_attempts")
    .select("action_command_id, status, updated_at")
    .in("action_command_id", [...actionCommandIds]);
  const attempts = (attemptRows ?? []) as Array<{
    action_command_id: string;
    status: string;
    updated_at: string;
  }>;

  const { data: escRows } = await db
    .from("escalation_logs")
    .select("id, lead_id, created_at")
    .eq("workspace_id", workspaceId)
    .gte("created_at", sinceIso);
  const escalations = (escRows ?? []) as Array<{ id: string; lead_id: string; created_at: string }>;
  const escIds = escalations.map((e) => e.id);
  let acknowledgedEscalationIds = new Set<string>();
  if (escIds.length > 0) {
    const { data: acks } = await db.from("handoff_acknowledgements").select("escalation_id").in("escalation_id", escIds);
    acknowledgedEscalationIds = new Set((acks ?? []).map((r: { escalation_id: string }) => r.escalation_id));
  }

  let reconciliationLastRunAt: string | null = null;
  try {
    const { data: reconRow } = await db
      .from(RECON_TABLE)
      .select("last_run_at")
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (reconRow && (reconRow as { last_run_at?: string }).last_run_at) {
      reconciliationLastRunAt = (reconRow as { last_run_at: string }).last_run_at;
    }
  } catch {
    // Table may not exist
  }

  return {
    workspaceId,
    activeLeadIds,
    lastResponsibilityByLead,
    commitmentEndTimeByLead,
    hasCompletionSignalAfterCommitment,
    actionCommandIds,
    attempts,
    commands,
    escalations,
    acknowledgedEscalationIds,
    reconciliationLastRunAt,
    signals: signalList.map((s) => ({ id: s.id, lead_id: s.lead_id, occurred_at: s.occurred_at, processed_at: s.processed_at })),
  };
}

export interface IntegrityAuditResult {
  workspaceId: string;
  violationCount: number;
  violations: IntegrityViolation[];
  result: "ok" | "violations";
}

const REPLAY_LEAD_LIMIT = 20;

/** Run replay determinism for a sample of active leads; return violations for mismatches. */
async function runReplayChecks(
  workspaceId: string,
  activeLeadIds: string[]
): Promise<IntegrityViolation[]> {
  const { replayLeadFromSignals } = await import("./replay-determinism");
  const out: IntegrityViolation[] = [];
  const limit = Math.min(activeLeadIds.length, REPLAY_LEAD_LIMIT);
  for (let i = 0; i < limit; i++) {
    const leadId = activeLeadIds[i];
    if (!leadId) continue;
    try {
      const result = await replayLeadFromSignals(leadId, workspaceId);
      if (result && !result.match) {
        out.push({
          check: "replay_determinism",
          message: "Stored lead state does not match reducer replay",
          details: {
            expectedLifecycle: result.expectedLifecycle,
            actualStored: result.actualStored,
            actualLifecycle: result.actualLifecycle,
          },
          entityIds: [leadId],
        });
      }
    } catch {
      out.push({
        check: "replay_determinism",
        message: "Replay check failed for lead",
        entityIds: [leadId],
      });
    }
  }
  return out;
}

/**
 * Run integrity audit for one workspace: build snapshot, run checks, insert history, escalate or record proof.
 */
export async function runIntegrityAudit(workspaceId: string): Promise<IntegrityAuditResult> {
  const { runWithWriteContextAsync } = await import("@/lib/safety/unsafe-write-guard");
  return runWithWriteContextAsync("integrity", async () => {
  const violations: IntegrityViolation[] = [];
  try {
    const { assertSystemGuarantees } = await import("@/lib/safety/assert-system-guarantees");
    await assertSystemGuarantees(workspaceId);
  } catch (e) {
    const { ProgressStalledError } = await import("@/lib/integrity/errors");
    if (e instanceof ProgressStalledError) {
      violations.push({
        check: "progress_stalled",
        message: e.message,
        details: e.details as Record<string, unknown> | undefined,
      });
      const { logEscalation } = await import("@/lib/escalation");
      const db = getDb();
      const { data: anyLead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle();
      const leadId = (anyLead as { id: string } | null)?.id ?? null;
      if (leadId) {
        await logEscalation(
          workspaceId,
          leadId,
          "progress_stalled",
          "Progress stalled",
          e.message
        );
      }
    } else {
      throw e;
    }
  }
  const snapshot = await buildIntegritySnapshot(workspaceId);
  violations.push(...runAllIntegrityChecks(snapshot));
  const replayViolations = await runReplayChecks(workspaceId, snapshot.activeLeadIds);
  violations.push(...replayViolations);
  const violationCount = violations.length;
  const result: "ok" | "violations" = violationCount === 0 ? "ok" : "violations";

  const db = getDb();
  await db.from(TABLE).insert({
    workspace_id: workspaceId,
    checked_at: new Date().toISOString(),
    result,
    violation_count: violationCount,
    details_json: { violations: violations.map((v) => ({ check: v.check, message: v.message, entityIds: v.entityIds })) },
  });

  const firstLeadId =
    snapshot.activeLeadIds[0] ??
    (violations[0]?.entityIds?.[0] as string | undefined) ??
    null;

  if (violationCount > 0) {
    const hasReconciliationFreshness = violations.some((v) => v.check === "reconciliation_freshness");
    if (hasReconciliationFreshness) {
      const { enqueue } = await import("@/lib/queue");
      await enqueue({ type: "closure_reconciliation", workspaceId });
    }
    const { logEscalation } = await import("@/lib/escalation");
    let leadId: string | null = firstLeadId ?? snapshot.activeLeadIds[0] ?? null;
    if (!leadId) {
      const { data: anyLead } = await db.from("leads").select("id").eq("workspace_id", workspaceId).limit(1).maybeSingle();
      leadId = (anyLead as { id: string } | null)?.id ?? null;
    }
    if (leadId) {
      await logEscalation(
        workspaceId,
        leadId,
        "system_integrity_violation",
        "system_integrity_violation",
        `Integrity audit found ${violationCount} violation(s): ${violations.map((v) => v.check).join(", ")}`,
        undefined,
        undefined
      );
    }
  } else {
    const { recordProof } = await import("@/lib/proof/record");
    const proofLeadId = firstLeadId ?? snapshot.activeLeadIds[0];
    if (proofLeadId) {
      await recordProof({
        workspace_id: workspaceId,
        lead_id: proofLeadId,
        proof_type: "SystemIntegrityVerified",
        operator_id: "INTEGRITY_OPERATOR",
        payload: { checked_at: new Date().toISOString() },
      });
    }
  }

  return { workspaceId, violationCount, violations, result };
  });
}
