/**
 * Operational presence: continuity emails and suppression.
 * No metrics, no engagement. Only certainty of continuity.
 * Doctrine: never explain features, teach usage, show value, request feedback.
 */

import { getDb } from "@/lib/db/queries";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Revenue Operator <noreply@recall-touch.com>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.BASE_URL || "https://app.recall-touch.com";

export type PresenceType = "daily" | "weekly" | "monthly" | "escalation" | "decision_required";

const PRIORITY_ORDER: PresenceType[] = ["escalation", "decision_required", "daily", "weekly", "monthly"];

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, text }),
  });
  return res.ok;
}

export async function logPresenceSent(workspaceId: string, type: PresenceType): Promise<void> {
  const db = getDb();
  await db.from("operational_presence_log").insert({
    workspace_id: workspaceId,
    type,
    sent_at: new Date().toISOString(),
  });
}

/** Higher priority (lower index) suppresses lower. If any higher-priority email sent in last 6h, suppress. */
export async function shouldSuppressPresence(workspaceId: string, forType: PresenceType): Promise<boolean> {
  const db = getDb();
  const idx = PRIORITY_ORDER.indexOf(forType);
  if (idx <= 0) return false;
  const higherTypes = PRIORITY_ORDER.slice(0, idx);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const { count } = await db
    .from("operational_presence_log")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .in("type", higherTypes)
    .gte("sent_at", sixHoursAgo);
  return (count ?? 0) > 0;
}

/** Owner assurance: sent when escalation is delivery_failed | system_integrity_violation | signal_unprocessable | progress_stalled. No internal details. */
export async function sendOwnerAssuranceEmail(workspaceId: string): Promise<boolean> {
  const db = getDb();
  const { data: ws } = await db.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle();
  const ownerId = (ws as { owner_id?: string } | null)?.owner_id;
  if (!ownerId) return false;
  const { data: user } = await db.from("users").select("email").eq("id", ownerId).maybeSingle();
  const email = (user as { email?: string } | null)?.email;
  if (!email) return false;

  const subject = "Outside authority.";
  const body = "Normal conditions are not present.\n\nOutside scope.\n\nOpen: " + APP_URL + "/dashboard" + "\n\nReliance is suspended until entry." + "\n\nEntry restores reliance.";
  const sent = await sendEmail(email, subject, body);
  if (sent) await logPresenceSent(workspaceId, "escalation");
  return sent;
}

/** Daily presence. Only when no handoff in 24h, not paused, no interruption. */
export async function sendDailyPresenceEmail(workspaceId: string, ownerEmail: string): Promise<boolean> {
  const subject = "Conditions are normal.";
  const body = "Conditions are normal.\n\nOpen: " + APP_URL + "/dashboard";
  const sent = await sendEmail(ownerEmail, subject, body);
  if (sent) await logPresenceSent(workspaceId, "daily");
  return sent;
}

/** Weekly continuity. */
export async function sendWeeklyContinuityEmail(workspaceId: string, ownerEmail: string): Promise<boolean> {
  const subject = "Conditions are normal.";
  const body = "Conditions are normal.\n\nOpen: " + APP_URL + "/dashboard";
  const sent = await sendEmail(ownerEmail, subject, body);
  if (sent) await logPresenceSent(workspaceId, "weekly");
  return sent;
}

/** Monthly anchor. */
export async function sendMonthlyAnchorEmail(workspaceId: string, ownerEmail: string): Promise<boolean> {
  const subject = "Conditions are normal.";
  const body = "Conditions are normal.\n\nOpen: " + APP_URL + "/dashboard";
  const sent = await sendEmail(ownerEmail, subject, body);
  if (sent) await logPresenceSent(workspaceId, "monthly");
  return sent;
}

/** Check if we already sent this presence type for this workspace in the given time range (for dedupe). */
export async function alreadySentInRange(
  workspaceId: string,
  type: PresenceType,
  fromIso: string,
  toIso: string
): Promise<boolean> {
  const db = getDb();
  const { data } = await db
    .from("operational_presence_log")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("type", type)
    .gte("sent_at", fromIso)
    .lte("sent_at", toIso)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
