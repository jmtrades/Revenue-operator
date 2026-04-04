/**
 * Daily assurance delivery: one line from today proof capsule to owner. No batching, no report wording.
 * Skips are logged with assurance_skipped (workspace_id, reason); no PII.
 */

import { getDb } from "@/lib/db/queries";
import { getConfidencePhase } from "@/lib/confidence-engine";
import { getInstallationState } from "@/lib/installation";
import { log } from "@/lib/runtime/log";

function todayUtcDate(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

async function getOwnerEmail(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return null;
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
  return (user as { email?: string } | null)?.email ?? null;
}

/** Pick first line from proof_capsules for today UTC (deterministic). */
export async function getTodaysProofCapsuleLine(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const today = todayUtcDate();
  const { data: row } = await db
    .from("proof_capsules")
    .select("lines")
    .eq("workspace_id", workspaceId)
    .eq("period_end", today)
    .maybeSingle();
  const lines = (row as { lines?: string[] } | null)?.lines;
  if (!Array.isArray(lines) || lines.length === 0) return null;
  return lines[0];
}

/** Audience-aware assurance line. Same fact; wording can vary by audience. */
export type AssuranceAudience = "organization" | "professional" | "personal" | "public";

export async function getAssuranceLineForAudience(
  workspaceId: string,
  audience: AssuranceAudience
): Promise<string | null> {
  const line = await getTodaysProofCapsuleLine(workspaceId);
  if (!line) return null;
  if (audience === "organization") return `Operation: ${line}`;
  if (audience === "personal") return `For your awareness: ${line}`;
  return line;
}

async function recordAssuranceAttemptMarker(workspaceId: string): Promise<void> {
  try {
    const db = getDb();
    await db.from("assurance_attempt_marker").insert({ workspace_id: workspaceId });
  } catch { /* non-critical marker */ }
}

/** Send single line as subject and body (Resend). */
export async function sendAssuranceLine(workspaceId: string, line: string): Promise<boolean> {
  const to = await getOwnerEmail(workspaceId);
  if (!to) {
    const db = getDb();
    const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
    const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
    log("assurance_skipped", { workspace_id: workspaceId, reason: ownerId ? "missing_owner_email" : "missing_owner_id" });
    recordAssuranceAttemptMarker(workspaceId);
    return false;
  }
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
  if (!RESEND_API_KEY) {
    log("assurance_skipped", { workspace_id: workspaceId, reason: "missing_resend" });
    recordAssuranceAttemptMarker(workspaceId);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: line, text: line }),
      signal: AbortSignal.timeout(10_000),
  });
  return res.ok;
}

/** Send daily assurance only if proof exists for today, not already sent today, and phase not observing. */
export async function deliverDailyAssuranceIfDue(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const today = todayUtcDate();
  const [line, confidencePhase, instState, stateRow] = await Promise.all([
    getTodaysProofCapsuleLine(workspaceId),
    getConfidencePhase(workspaceId),
    getInstallationState(workspaceId),
    db.from("assurance_delivery_state").select("last_sent_utc_date").eq("workspace_id", workspaceId).maybeSingle(),
  ]);
  if (!line) {
    log("assurance_skipped", { workspace_id: workspaceId, reason: "no_line" });
    return false;
  }
  if (confidencePhase === "observing") {
    log("assurance_skipped", { workspace_id: workspaceId, reason: "phase_observing" });
    return false;
  }
  const phase = instState?.phase ?? "observing";
  if (phase === "observing") {
    log("assurance_skipped", { workspace_id: workspaceId, reason: "phase_observing" });
    return false;
  }
  const lastSent = (stateRow?.data as { last_sent_utc_date?: string } | null)?.last_sent_utc_date ?? null;
  if (lastSent === today) {
    log("assurance_skipped", { workspace_id: workspaceId, reason: "already_sent_today" });
    return false;
  }

  const sent = await sendAssuranceLine(workspaceId, line);
  if (sent) {
    const now = new Date().toISOString();
    await db.from("assurance_delivery_state").upsert(
      { workspace_id: workspaceId, last_sent_utc_date: today, sent_at: now },
      { onConflict: "workspace_id" }
    );
  }
  return sent;
}
