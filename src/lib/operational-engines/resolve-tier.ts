/**
 * Resolve workspace operational tier and allowed engines.
 * Tier is stored on workspace; default 1. Used to gate engine behaviour without bypassing the chain.
 */

import { getDb } from "@/lib/db/queries";
import { getEnginesForTier, isEngineAllowedForTier } from "./registry";
import type { OperationalEngineId, OperationalTier } from "./types";

const DEFAULT_TIER: OperationalTier = 1;

export interface WorkspaceOperationalScope {
  tier: OperationalTier;
  engine_ids: OperationalEngineId[];
}

/**
 * Load workspace operational_tier (default 1), return tier and list of allowed engine ids.
 * Does not mutate; read-only. If column is missing or query fails, returns tier 1 (safe default).
 */
export async function resolveWorkspaceOperationalScope(
  workspaceId: string
): Promise<WorkspaceOperationalScope> {
  try {
    const db = getDb();
    const { data: row, error } = await db
      .from("workspaces")
      .select("operational_tier")
      .eq("id", workspaceId)
      .maybeSingle();

    if (error) return defaultScope();
    const raw = (row as { operational_tier?: number | null } | null)?.operational_tier;
    const tier: OperationalTier =
      typeof raw === "number" && raw >= 1 && raw <= 5 ? (raw as OperationalTier) : DEFAULT_TIER;

    return {
      tier,
      engine_ids: getEnginesForTier(tier),
    };
  } catch {
    return defaultScope();
  }
}

function defaultScope(): WorkspaceOperationalScope {
  return {
    tier: DEFAULT_TIER,
    engine_ids: getEnginesForTier(DEFAULT_TIER),
  };
}

/** Check if an engine is allowed for a workspace (by tier). */
export async function isEngineAllowedForWorkspace(
  workspaceId: string,
  engineId: OperationalEngineId
): Promise<boolean> {
  const { tier } = await resolveWorkspaceOperationalScope(workspaceId);
  return isEngineAllowedForTier(engineId, tier);
}
