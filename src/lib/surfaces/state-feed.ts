/**
 * State feed: last N doctrine statements from proof capsules, disable impact, retention intercept, incidents.
 * Chronological, text only. No timestamps or counts in output.
 */

import { getDb } from "@/lib/db/queries";
import { getDisableImpactStatements } from "@/lib/operational-perception/disable-impact";
import { getRetentionInterceptPayload } from "@/lib/operational-perception/retention-intercept";
import { getRecentIncidentStatements } from "@/lib/incidents";

const MAX_CHARS = 90;
const FEED_LIMIT = 20;

function trim(s: string): string {
  return s.length > MAX_CHARS ? s.slice(0, MAX_CHARS).trim() : s.trim();
}

export async function getOrgStateFeedStatements(workspaceId: string): Promise<string[]> {
  const db = getDb();

  const [proofResult, disableImpact, retention, incidents] = await Promise.all([
    db
      .from("proof_capsules")
      .select("lines")
      .eq("workspace_id", workspaceId)
      .order("period_end", { ascending: false })
      .limit(3),
    getDisableImpactStatements(workspaceId),
    getRetentionInterceptPayload(workspaceId),
    getRecentIncidentStatements(workspaceId, 10),
  ]);

  const lines: { text: string; sortKey: string }[] = [];
  const proofRows = proofResult?.data ?? [];

  for (const row of proofRows) {
    const arr = (row as { lines?: string[] }).lines;
    if (Array.isArray(arr)) for (const t of arr) if (t) lines.push({ text: trim(t), sortKey: `proof:${t.slice(0, 20)}` });
  }
  for (const t of disableImpact) lines.push({ text: trim(t), sortKey: `disable:${t.slice(0, 20)}` });
  for (const t of retention.recent_operation) lines.push({ text: trim(t), sortKey: `retention_recent:${t.slice(0, 20)}` });
  for (const t of retention.current_dependency) lines.push({ text: trim(t), sortKey: `retention_dep:${t.slice(0, 20)}` });
  for (const t of retention.if_disabled) lines.push({ text: trim(t), sortKey: `retention_disabled:${t.slice(0, 20)}` });
  for (const inc of incidents) lines.push({ text: trim(inc.message), sortKey: `incident:${inc.created_at}:${inc.message.slice(0, 10)}` });

  const seen = new Set<string>();
  const out: string[] = [];
  for (const { text } of lines) {
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
    if (out.length >= FEED_LIMIT) break;
  }
  return out;
}
