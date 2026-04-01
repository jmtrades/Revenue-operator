/**
 * Orientation layer: end-of-outcome records. Past tense, one sentence, final outcome only.
 * No system reference, no explanation, no numbers.
 * Sanitizer: one sentence, past tense, max 80 chars.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";

const MAX_ORIENTATION_CHARS = 80;

/** One sentence: take segment up to first . ! ? then trim; then cap at 80 chars. */
export function sanitizeOrientationText(raw: string): string {
  let s = (raw ?? "").trim();
  const match = s.match(/^[^.!?]+[.!?]?/);
  if (match) s = match[0].trim();
  if (s.length > MAX_ORIENTATION_CHARS) s = s.slice(0, MAX_ORIENTATION_CHARS).trim();
  return s || "Outcome recorded.";
}

export async function recordOrientationStatement(workspaceId: string, text: string): Promise<void> {
  const db = getDb();
  const sanitized = sanitizeOrientationText(text);
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("text", sanitized)
    .gte("created_at", oneHourAgo)
    .limit(1)
    .maybeSingle();
  
  if (existing) return;
  
  await db.from("orientation_records").insert({
    workspace_id: workspaceId,
    text: sanitized,
    created_at: new Date().toISOString(),
  });
  const { recordOperationalDay } = await import("@/lib/operational-timeline-memory");
  recordOperationalDay(workspaceId).catch((e: unknown) => {
    log("error", "recordOperationalDay failed", { error: e instanceof Error ? e.message : String(e) });
  });
}

export async function getRecentOrientationStatements(
  workspaceId: string,
  limit: number = 20
): Promise<string[]> {
  const db = getDb();
  const { data } = await db
    .from("orientation_records")
    .select("text")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r: { text: string }) => r.text);
}

export async function updateLastOrientationViewedAt(workspaceId: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: existing } = await db
    .from("workspace_orientation_state")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (existing) {
    await db
      .from("workspace_orientation_state")
      .update({ last_orientation_viewed_at: now })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("workspace_orientation_state").insert({
      workspace_id: workspaceId,
      last_orientation_viewed_at: now,
    });
  }
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

/** If no orientation viewed in last 4 hours, mark orientation_checked_at. Call when dashboard opens. */
export async function checkAndMarkOrientationChecked(workspaceId: string): Promise<void> {
  const db = getDb();
  const { data } = await db
    .from("workspace_orientation_state")
    .select("last_orientation_viewed_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const lastViewed = (data as { last_orientation_viewed_at?: string | null } | null)?.last_orientation_viewed_at ?? null;
  const now = new Date();
  if (lastViewed) {
    const elapsed = now.getTime() - new Date(lastViewed).getTime();
    if (elapsed < FOUR_HOURS_MS) return;
  }
  const nowIso = now.toISOString();
  const { data: row } = await db
    .from("workspace_orientation_state")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (row) {
    await db
      .from("workspace_orientation_state")
      .update({ orientation_checked_at: nowIso })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("workspace_orientation_state").insert({
      workspace_id: workspaceId,
      orientation_checked_at: nowIso,
    });
  }
}

/** True if workspace has at least one orientation record on the given calendar day (UTC). */
export async function hasOrientationRecordOnDate(
  workspaceId: string,
  date: Date
): Promise<boolean> {
  const db = getDb();
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const { data } = await db
    .from("orientation_records")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gte("created_at", dayStart.toISOString())
    .lt("created_at", dayEnd.toISOString())
    .limit(1)
    .maybeSingle();
  return !!data;
}


/** True if workspace has orientation records on each of the last 3 calendar days (including today). */
export async function hasOrientationRecordsThreeConsecutiveDays(workspaceId: string): Promise<boolean> {
  const today = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const has = await hasOrientationRecordOnDate(workspaceId, d);
    if (!has) return false;
  }
  return true;
}

/** Count orientation records in last 6 hours. */
export async function countOrientationRecordsInLastHours(
  workspaceId: string,
  hours: number
): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("orientation_records")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  return count ?? 0;
}

export async function getOrientationState(workspaceId: string): Promise<{
  orientation_absence_sent_at: string | null;
  orientation_pending_sent_at: string | null;
} | null> {
  const db = getDb();
  const { data } = await db
    .from("workspace_orientation_state")
    .select("orientation_absence_sent_at, orientation_pending_sent_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) return null;
  const d = data as { orientation_absence_sent_at?: string | null; orientation_pending_sent_at?: string | null };
  return {
    orientation_absence_sent_at: d.orientation_absence_sent_at ?? null,
    orientation_pending_sent_at: d.orientation_pending_sent_at ?? null,
  };
}

export async function setOrientationAbsenceSentToday(workspaceId: string): Promise<void> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await db
    .from("workspace_orientation_state")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (row) {
    await db
      .from("workspace_orientation_state")
      .update({ orientation_absence_sent_at: today })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("workspace_orientation_state").insert({
      workspace_id: workspaceId,
      orientation_absence_sent_at: today,
    });
  }
}

export async function setOrientationPendingSentToday(workspaceId: string): Promise<void> {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const { data: row } = await db
    .from("workspace_orientation_state")
    .select("workspace_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (row) {
    await db
      .from("workspace_orientation_state")
      .update({ orientation_pending_sent_at: today })
      .eq("workspace_id", workspaceId);
  } else {
    await db.from("workspace_orientation_state").insert({
      workspace_id: workspaceId,
      orientation_pending_sent_at: today,
    });
  }
}

const RECENTLY_VIEWED_MS = 24 * 60 * 60 * 1000;
const RECENT_HANDOFF_MS = 24 * 60 * 60 * 1000;

/** Booleans only: orientation_recently_viewed, absence_signal_eligible, pending_confirmation_recent. */
export async function getOperationalOrientationStateBooleans(workspaceId: string): Promise<{
  orientation_recently_viewed: boolean;
  absence_signal_eligible: boolean;
  pending_confirmation_recent: boolean;
}> {
  const db = getDb();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const _since24h = new Date(now.getTime() - RECENTLY_VIEWED_MS).toISOString();
  const since24hHandoff = new Date(now.getTime() - RECENT_HANDOFF_MS).toISOString();

  const [viewedRow, stateRow, count6h, escRows] = await Promise.all([
    db.from("workspace_orientation_state").select("last_orientation_viewed_at").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("workspace_orientation_state").select("orientation_absence_sent_at").eq("workspace_id", workspaceId).maybeSingle(),
    countOrientationRecordsInLastHours(workspaceId, 6),
    db
      .from("escalation_logs")
      .select("id")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since24hHandoff)
      .limit(50),
  ]);

  const lastViewed = (viewedRow.data as { last_orientation_viewed_at?: string | null } | null)?.last_orientation_viewed_at ?? null;
  const orientation_recently_viewed = !!lastViewed && new Date(lastViewed).getTime() >= now.getTime() - RECENTLY_VIEWED_MS;

  const absenceSentToday = (stateRow.data as { orientation_absence_sent_at?: string | null } | null)?.orientation_absence_sent_at === today;
  const absence_signal_eligible = count6h === 0 && !absenceSentToday;

  const allEscIds = (escRows.data ?? []).map((r: { id: string }) => r.id);
  let pending_confirmation_recent = false;
  if (allEscIds.length > 0) {
    const { data: acks } = await db.from("handoff_acknowledgements").select("escalation_id").in("escalation_id", allEscIds);
    const ackedSet = new Set((acks ?? []).map((a: { escalation_id: string }) => a.escalation_id));
    pending_confirmation_recent = allEscIds.some((id) => !ackedSet.has(id));
  }

  return {
    orientation_recently_viewed,
    absence_signal_eligible,
    pending_confirmation_recent,
  };
}
