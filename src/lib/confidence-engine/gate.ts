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
import { log } from "@/lib/logger";

const logGateSideEffect = (ctx: string) => (e: unknown) => {
  log("warn", `gate.${ctx}`, { error: e instanceof Error ? e.message : String(e) });
};

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
    await appendNarrative(workspaceId, "action_withheld", "Outbound action withheld.").catch(logGateSideEffect("append_narrative_withheld"));
    const { recordShadowExecution } = await import("@/lib/shadow-execution");
    await recordShadowExecution(workspaceId, actionType, "observing").catch(logGateSideEffect("record_shadow_observing"));
    return { proceed: false, markProcessed: true };
  }

  if (phase === "simulating") {
    await recordSimulatedAction(workspaceId, actionType, simulatedText, relatedExternalRef).catch(logGateSideEffect("record_simulated_action"));
    const { recordShadowExecution } = await import("@/lib/shadow-execution");
    await recordShadowExecution(workspaceId, actionType, "simulating").catch(logGateSideEffect("record_shadow_simulating"));
    return { proceed: false, markProcessed: true };
  }

  if (phase === "assisted") {
    const trusted = await isActionTypeTrusted(workspaceId, actionType);
    if (!trusted) {
      await createIncidentStatement(workspaceId, "approval_required", actionType).catch(logGateSideEffect("create_incident_approval_required"));
      await appendNarrative(workspaceId, "approval_required", "An action requires approval before execution.").catch(logGateSideEffect("append_narrative_approval_required"));
      return { proceed: false, markProcessed: true };
    }
  }

  if (phase === "autonomous") {
    return { proceed: true, markProcessed: false };
  }

  return { proceed: true, markProcessed: false };
}
