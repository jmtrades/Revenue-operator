/**
 * Workspace outcome pattern guard. Scale protection. Bounded query only. No COUNT(*). No aggregation.
 */

import { getDb } from "@/lib/db/queries";

const WINDOW_LIMIT = 50;

export interface WorkspacePatternGuardResult {
  requiresPause?: boolean;
  requiresEscalation?: boolean;
  advisory?: string;
}

/**
 * Evaluate workspace pattern from last 50 universal_outcomes. No aggregation; array length checks only.
 */
export async function evaluateWorkspacePatternGuard(
  workspaceId: string
): Promise<WorkspacePatternGuardResult> {
  const db = getDb();
  const { data: rows } = await db
    .from("universal_outcomes")
    .select("outcome_type")
    .eq("workspace_id", workspaceId)
    .order("recorded_at", { ascending: false })
    .limit(WINDOW_LIMIT);
  const list = (rows ?? []) as Array<{ outcome_type: string }>;
  const n = list.length;
  if (n === 0) return {};

  const hostile = list.filter((r) => r.outcome_type === "hostile").length;
  const legalRisk = list.filter((r) => r.outcome_type === "legal_risk").length;
  const optedOut = list.filter((r) => r.outcome_type === "opted_out").length;
  const unknown = list.filter((r) => r.outcome_type === "unknown").length;

  const hostility_ratio = hostile / n;
  const opted_out_ratio = optedOut / n;
  const repeated_unknown_ratio = unknown / n;

  if (hostility_ratio > 0.4) {
    return { requiresPause: true, advisory: "Hostility spike in recent outcomes." };
  }
  if (legalRisk >= 3) {
    return { requiresEscalation: true, advisory: "Legal risk count in window >= 3." };
  }
  if (opted_out_ratio > 0.3) {
    return { requiresPause: true, advisory: "Opt-out spike; cool off." };
  }
  if (repeated_unknown_ratio > 0.3) {
    return { advisory: "Recommend governance review." };
  }
  return {};
}
