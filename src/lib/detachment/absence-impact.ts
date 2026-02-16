/**
 * Absence impact: short factual lines when non-participation or silence windows exist.
 * No timestamps, counts, or ids.
 */

import { getDb } from "@/lib/db/queries";

const MAX_LINE_LEN = 90;
const MAX_LINES = 6;
const DAYS = 7;

const LINES = [
  "The process continued without provider involvement.",
  "The outcome did not require provider action.",
  "Operations remained stable during inactivity.",
  "Resolution occurred without manual decision.",
];

function trim(s: string): string {
  return s.length > MAX_LINE_LEN ? s.slice(0, MAX_LINE_LEN).trim() : s;
}

export async function getAbsenceImpactLines(workspaceId: string): Promise<string[]> {
  const db = getDb();
  const since = new Date();
  since.setDate(since.getDate() - DAYS);

  const [npRows, swRows] = await Promise.all([
    db
      .from("non_participation_events")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("recorded_at", since.toISOString())
      .limit(1),
    db
      .from("operational_silence_windows")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("ended_at", since.toISOString())
      .limit(1),
  ]);

  const hasNonParticipation = (npRows?.data?.length ?? 0) > 0;
  const hasSilence = (swRows?.data?.length ?? 0) > 0;
  if (!hasNonParticipation && !hasSilence) return [];

  const lines: string[] = [];
  if (hasNonParticipation) {
    lines.push(trim(LINES[0]));
    lines.push(trim(LINES[1]));
  }
  if (hasSilence) {
    lines.push(trim(LINES[2]));
  }
  lines.push(trim(LINES[3]));
  return [...new Set(lines)].slice(0, MAX_LINES);
}
