/**
 * Relief trigger engine: store factual past-tense messages and deliver only when timing allows.
 * One message per qualifying moment. Silence when no relief.
 */

import { log } from "@/lib/logger";
import { getDb } from "@/lib/db/queries";
import { getConfidencePhase } from "@/lib/confidence-engine";
import { getInstallationState } from "@/lib/installation";

const RELIEF_THROTTLE_MS = 2 * 60 * 60; // 2 hours
const ESCALATION_CONTRAST_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

async function getOwnerEmail(workspaceId: string): Promise<string | null> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return null;
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
  return (user as { email?: string } | null)?.email ?? null;
}

async function sendReliefEmail(to: string, text: string): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: text, text }),
  });
  return res.ok;
}

/**
 * Store a relief event and attempt delivery. Delivery only if:
 * - Last relief message > 2 hours ago
 * - confidence_phase != observing
 * - installation_phase != observing
 * Exactly one message per qualifying moment. Never batch.
 */
export async function recordReliefEvent(workspaceId: string, text: string): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  await db.from("recent_relief_events").insert({
    workspace_id: workspaceId,
    text,
    created_at: now,
  });

  await deliverReliefEvent(workspaceId, text).catch((e) => {
    log("error", "deliverReliefEvent failed", { error: e instanceof Error ? e.message : String(e) });
  });
}

/**
 * Send relief message only if throttle and phase checks pass. Uses existing email path (owner).
 */
export async function deliverReliefEvent(workspaceId: string, text: string): Promise<boolean> {
  const db = getDb();
  const [stateRow, confidencePhase, instState] = await Promise.all([
    db.from("relief_delivery_state").select("last_relief_sent_at").eq("workspace_id", workspaceId).maybeSingle(),
    getConfidencePhase(workspaceId),
    getInstallationState(workspaceId),
  ]);

  if (confidencePhase === "observing") return false;
  const phase = instState?.phase ?? "observing";
  if (phase === "observing") return false;

  const lastSent = (stateRow?.data as { last_relief_sent_at?: string | null } | null | undefined)?.last_relief_sent_at ?? null;
  if (lastSent) {
    const elapsed = Date.now() - new Date(lastSent).getTime();
    if (elapsed < RELIEF_THROTTLE_MS) return false;
  }

  const owner = await getOwnerEmail(workspaceId);
  if (!owner) return false;

  const sent = await sendReliefEmail(owner, text);
  if (sent) {
    const now = new Date().toISOString();
    const { data: existing } = await db.from("relief_delivery_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
    if (existing) {
      await db.from("relief_delivery_state").update({ last_relief_sent_at: now }).eq("workspace_id", workspaceId);
    } else {
      await db.from("relief_delivery_state").insert({ workspace_id: workspaceId, last_relief_sent_at: now });
    }
  }
  return sent;
}

export async function getLastReliefSentAt(workspaceId: string): Promise<Date | null> {
  const db = getDb();
  const { data } = await db
    .from("relief_delivery_state")
    .select("last_relief_sent_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const at = (data as { last_relief_sent_at?: string | null } | null)?.last_relief_sent_at;
  return at ? new Date(at) : null;
}

export async function getReliefCountLast24h(workspaceId: string): Promise<number> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("recent_relief_events")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("created_at", since);
  return count ?? 0;
}

/**
 * If a relief message was sent in the last 30 minutes, send escalation contrast and return true.
 * Caller should skip full handoff when true.
 */
export async function maybeSendEscalationContrast(workspaceId: string): Promise<boolean> {
  const lastSent = await getLastReliefSentAt(workspaceId);
  if (!lastSent) return false;
  const elapsed = Date.now() - lastSent.getTime();
  if (elapsed > ESCALATION_CONTRAST_WINDOW_MS) return false;

  const owner = await getOwnerEmail(workspaceId);
  if (!owner) return false;

  const line = "A situation now requires human decision.";
  const sent = await sendReliefEmail(owner, line);
  if (sent) {
    const db = getDb();
    const now = new Date().toISOString();
    const { data: existing } = await db.from("relief_delivery_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
    if (existing) {
      await db.from("relief_delivery_state").update({ last_escalation_contrast_sent_at: now }).eq("workspace_id", workspaceId);
    } else {
      await db.from("relief_delivery_state").insert({ workspace_id: workspaceId, last_escalation_contrast_sent_at: now });
    }
  }
  return sent;
}

/**
 * If >=3 relief events in 24h and a new authority item appears, send removal sensitivity once per day.
 */
export async function maybeSendRemovalSensitivity(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const count = await getReliefCountLast24h(workspaceId);
  if (count < 3) return false;

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("relief_delivery_state")
    .select("removal_sensitivity_sent_at")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  const sentDate = (data as { removal_sensitivity_sent_at?: string | null } | null)?.removal_sensitivity_sent_at;
  if (sentDate === today) return false;

  const owner = await getOwnerEmail(workspaceId);
  if (!owner) return false;

  const line = "Manual supervision would now be required.";
  const sent = await sendReliefEmail(owner, line);
  if (sent) {
    const { data: existing } = await db.from("relief_delivery_state").select("workspace_id").eq("workspace_id", workspaceId).maybeSingle();
    if (existing) {
      await db.from("relief_delivery_state").update({ removal_sensitivity_sent_at: today }).eq("workspace_id", workspaceId);
    } else {
      await db.from("relief_delivery_state").insert({ workspace_id: workspaceId, removal_sensitivity_sent_at: today });
    }
  }
  return sent;
}
