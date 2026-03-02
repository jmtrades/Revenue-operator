/**
 * Closure Layer — Enforce invariants. Never sends messages; only drives pipeline.
 */

import { getDb } from "@/lib/db/queries";
import { resolveResponsibility, ClosureInvariantViolation } from "./resolver";
import {
  checkInvariantViolation,
  getLastSignalAt,
  getCommitmentStartAt,
  type ClosureAction,
} from "./closure-invariants";
import { getLastResponsibilityState, recordResponsibilityChange } from "./history";
import { enqueueDecision, enqueue } from "@/lib/queue";
import { runWithWriteContextAsync } from "@/lib/safety/unsafe-write-guard";
/** Before marking lead dormant: no pending actions, no future bookings, no unresolved escalations. */
async function closureFinalityGuard(leadId: string, workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: pendingAction } = await db
    .from("action_commands")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("lead_id", leadId)
    .is("processed_at", null)
    .limit(1)
    .maybeSingle();
  if (pendingAction) return false;

  const commitmentStartAt = await getCommitmentStartAt(workspaceId, leadId);
  if (commitmentStartAt && new Date(commitmentStartAt) > new Date()) return false;

  const { data: escalations } = await db.from("escalation_logs").select("id").eq("lead_id", leadId).limit(20);
  const escIds = (escalations ?? []).map((r: { id: string }) => r.id);
  if (escIds.length > 0) {
    const { data: acks } = await db.from("handoff_acknowledgements").select("escalation_id").in("escalation_id", escIds);
    const ackedSet = new Set((acks ?? []).map((r: { escalation_id: string }) => r.escalation_id));
    const unacked = escIds.filter((id) => !ackedSet.has(id));
    if (unacked.length > 0) return false;
  }
  return true;
}

/**
 * Get active lead ids (closure_dormant_at is null). Limit for cron batch.
 */
export async function getActiveLeadIds(limit: number): Promise<Array<{ lead_id: string; workspace_id: string }>> {
  const db = getDb();
  const { data } = await db
    .from("leads")
    .select("id, workspace_id")
    .is("closure_dormant_at", null)
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: { id: string; workspace_id: string }) => ({ lead_id: r.id, workspace_id: r.workspace_id }));
}

/**
 * Process one lead: resolve state, record history if changed, record proof if → COMPLETED, check invariant, execute action.
 */
export async function enforceClosureForLead(leadId: string, workspaceId: string): Promise<{ action?: ClosureAction; error?: string }> {
  try {
    const state = await resolveResponsibility(leadId);
    const previousState = await getLastResponsibilityState(leadId);
    const stateChanged = previousState !== state;

    if (stateChanged) {
      await recordResponsibilityChange({
        leadId,
        previousState,
        newState: state,
        reason: "resolve_replay",
      });
      if (state === "COMPLETED" && previousState != null && previousState !== "COMPLETED") {
        const { recordProof } = await import("@/lib/proof/record");
        await recordProof({
          workspace_id: workspaceId,
          lead_id: leadId,
          proof_type: "ResponsibilityResolved",
          operator_id: "CLOSURE_OPERATOR",
          state_before: previousState,
          state_after: "COMPLETED",
        });
      }
    }

    const lastSignalAt = await getLastSignalAt(workspaceId, leadId);
    const commitmentStartAt = state === "COMMITMENT_SCHEDULED" ? await getCommitmentStartAt(workspaceId, leadId) : null;
    const action = checkInvariantViolation({
      leadId,
      workspaceId,
      state,
      lastSignalAt,
      commitmentStartAt,
    });

    if (action) {
      await runWithWriteContextAsync("closure", async () => {
        switch (action.type) {
          case "enqueue_decision":
            await enqueueDecision(action.leadId, action.workspaceId);
            break;
          case "escalate": {
            const { logEscalation, getAssignedUserId } = await import("@/lib/escalation");
            const assigned = await getAssignedUserId(action.workspaceId, action.leadId);
            const holdUntil = new Date();
            holdUntil.setHours(holdUntil.getHours() + 24);
            await logEscalation(
              action.workspaceId,
              action.leadId,
              "policy_sensitive",
              "closure_awaiting_business_timeout",
              `Responsibility awaiting business decision > 24h. ${action.reason}`,
              assigned ?? undefined,
              holdUntil
            );
            break;
          }
          case "enqueue_reconciliation":
            await enqueue({ type: "closure_reconciliation", workspaceId: action.workspaceId });
            break;
          case "mark_dormant": {
            const safe = await closureFinalityGuard(action.leadId, action.workspaceId);
            if (!safe) {
              await enqueueDecision(action.leadId, action.workspaceId);
              break;
            }
            const db = getDb();
            await db.from("leads").update({ closure_dormant_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", action.leadId);
            break;
          }
        }
      });
      return { action };
    }
    return {};
  } catch (err) {
    if (err instanceof ClosureInvariantViolation) {
      return { error: err.message };
    }
    throw err;
  }
}
