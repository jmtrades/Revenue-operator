/**
 * Settlement readiness: three booleans for payment justification.
 * Billing activates only when environment_handling_operations AND manual_supervision_reduced.
 */

import { getDb } from "@/lib/db/queries";
import { hasEconomicActivation } from "@/lib/economic-participation";
import { getConfidencePhase } from "@/lib/confidence-engine";

const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;

export interface SettlementReadiness {
  environment_handling_operations: boolean;
  manual_supervision_reduced: boolean;
  coordination_outside_environment_possible: boolean;
}

export async function getSettlementReadiness(workspaceId: string): Promise<SettlementReadiness> {
  const db = getDb();
  const since = new Date(Date.now() - DAYS_7_MS).toISOString();

  const [economicActivation, confidencePhase, economicEventsIn7d, hasSharedTransaction] = await Promise.all([
    hasEconomicActivation(workspaceId),
    getConfidencePhase(workspaceId),
    db
      .from("economic_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle(),
    db
      .from("shared_transactions")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(1)
      .maybeSingle(),
  ]);

  const environmentHandling = economicActivation || !!economicEventsIn7d?.data;
  const phase = confidencePhase;
  const supervisionReduced = phase !== "observing" || !!economicEventsIn7d?.data;
  const coordinationPossible = !!hasSharedTransaction?.data;

  return {
    environment_handling_operations: environmentHandling,
    manual_supervision_reduced: supervisionReduced,
    coordination_outside_environment_possible: coordinationPossible,
  };
}

/** True when settlement may activate (show authorization). */
export async function isSettlementReady(workspaceId: string): Promise<boolean> {
  const r = await getSettlementReadiness(workspaceId);
  return r.environment_handling_operations && r.manual_supervision_reduced;
}
