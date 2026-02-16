/**
 * Solo surface: client situation summary. Reuses retention + disable impact.
 * Returns current_dependency, if_disabled, latest_outcome (text only).
 */

import { getDb } from "@/lib/db/queries";
import { getRetentionInterceptPayload } from "@/lib/operational-perception/retention-intercept";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";

const MAX_CHARS = 90;
const CAP = 5;

function trim(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS).trim() : s.trim();
}

export interface SoloClientStatePayload {
  current_dependency: string[];
  if_disabled: string[];
  latest_outcome: string[];
}

export async function getSoloClientState(
  workspaceId: string,
  reference?: string | null
): Promise<SoloClientStatePayload> {
  const [retention, disableImpact] = await Promise.all([
    getRetentionInterceptPayload(workspaceId),
    getDisableImpactStatements(workspaceId),
  ]);

  const current_dependency = retention.current_dependency.slice(0, CAP).map(trim).filter(Boolean);
  const if_disabled = disableImpact.slice(0, CAP).map(trim).filter(Boolean);

  const db = getDb();
  const { data: proofRow } = await db
    .from("proof_capsules")
    .select("lines")
    .eq("workspace_id", workspaceId)
    .order("period_end", { ascending: false })
    .limit(1)
    .maybeSingle();
  const proofLines = (proofRow as { lines?: string[] } | null)?.lines ?? [];
  const { getRecentIncidentStatements } = await import("@/lib/incidents");
  const incidents = await getRecentIncidentStatements(workspaceId, 3);
  const latest_outcome: string[] = [];
  for (const line of proofLines.slice(0, 2)) {
    if (line) latest_outcome.push(trim(line));
  }
  for (const inc of incidents) {
    if (inc.message && latest_outcome.length < CAP) latest_outcome.push(trim(inc.message));
  }

  return {
    current_dependency,
    if_disabled,
    latest_outcome: latest_outcome.slice(0, CAP),
  };
}
