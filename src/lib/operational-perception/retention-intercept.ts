/**
 * Retention intercept: factual operational consequences for cancel/deactivate.
 * recent_operation, current_dependency, if_disabled. Reuses existing doctrine-safe wording only.
 * No persuasion, marketing, or analytics. All lines ≤90 chars. Caps: 4, 4, 4.
 */

import { getDb } from "@/lib/db/queries";
import { getDisableImpactStatements } from "./disable-impact";
import { getOperabilityLines } from "@/lib/operability-anchor";
import { getReversionImpactStatements } from "./reversion-impact";
import { getIfRemovedStatements } from "./if-removed";
import { getContinuationLinesStoppedInLastDays } from "@/lib/continuation-engine";

const MAX_CHARS = 90;
const CAP_RECENT = 4;
const CAP_DEPENDENCY = 4;
const CAP_IF_DISABLED = 4;

function trim(s: string): string {
  const t = s.trim();
  return t.length > MAX_CHARS ? t.slice(0, MAX_CHARS).trim() : t;
}

export interface RetentionInterceptPayload {
  recent_operation: string[];
  current_dependency: string[];
  if_disabled: string[];
}

export async function getRetentionInterceptPayload(workspaceId: string): Promise<RetentionInterceptPayload> {
  const [proofLines, operability, reversion, ifRemoved, continuation, disableImpact] = await Promise.all([
    getLatestProofCapsuleLines(workspaceId, CAP_RECENT),
    getOperabilityLines(workspaceId),
    getReversionImpactStatements(workspaceId),
    getIfRemovedStatements(workspaceId),
    getContinuationLinesStoppedInLastDays(workspaceId, 7),
    getDisableImpactStatements(workspaceId),
  ]);

  const dependencyPool: string[] = [];
  const seen = new Set<string>();
  for (const line of [...operability, ...reversion, ...ifRemoved, ...continuation]) {
    const t = trim(line);
    if (t && !seen.has(t)) {
      seen.add(t);
      dependencyPool.push(t);
    }
  }
  const current_dependency = dependencyPool.slice(0, CAP_DEPENDENCY);

  const if_disabled = disableImpact.slice(0, CAP_IF_DISABLED).map(trim).filter(Boolean);

  return {
    recent_operation: proofLines,
    current_dependency,
    if_disabled,
  };
}

async function getLatestProofCapsuleLines(workspaceId: string, cap: number): Promise<string[]> {
  const db = getDb();
  const { data: row } = await db
    .from("proof_capsules")
    .select("lines")
    .eq("workspace_id", workspaceId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lines = (row as { lines?: string[] } | null)?.lines;
  if (!Array.isArray(lines)) return [];
  return lines.slice(0, cap).map(trim).filter(Boolean);
}
