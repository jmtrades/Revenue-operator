/**
 * Guarantee Layer — enforce corrective actions for breaches.
 * Triggers flow through existing pipeline (Decision → Action). Escalate after max attempts.
 */

import { getDb } from "@/lib/db/queries";
import { enqueue } from "@/lib/queue";
import { setLeadPlan } from "@/lib/plans/lead-plan";
import { getEscalationHoldingMessage } from "@/lib/safe-responses";
import { logEscalation, getAssignedUserId, type EscalationTrigger } from "@/lib/escalation";
import type { GuaranteeBreach } from "./invariants";
import { MAX_CORRECTIVE_ATTEMPTS } from "./invariants";
import { countCorrectiveAttempts } from "./evaluate";

const ESCALATION_REASON: EscalationTrigger = "guarantee_stagnation";

/**
 * Escalate lead to human: log escalation, send holding message, set hold.
 * Used by breach enforcement and commitment stability (persistent level 3).
 */
export async function escalateLead(
  workspaceId: string,
  leadId: string,
  invariant: string
): Promise<void> {
  const assignedUserId = await getAssignedUserId(workspaceId, leadId);
  const holdUntil = new Date();
  holdUntil.setHours(holdUntil.getHours() + 24);
  const message = getEscalationHoldingMessage();
  const escalationId = await logEscalation(
    workspaceId,
    leadId,
    ESCALATION_REASON,
    "guarantee_enforcement",
    `System could not progress after multiple attempts (${invariant}).`,
    assignedUserId ?? undefined,
    holdUntil
  );
  const db = getDb();
  const { data: conv } = await db.from("conversations").select("id, channel").eq("lead_id", leadId).limit(1).single();
  if (conv) {
    const convId = (conv as { id: string }).id;
    const channel = (conv as { channel?: string }).channel ?? "web";
    const { enqueueSendMessage } = await import("@/lib/action-queue/send-message");
    await enqueueSendMessage(
      workspaceId,
      leadId,
      convId,
      channel,
      message,
      `guarantee:escalation:${leadId}:${Date.now()}`,
      undefined
    );
  }
  if (escalationId) {
    await db
      .from("escalation_logs")
      .update({ hold_until: holdUntil.toISOString(), holding_message_sent: true })
      .eq("id", escalationId);
  }
}

/**
 * Enforce one breach: trigger corrective decision or escalate.
 */
export async function enforceBreach(breach: GuaranteeBreach): Promise<"corrective" | "escalated"> {
  const { leadId, workspaceId, invariant } = breach;
  const attempts = await countCorrectiveAttempts(leadId);
  if (attempts >= MAX_CORRECTIVE_ATTEMPTS) {
    await escalateLead(workspaceId, leadId, invariant);
    return "escalated";
  }

  const db = getDb();
  const { data: lead } = await db.from("leads").select("state").eq("id", leadId).single();
  const state = (lead as { state?: string } | null)?.state;

  switch (breach.invariant) {
    case "response_continuity":
      await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      return "corrective";
    case "decision_momentum":
      await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      return "corrective";
    case "attendance_stability":
      await setLeadPlan(workspaceId, leadId, {
        next_action_type: "reminder",
        next_action_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      });
      await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      return "corrective";
    case "recovery_persistence": {
      const { getCapacityPressure } = await import("@/lib/guarantee/capacity-stability");
      const cap = await getCapacityPressure(workspaceId);
      if ((cap?.pressure_level ?? 0) >= 3) return "corrective";
      await enqueue({ type: "reactivation", leadId });
      return "corrective";
    }
    case "lifecycle_return":
      await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      return "corrective";
    default:
      if (state && state !== "LOST") {
        await enqueue({ type: "decision", leadId, workspaceId, eventId: leadId });
      }
      return "corrective";
  }
}
