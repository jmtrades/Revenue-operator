/**
 * Operational dependence level: derived from existing ladder signals.
 * Maps to pricing tiers externally. No billing logic here.
 */

import { getDb } from "@/lib/db/queries";
import { hasThirdPartyReliance } from "@/lib/third-party-reliance/presence-state";
import { crossPartyRelianceEstablished } from "@/lib/operational-responsibilities";
import { getInstitutionalState } from "@/lib/institutional-state";

export type OperationalDependenceLevel = "none" | "internal" | "counterparty" | "multi-party" | "institutional";

/**
 * Compute operational dependence level from existing signals.
 */
export async function computeOperationalDependenceLevel(workspaceId: string): Promise<OperationalDependenceLevel> {
  const db = getDb();
  
  const { data: acknowledgedThread } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged")
    .limit(1)
    .maybeSingle();
  
  if (!acknowledgedThread) return "none";
  
  const hasCounterparty = await crossPartyRelianceEstablished(workspaceId);
  if (!hasCounterparty) return "internal";
  
  const hasMultiParty = await hasThirdPartyReliance(workspaceId);
  if (!hasMultiParty) return "counterparty";
  
  const institutionalState = await getInstitutionalState(workspaceId);
  if (institutionalState === "institutional" || institutionalState === "embedded" || institutionalState === "reliant") {
    return "institutional";
  }
  
  return "multi-party";
}
