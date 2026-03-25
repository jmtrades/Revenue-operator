/**
 * Deterministic responsibility attribution: record where authority existed at outcome.
 * Append-only. No inference.
 */

import { getDb } from "@/lib/db/queries";
import type { RecordResponsibilityMomentInput } from "./types";

export async function recordResponsibilityMoment(input: RecordResponsibilityMomentInput): Promise<void> {
  const db = getDb();
  await db.from("responsibility_moments").insert({
    workspace_id: input.workspaceId,
    subject_type: input.subjectType,
    subject_id: input.subjectId,
    authority_holder: input.authorityHolder,
    determined_from: input.determinedFrom,
    recorded_at: new Date().toISOString(),
  });
}

const TRACE_LINE: Record<string, string> = {
  environment: "The outcome followed the operating process.",
  business: "The decision remained with the provider.",
  shared: "Responsibility was shared between parties.",
};

const MAX_LINE_LEN = 90;
const DAYS = 7;

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

/**
 * Short factual lines from responsibility moments in last N days. No ids, timestamps, or counts.
 */
export async function getResponsibilityTraceLinesInLastDays(
  workspaceId: string,
  days: number = DAYS
): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data: rows } = await db
    .from("responsibility_moments")
    .select("authority_holder")
    .eq("workspace_id", workspaceId)
    .gte("recorded_at", since.toISOString());
  const holders = new Set((rows ?? []).map((r: { authority_holder: string }) => r.authority_holder));
  const lines: string[] = [];
  for (const h of ["environment", "business", "shared"]) {
    if (holders.has(h)) {
      const line = TRACE_LINE[h];
      if (line) lines.push(trim(line));
    }
  }
  return [...new Set(lines)];
}

/**
 * True when ≥3 environment responsibility moments in last 7 days
 * AND no later business authority moment for any of those subjects (same workspace, subject_type, subject_id).
 * Deterministic SQL.
 */
export async function authorityExternalized(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const { count: envCount } = await db
    .from("responsibility_moments")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("authority_holder", "environment")
    .gte("recorded_at", since.toISOString());
  if ((envCount ?? 0) < 3) return false;

  const { data: envRows } = await db
    .from("responsibility_moments")
    .select("subject_type, subject_id, recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("authority_holder", "environment")
    .gte("recorded_at", since.toISOString());
  for (const e of envRows ?? []) {
    const row = e as { subject_type: string; subject_id: string; recorded_at: string };
    const { count: laterBusiness } = await db
      .from("responsibility_moments")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("subject_type", row.subject_type)
      .eq("subject_id", row.subject_id)
      .eq("authority_holder", "business")
      .gt("recorded_at", row.recorded_at);
    if ((laterBusiness ?? 0) > 0) return false;
  }
  return true;
}
