/**
 * Normalization detectors: record only when current action had no verification AND prior verification occurred.
 * Deterministic, evidence-based. Uses existing tables only.
 */

import { getDb } from "@/lib/db/queries";
import { recordNormalization } from "./record";

const LOOKBACK_HOURS = 24;
const PRIOR_WINDOW_DAYS = 90;

function sinceIso(hoursAgo: number): string {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

function priorSinceIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - PRIOR_WINDOW_DAYS);
  return d.toISOString();
}

/** A) Shared transaction acknowledged without dispute; earlier similar had dispute or reminder. */
async function detectVerificationAbsent(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = sinceIso(LOOKBACK_HOURS);
  const priorSince = priorSinceIso();

  const { data: prior } = await db
    .from("shared_transactions")
    .select("id")
    .eq("workspace_id", workspaceId)
    .or("state.eq.disputed,reminder_sent_count.gt.0")
    .gte("created_at", priorSince)
    .limit(1);
  if ((prior?.length ?? 0) === 0) return;

  const { data: recent } = await db
    .from("shared_transactions")
    .select("id, external_ref")
    .eq("workspace_id", workspaceId)
    .eq("state", "acknowledged")
    .eq("reminder_sent_count", 0)
    .is("dispute_reason", null)
    .gte("acknowledged_at", since)
    .limit(50);

  for (const r of recent ?? []) {
    const row = r as { id: string; external_ref?: string };
    await recordNormalization(
      workspaceId,
      "verification_absent",
      row.external_ref ?? row.id,
      true
    );
  }
}

/** B) Commitment resolved within 24h of previous resolved for same subject with no clarification (reminder) between; earlier commitments had reminder. */
async function detectDirectProgression(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = sinceIso(LOOKBACK_HOURS);
  const priorSince = priorSinceIso();

  const { data: commitmentsInWorkspace } = await db
    .from("commitments")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(500);
  const cids = (commitmentsInWorkspace ?? []).map((x: { id: string }) => x.id);
  if (cids.length === 0) return;
  const { data: priorReminder } = await db
    .from("commitment_events")
    .select("id")
    .eq("event_type", "reminder_sent")
    .in("commitment_id", cids)
    .gte("created_at", priorSince)
    .limit(1);
  if ((priorReminder?.length ?? 0) === 0) return;

  const { data: resolved } = await db
    .from("commitments")
    .select("id, subject_type, subject_id, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("state", "resolved")
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(100);

  for (const curr of resolved ?? []) {
    const c = curr as { id: string; subject_type: string; subject_id: string; updated_at: string };
    const prevCut = new Date(new Date(c.updated_at).getTime() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
    const { data: prevResolved } = await db
      .from("commitments")
      .select("id, updated_at")
      .eq("workspace_id", workspaceId)
      .eq("subject_type", c.subject_type)
      .eq("subject_id", c.subject_id)
      .eq("state", "resolved")
      .lt("updated_at", c.updated_at)
      .gte("updated_at", prevCut)
      .order("updated_at", { ascending: false })
      .limit(1);
    if ((prevResolved?.length ?? 0) === 0) continue;
    const prev = prevResolved![0] as { id: string; updated_at: string };
    const { data: eventsBetween } = await db
      .from("commitment_events")
      .select("id")
      .in("commitment_id", [c.id, prev.id])
      .eq("event_type", "reminder_sent")
      .gte("created_at", prev.updated_at)
      .lte("created_at", c.updated_at)
      .limit(1);
    if ((eventsBetween?.length ?? 0) > 0) continue;
    await recordNormalization(workspaceId, "direct_progression", `commitment:${c.id}`, true);
  }
}

/** C) Payment resolved (paid) without reminder; earlier payments required reminder (recovery_attempts > 0). */
async function detectSilentAcceptance(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = sinceIso(LOOKBACK_HOURS);
  const priorSince = priorSinceIso();

  const { data: prior } = await db
    .from("payment_obligations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .gt("recovery_attempts", 0)
    .gte("created_at", priorSince)
    .limit(1);
  if ((prior?.length ?? 0) === 0) return;

  const { data: recent } = await db
    .from("payment_obligations")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("state", "resolved")
    .eq("terminal_outcome", "paid")
    .eq("recovery_attempts", 0)
    .gte("updated_at", since)
    .limit(50);

  for (const r of recent ?? []) {
    const row = r as { id: string };
    await recordNormalization(workspaceId, "silent_acceptance", `payment:${row.id}`, true);
  }
}

/** D) Continuation stopped (delay ended) without opportunity_revival; earlier delays had revival. */
async function detectUninterruptedFollowthrough(workspaceId: string): Promise<void> {
  const db = getDb();
  const since = sinceIso(LOOKBACK_HOURS);
  const priorSince = priorSinceIso();

  const { data: priorRevival } = await db
    .from("causal_chains")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("intervention_type", "opportunity_revival")
    .gte("determined_at", priorSince)
    .limit(1);
  if ((priorRevival?.length ?? 0) === 0) return;

  const { data: recent } = await db
    .from("continuation_exposures")
    .select("id, subject_type, subject_id, recorded_at")
    .eq("workspace_id", workspaceId)
    .eq("intervention_stopped_it", true)
    .gte("recorded_at", since)
    .limit(50);

  for (const r of recent ?? []) {
    const row = r as { id: string; subject_type: string; subject_id: string; recorded_at: string };
    const dayStart = row.recorded_at.slice(0, 10) + "T00:00:00.000Z";
    const dayEnd = new Date(new Date(dayStart).getTime() + 24 * 60 * 60 * 1000).toISOString();
    const { data: revivalSameSubject } = await db
      .from("causal_chains")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("intervention_type", "opportunity_revival")
      .eq("subject_type", row.subject_type)
      .eq("subject_id", row.subject_id)
      .gte("determined_at", dayStart)
      .lt("determined_at", dayEnd)
      .limit(1);
    if ((revivalSameSubject?.length ?? 0) > 0) continue;
    await recordNormalization(workspaceId, "uninterrupted_followthrough", `continuation:${row.id}`, true);
  }
}

export async function runNormalizationDetectors(workspaceId: string): Promise<void> {
  await detectVerificationAbsent(workspaceId);
  await detectDirectProgression(workspaceId);
  await detectSilentAcceptance(workspaceId);
  await detectUninterruptedFollowthrough(workspaceId);
}
