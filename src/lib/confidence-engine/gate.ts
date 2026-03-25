/**
 * Confidence gate: wrap outbound execution. Called from action worker only.
 * Uses domain phase if present for action type, else workspace phase.
 * observing → block; simulating → simulate; assisted → require approval or execute; autonomous → execute.
 */

import {
  appendNarrative,
  recordSimulatedAction,
  isActionTypeTrusted,
} from "./index";
import { getEffectivePhaseForAction } from "./domain";
import { createIncidentStatement } from "@/lib/incidents";

/**
 * Check confidence gate for an outbound send. Performs side effects (narrative, simulated_action, incident).
 * Returns whether to proceed with actual send.
 */
export async function checkConfidenceGate(
  workspaceId: string,
  actionType: string,
  simulatedText: string,
  relatedExternalRef?: string | null
): Promise<{ proceed: boolean; markProcessed: boolean }> {
  const phase = await getEffectivePhaseForAction(workspaceId, actionType);

  if (phase === "observing") {
    await appendNarrative(workspaceId, "action_withheld", "Outbound action withheld.").catch(() => {});
    const { recordShadowExecution } = await import("@/lib/shadow-execution");
    await recordShadowExecution(workspaceId, actionType, "observing").catch(() => {});
    return { proceed: false, markProcessed: true };
  }

  if (phase === "simulating") {
    await recordSimulatedAction(workspaceId, actionType, simulatedText, relatedExternalRef).catch(() => {});
    const { recordShadowExecution } = await import("@/lib/shadow-execution");
    await recordShadowExecution(workspaceId, actionType, "simulating").catch(() => {});
    return { proceed: false, markProcessed: true };
  }

  if (phase === "assisted") {
    const trusted = await isActionTypeTrusted(workspaceId, actionType);
    if (!trusted) {
      await createIncidentStatement(workspaceId, "approval_required", actionType).catch(() => {});
      await appendNarrative(workspaceId, "approval_required", "An action requires approval before execution.").catch(() => {});
      return { proceed: false, markProcessed: true };
    }
  }

  if (phase === "autonomous") {
    return { proceed: true, markProcessed: false };
  }

  return { proceed: true, markProcessed: false };
}
